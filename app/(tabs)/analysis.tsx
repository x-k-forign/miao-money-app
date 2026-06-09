import React, { useEffect, useState } from "react";
import { Modal, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInUp, useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { Circle, G, Path, Svg } from "react-native-svg";
import { ArrowDownRight, ArrowUpRight, Check, ChevronDown, PieChart, TrendingUp } from "lucide-react-native";
import { AnimatedPressable } from "@/components/common/AnimatedPressable";
import { AppScreen } from "@/components/common/AppScreen";
import { CategoryIcon } from "@/components/common/CategoryIcon";
import { MiaoCard } from "@/components/common/MiaoCard";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { defaultTheme } from "@/constants/themes";
import { getCategoryShare, getMonthlySummary, getTrend } from "@/services/analysisService";
import type { CategoryShareDTO, MonthlySummaryDTO, RecordType, TrendPointDTO } from "@/types/models";
import { centsToYuan } from "@/utils/money";

interface CategoryTotal {
  amountCents: number;
  color: string;
  icon: string;
  id: string;
  name: string;
}

interface LegendRow {
  amountCents: number;
  color: string;
  icon?: string;
  id: string;
  name: string;
}

interface TrendPoint {
  label: string;
  value: number;
}

type TrendRange = "7d" | "6m";

function money(cents: number) {
  return `¥${centsToYuan(cents)}`;
}

function mapCategoryShare(items: CategoryShareDTO[]): CategoryTotal[] {
  return items.map((item) => ({
    amountCents: item.amountCents,
    color: item.categoryColor,
    icon: item.categoryIcon,
    id: item.categoryId,
    name: item.categoryName
  }));
}

function mapTrend(points: TrendPointDTO[]): TrendPoint[] {
  return points.map((point) => ({
    label: point.label,
    value: Math.round(point.amountCents / 100)
  }));
}

export default function AnalysisScreen() {
  const [range, setRange] = useState<TrendRange>("7d");
  const [selectedExpenseCategory, setSelectedExpenseCategory] = useState("全部");
  const [selectedIncomeCategory, setSelectedIncomeCategory] = useState("全部");
  const [summary, setSummary] = useState<MonthlySummaryDTO>({
    incomeCents: 0,
    expenseCents: 0,
    balanceCents: 0
  });
  const [expenseCategories, setExpenseCategories] = useState<CategoryTotal[]>([]);
  const [incomeCategories, setIncomeCategories] = useState<CategoryTotal[]>([]);
  const [expenseTrend, setExpenseTrend] = useState<TrendPoint[]>([]);
  const [incomeTrend, setIncomeTrend] = useState<TrendPoint[]>([]);

  useEffect(() => {
    let mounted = true;

    async function loadAnalysis() {
      const [nextSummary, nextExpenseCategories, nextIncomeCategories, nextExpenseTrend, nextIncomeTrend] =
        await Promise.all([
          getMonthlySummary(),
          getCategoryShare("expense"),
          getCategoryShare("income"),
          getTrend("expense", range),
          getTrend("income", range)
        ]);

      if (mounted) {
        setSummary(nextSummary);
        setExpenseCategories(mapCategoryShare(nextExpenseCategories));
        setIncomeCategories(mapCategoryShare(nextIncomeCategories));
        setExpenseTrend(mapTrend(nextExpenseTrend));
        setIncomeTrend(mapTrend(nextIncomeTrend));
      }
    }

    loadAnalysis().catch((error) => {
      console.warn("Load analysis failed", error);
    });

    return () => {
      mounted = false;
    };
  }, [range]);

  const expenseRatio = summary.incomeCents > 0 ? Math.round((summary.expenseCents / summary.incomeCents) * 1000) / 10 : 0;

  return (
    <AppScreen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <PageHeader title="收支分析" subtitle="收入和支出的分类占比、趋势变化一眼看清" />

        <Animated.View entering={FadeInUp.delay(40).duration(260)} style={styles.summaryGrid}>
          <StatCard label="本月收入" value={money(summary.incomeCents)} accent={defaultTheme.mint} icon={ArrowUpRight} />
          <StatCard label="本月支出" value={money(summary.expenseCents)} accent={defaultTheme.pink} icon={ArrowDownRight} />
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(80).duration(260)}>
          <MiaoCard style={styles.balanceCard}>
            <View>
              <Text style={styles.cardLabel}>本月结余</Text>
              <Text style={styles.balance}>{money(summary.balanceCents)}</Text>
            </View>
            <View style={styles.ratioPill}>
              <TrendingUp color={defaultTheme.primary} size={16} />
              <Text style={styles.ratioText}>支出占收入 {expenseRatio}%</Text>
            </View>
          </MiaoCard>
        </Animated.View>

        <CategoryShareCard
          delay={120}
          selectedCategory={selectedExpenseCategory}
          setSelectedCategory={setSelectedExpenseCategory}
          title="支出分类占比"
          total={summary.expenseCents}
          categories={expenseCategories}
        />

        <TrendCard
          delay={160}
          range={range}
          setRange={setRange}
          title="支出趋势"
          recordType="expense"
          color={defaultTheme.primary}
          trend={expenseTrend}
        />

        <CategoryShareCard
          delay={200}
          selectedCategory={selectedIncomeCategory}
          setSelectedCategory={setSelectedIncomeCategory}
          title="收入分类占比"
          total={summary.incomeCents}
          categories={incomeCategories}
          accent={defaultTheme.mint}
        />

        <TrendCard
          delay={240}
          range={range}
          setRange={setRange}
          title="收入趋势"
          recordType="income"
          color={defaultTheme.mint}
          trend={incomeTrend}
        />
      </ScrollView>
    </AppScreen>
  );
}

interface CategoryShareCardProps {
  accent?: string;
  categories: CategoryTotal[];
  delay: number;
  selectedCategory: string;
  setSelectedCategory: (value: string) => void;
  title: string;
  total: number;
}

function CategoryShareCard({
  accent = defaultTheme.primary,
  categories,
  delay,
  selectedCategory,
  setSelectedCategory,
  title,
  total
}: CategoryShareCardProps) {
  const [selectorOpen, setSelectorOpen] = useState(false);
  const topCategories = categories.slice(0, 4);
  const overflowCategories = categories.slice(4);
  const otherAmount = Math.max(0, total - topCategories.reduce((sum, item) => sum + item.amountCents, 0));
  const legendRows: LegendRow[] = [
    ...topCategories,
    {
      amountCents: otherAmount,
      color: defaultTheme.yellow,
      id: "other-group",
      name: "其他"
    }
  ];
  const selectedAmount =
    selectedCategory === "全部"
      ? total
      : categories.find((item) => item.name === selectedCategory)?.amountCents ?? (selectedCategory === "其他" ? otherAmount : 0);
  const selectedPercent = total > 0 ? Math.round((selectedAmount / total) * 100) : 0;
  const moreLabel = overflowCategories.some((item) => item.name === selectedCategory) ? selectedCategory : "更多";

  return (
    <Animated.View entering={FadeInUp.delay(delay).duration(260)}>
      <MiaoCard style={styles.chartCard}>
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.cardTitle}>{title}</Text>
            <Text style={styles.cardHint}>当前：{selectedCategory}</Text>
          </View>
          <View style={[styles.chartIcon, { backgroundColor: `${accent}30` }]}>
            <PieChart color={accent} size={20} />
          </View>
        </View>

        <View style={styles.donutRow}>
          <SegmentedDonut
            onSelect={setSelectedCategory}
            rows={legendRows}
            selectedAmount={selectedAmount}
            selectedLabel={selectedCategory}
            selectedPercent={selectedPercent}
            total={total}
          />
          <View style={styles.legend}>
            {legendRows.map((item) => (
              <AnimatedPressable
                key={item.id}
                onPress={() => setSelectedCategory(item.name)}
                style={[styles.legendItem, selectedCategory === item.name && styles.legendActive]}
              >
                <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                <Text style={styles.legendText}>{item.name}</Text>
                <Text style={styles.legendAmount}>{total > 0 ? Math.round((item.amountCents / total) * 100) : 0}%</Text>
              </AnimatedPressable>
            ))}
          </View>
        </View>

        <View style={styles.categoryGrid}>
          {topCategories.map((item) => (
            <AnimatedPressable
              key={item.id}
              onPress={() => setSelectedCategory(item.name)}
              style={[styles.filterChip, selectedCategory === item.name && styles.filterChipActive]}
            >
              <CategoryIcon color={item.color} name={item.icon} size={15} />
              <Text style={[styles.filterText, selectedCategory === item.name && styles.filterTextActive]}>{item.name}</Text>
            </AnimatedPressable>
          ))}
          <AnimatedPressable
            onPress={() => setSelectorOpen(true)}
            style={[styles.filterChip, overflowCategories.some((item) => item.name === selectedCategory) && styles.filterChipActive]}
          >
            <Text style={[styles.filterText, overflowCategories.some((item) => item.name === selectedCategory) && styles.filterTextActive]}>
              {moreLabel}
            </Text>
            <ChevronDown color={overflowCategories.some((item) => item.name === selectedCategory) ? "#FFFFFF" : defaultTheme.primary} size={15} />
          </AnimatedPressable>
        </View>

        <CategorySelector
          categories={overflowCategories}
          onClose={() => setSelectorOpen(false)}
          onSelect={setSelectedCategory}
          open={selectorOpen}
          selectedCategory={selectedCategory}
        />
      </MiaoCard>
    </Animated.View>
  );
}

interface SegmentedDonutProps {
  onSelect: (value: string) => void;
  rows: LegendRow[];
  selectedAmount: number;
  selectedLabel: string;
  selectedPercent: number;
  total: number;
}

function SegmentedDonut({ onSelect, rows, selectedAmount, selectedLabel, selectedPercent, total }: SegmentedDonutProps) {
  const [activeSegment, setActiveSegment] = useState<LegendRow | null>(null);
  const scale = useSharedValue(1);
  const size = 132;
  const strokeWidth = 18;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }]
  }));

  function showSegment(row: LegendRow) {
    setActiveSegment(row);
    scale.value = withSpring(1.07, { damping: 14, stiffness: 260 });
  }

  function hideSegment() {
    setActiveSegment(null);
    scale.value = withSpring(1, { damping: 14, stiffness: 220 });
  }

  function renderWebSvg() {
    let webOffset = 0;

    return React.createElement(
      "svg",
      {
        height: size,
        style: { overflow: "visible" },
        viewBox: `0 0 ${size} ${size}`,
        width: size
      },
      React.createElement("circle", {
        cx: size / 2,
        cy: size / 2,
        fill: "transparent",
        r: radius,
        stroke: defaultTheme.primarySoft,
        strokeWidth
      }),
      React.createElement(
        "g",
        { transform: `rotate(-90 ${size / 2} ${size / 2})` },
        rows.map((row) => {
          if (total <= 0 || row.amountCents <= 0) {
            return null;
          }

          const arc = (row.amountCents / total) * circumference;
          const active = selectedLabel === row.name || activeSegment?.name === row.name;
          const element = React.createElement("circle", {
            cx: size / 2,
            cy: size / 2,
            fill: "transparent",
            key: row.id,
            onClick: () => onSelect(row.name),
            onMouseDown: () => showSegment(row),
            onMouseEnter: () => showSegment(row),
            onMouseLeave: hideSegment,
            onMouseUp: hideSegment,
            opacity: active ? 1 : 0.78,
            r: radius,
            stroke: row.color,
            strokeDasharray: `${Math.max(0, arc - 2)} ${circumference}`,
            strokeDashoffset: -webOffset,
            strokeLinecap: "round",
            strokeWidth: active ? strokeWidth + 4 : strokeWidth,
            style: { cursor: "pointer", transition: "opacity 140ms ease, stroke-width 140ms ease" }
          });
          webOffset += arc;
          return element;
        })
      )
    );
  }

  function renderNativeSvg() {
    let nativeOffset = 0;

    return (
      <Svg height={size} width={size} viewBox={`0 0 ${size} ${size}`}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          fill="transparent"
          r={radius}
          stroke={defaultTheme.primarySoft}
          strokeWidth={strokeWidth}
        />
        <G transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          {rows.map((row) => {
            if (total <= 0 || row.amountCents <= 0) {
              return null;
            }

            const arc = (row.amountCents / total) * circumference;
            const active = selectedLabel === row.name || activeSegment?.name === row.name;
            const segment = (
              <Circle
                key={row.id}
                cx={size / 2}
                cy={size / 2}
                fill="transparent"
                onPress={() => onSelect(row.name)}
                onPressIn={() => showSegment(row)}
                onPressOut={hideSegment}
                opacity={active ? 1 : 0.78}
                r={radius}
                stroke={row.color}
                strokeDasharray={[Math.max(0, arc - 2), circumference]}
                strokeDashoffset={-nativeOffset}
                strokeLinecap="round"
                strokeWidth={active ? strokeWidth + 4 : strokeWidth}
              />
            );
            nativeOffset += arc;
            return segment;
          })}
        </G>
      </Svg>
    );
  }

  return (
    <Animated.View style={[styles.segmentedDonut, animatedStyle]}>
      {Platform.OS === "web" ? renderWebSvg() : renderNativeSvg()}
      <View style={styles.donutCenter}>
        <Text style={styles.donutName} numberOfLines={1} adjustsFontSizeToFit>
          {selectedLabel}
        </Text>
        <Text style={styles.donutValue}>{selectedPercent}%</Text>
        <Text style={styles.donutLabel}>{money(selectedAmount)}</Text>
      </View>
      {activeSegment ? (
        <Animated.View entering={FadeInUp.duration(140)} style={styles.segmentInfoPanel}>
          <View style={styles.segmentInfoHeader}>
            <View style={[styles.legendDot, { backgroundColor: activeSegment.color }]} />
            <Text style={styles.segmentInfoName}>{activeSegment.name}</Text>
          </View>
          <Text style={styles.segmentInfoPercent}>
            {total > 0 ? Math.round((activeSegment.amountCents / total) * 100) : 0}%
          </Text>
          <Text style={styles.segmentInfoAmount}>{money(activeSegment.amountCents)}</Text>
        </Animated.View>
      ) : null}
    </Animated.View>
  );
}

interface CategorySelectorProps {
  categories: CategoryTotal[];
  onClose: () => void;
  onSelect: (value: string) => void;
  open: boolean;
  selectedCategory: string;
}

function CategorySelector({ categories, onClose, onSelect, open, selectedCategory }: CategorySelectorProps) {
  function select(value: string) {
    onSelect(value);
    onClose();
  }

  return (
    <Modal animationType="slide" transparent visible={open} onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <AnimatedPressable onPress={onClose} style={styles.backdropPressArea} />
        <View style={styles.sheet}>
          <Text style={styles.sheetTitle}>选择分类</Text>
          <Text style={styles.sheetHint}>完整分类来自添加收支页面</Text>
          <ScrollView showsVerticalScrollIndicator={false} style={styles.selectorList}>
            <SelectorRow active={selectedCategory === "全部"} label="全部" onPress={() => select("全部")} />
            {categories.map((item) => (
              <SelectorRow
                key={item.id}
                active={selectedCategory === item.name}
                color={item.color}
                icon={item.icon}
                label={item.name}
                onPress={() => select(item.name)}
              />
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

interface SelectorRowProps {
  active: boolean;
  color?: string;
  icon?: string;
  label: string;
  onPress: () => void;
}

function SelectorRow({ active, color = defaultTheme.primary, icon, label, onPress }: SelectorRowProps) {
  return (
    <AnimatedPressable onPress={onPress} style={[styles.selectorRow, active && styles.selectorRowActive]}>
      <View style={styles.selectorLeft}>
        {icon ? <CategoryIcon color={color} name={icon} size={15} /> : <View style={[styles.legendDot, { backgroundColor: color }]} />}
        <Text style={[styles.selectorText, active && styles.selectorTextActive]}>{label}</Text>
      </View>
      {active ? <Check color="#FFFFFF" size={17} strokeWidth={3} /> : null}
    </AnimatedPressable>
  );
}

interface TrendCardProps {
  color: string;
  delay: number;
  range: TrendRange;
  recordType: RecordType;
  setRange: (value: TrendRange) => void;
  title: string;
  trend: TrendPoint[];
}

function TrendCard({ color, delay, range, recordType, setRange, title, trend }: TrendCardProps) {
  const maxTrend = Math.max(1, ...trend.map((item) => item.value));
  const subtitle = range === "7d" ? "最近 7 天，按日期汇总" : "最近 6 个月，按月份汇总";
  void recordType;

  return (
    <Animated.View entering={FadeInUp.delay(delay).duration(260)}>
      <MiaoCard style={styles.chartCard}>
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.cardTitle}>{title}</Text>
            <Text style={styles.cardHint}>{subtitle}</Text>
          </View>
          <View style={styles.rangeSwitch}>
            {[
              { key: "7d", label: "7天" },
              { key: "6m", label: "6月" }
            ].map((item) => (
              <AnimatedPressable
                key={item.key}
                onPress={() => setRange(item.key as TrendRange)}
                style={[styles.rangeButton, range === item.key && styles.rangeActive]}
              >
                <Text style={[styles.rangeText, range === item.key && styles.rangeTextActive]}>{item.label}</Text>
              </AnimatedPressable>
            ))}
          </View>
        </View>
        <TrendLineChart color={color} maxValue={maxTrend} points={trend} />
      </MiaoCard>
    </Animated.View>
  );
}

interface TrendLineChartProps {
  color: string;
  maxValue: number;
  points: TrendPoint[];
}

function TrendLineChart({ color, maxValue, points }: TrendLineChartProps) {
  const [activePoint, setActivePoint] = useState<TrendPoint | null>(null);
  const width = 286;
  const height = 178;
  const left = 42;
  const top = 48;
  const plotWidth = width - left - 12;
  const plotHeight = 94;
  const steps = [maxValue, Math.round(maxValue / 2), 0];
  const coordinates = points.map((point, index) => {
    const x = left + (points.length === 1 ? plotWidth / 2 : (index / (points.length - 1)) * plotWidth);
    const y = top + plotHeight - (point.value / maxValue) * plotHeight;
    return { ...point, x, y };
  });
  const hasPoints = coordinates.length > 0;
  const linePath = hasPoints ? coordinates.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ") : "";
  const areaPath = hasPoints ? `${linePath} L ${left + plotWidth} ${top + plotHeight} L ${left} ${top + plotHeight} Z` : "";
  const active = activePoint ? coordinates.find((item) => item.label === activePoint.label) : null;
  const tooltipWidth = 82;
  const nativeTooltipStyle = active
    ? {
        left: Math.min(width - tooltipWidth - 4, Math.max(4, active.x - tooltipWidth / 2)),
        top: Math.max(4, active.y - 48),
        width: tooltipWidth
      }
    : null;

  function showPoint(point: TrendPoint) {
    setActivePoint(point);
  }

  if (Platform.OS === "web") {
    return (
      <View style={styles.lineChartWrap}>
        {React.createElement(
          "svg",
          {
            height,
            style: { overflow: "visible" },
            viewBox: `0 0 ${width} ${height}`,
            width: "100%"
          },
          steps.map((step, index) =>
            React.createElement(
              React.Fragment,
              { key: `rule-${step}-${index}` },
              React.createElement("line", {
                x1: left,
                x2: left + plotWidth,
                y1: top + (plotHeight / 2) * index,
                y2: top + (plotHeight / 2) * index,
                stroke: "#E5F5FF",
                strokeDasharray: index === 2 ? "0" : "5 6",
                strokeWidth: 1
              }),
              React.createElement(
                "text",
                {
                  fill: defaultTheme.muted,
                  fontSize: 10,
                  fontWeight: 800,
                  textAnchor: "end",
                  x: left - 8,
                  y: top + (plotHeight / 2) * index + 4
                },
                `¥${step}`
              )
            )
          ),
          hasPoints ? React.createElement("path", { d: areaPath, fill: `${color}18` }) : null,
          hasPoints
            ? React.createElement("path", {
                d: linePath,
                fill: "none",
                stroke: color,
                strokeLinecap: "round",
                strokeLinejoin: "round",
                strokeWidth: 4
              })
            : null,
          coordinates.map((point) =>
            React.createElement("circle", {
              cx: point.x,
              cy: point.y,
              fill: "transparent",
              key: `hit-${point.label}`,
              onClick: () => showPoint(point),
              onMouseEnter: () => showPoint(point),
              r: 16,
              style: { cursor: "pointer" }
            })
          ),
          coordinates.map((point) =>
            React.createElement("circle", {
              cx: point.x,
              cy: point.y,
              fill: "#FFFFFF",
              key: `point-${point.label}`,
              onClick: () => showPoint(point),
              onMouseEnter: () => showPoint(point),
              r: activePoint?.label === point.label ? 7 : 5,
              stroke: color,
              strokeWidth: activePoint?.label === point.label ? 4 : 3,
              style: { cursor: "pointer", pointerEvents: "none", transition: "r 140ms ease, stroke-width 140ms ease" }
            })
          ),
          coordinates.map((point) =>
            React.createElement(
              "text",
              {
                fill: defaultTheme.muted,
                fontSize: 10,
                fontWeight: 800,
                key: `label-${point.label}`,
                textAnchor: "middle",
                x: point.x,
                y: height - 12
              },
              point.label
            )
          ),
          active
            ? React.createElement(
                "g",
                { key: "tooltip", pointerEvents: "none" },
                React.createElement("line", {
                  x1: active.x,
                  x2: active.x,
                  y1: top,
                  y2: top + plotHeight,
                  stroke: `${color}66`,
                  strokeDasharray: "4 5",
                  strokeWidth: 1.5
                }),
                React.createElement("rect", {
                  fill: "#FFFFFF",
                  height: 40,
                  rx: 8,
                  stroke: "#DFF3FF",
                  strokeWidth: 1,
                  width: 82,
                  x: Math.min(width - 88, Math.max(4, active.x - 41)),
                  y: Math.max(4, active.y - 46)
                }),
                React.createElement(
                  "text",
                  {
                    fill: defaultTheme.text,
                    fontSize: 11,
                    fontWeight: 900,
                    textAnchor: "middle",
                    x: Math.min(width - 47, Math.max(45, active.x)),
                    y: Math.max(20, active.y - 27)
                  },
                  active.label
                ),
                React.createElement(
                  "text",
                  {
                    fill: color,
                    fontSize: 12,
                    fontWeight: 900,
                    textAnchor: "middle",
                    x: Math.min(width - 47, Math.max(45, active.x)),
                    y: Math.max(36, active.y - 11)
                  },
                  `¥${active.value}`
                )
              )
            : null,
          !hasPoints
            ? React.createElement(
                "text",
                {
                  fill: defaultTheme.muted,
                  fontSize: 12,
                  fontWeight: 800,
                  textAnchor: "middle",
                  x: left + plotWidth / 2,
                  y: top + plotHeight / 2 + 4
                },
                "暂无趋势数据"
              )
            : null
        )}
      </View>
    );
  }

  return (
    <View style={styles.lineChartWrap}>
      <Svg height={height} width="100%" viewBox={`0 0 ${width} ${height}`}>
        {steps.map((step, index) => (
          <React.Fragment key={`rule-${step}-${index}`}>
            <Path
              d={`M ${left} ${top + (plotHeight / 2) * index} L ${left + plotWidth} ${top + (plotHeight / 2) * index}`}
              stroke="#E5F5FF"
              strokeDasharray={index === 2 ? undefined : [5, 6]}
              strokeWidth={1}
            />
          </React.Fragment>
        ))}
        {hasPoints ? <Path d={areaPath} fill={`${color}18`} /> : null}
        {hasPoints ? <Path d={linePath} fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} /> : null}
        {coordinates.map((point) => (
          <Circle
            key={`hit-${point.label}`}
            cx={point.x}
            cy={point.y}
            fill="transparent"
            onPress={() => showPoint(point)}
            r={16}
          />
        ))}
        {coordinates.map((point) => (
          <Circle
            key={`point-${point.label}`}
            cx={point.x}
            cy={point.y}
            fill="#FFFFFF"
            onPress={() => showPoint(point)}
            onPressIn={() => showPoint(point)}
            r={activePoint?.label === point.label ? 7 : 5}
            stroke={color}
            strokeWidth={activePoint?.label === point.label ? 4 : 3}
          />
        ))}
      </Svg>
      <View style={styles.nativeAxisLabels}>
        {steps.map((step) => (
          <Text key={step} style={styles.axisAmount}>
            ¥{step}
          </Text>
        ))}
      </View>
      <View style={styles.nativeXAxis}>
        {points.map((point) => (
          <Text key={point.label} style={styles.axisDate}>
            {point.label}
          </Text>
        ))}
      </View>
      {!hasPoints ? <Text style={styles.emptyTrendText}>暂无趋势数据</Text> : null}
      {active && nativeTooltipStyle ? (
        <Animated.View
          pointerEvents="none"
          entering={FadeInUp.duration(120)}
          style={[styles.lineTooltip, nativeTooltipStyle, { borderColor: `${color}55` }]}
        >
          <Text style={styles.tooltipLabel}>{active.label}</Text>
          <Text style={[styles.tooltipValue, { color }]}>¥{active.value}</Text>
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingBottom: 110
  },
  summaryGrid: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12
  },
  balanceCard: {
    alignItems: "center",
    backgroundColor: defaultTheme.primarySoft,
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 14
  },
  cardLabel: {
    color: defaultTheme.muted,
    fontSize: 13,
    fontWeight: "800"
  },
  balance: {
    color: defaultTheme.text,
    fontSize: 28,
    fontWeight: "900",
    marginTop: 5
  },
  ratioPill: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8
  },
  ratioText: {
    color: defaultTheme.primary,
    fontSize: 12,
    fontWeight: "900"
  },
  chartCard: {
    gap: 16,
    marginBottom: 14
  },
  cardHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  cardTitle: {
    color: defaultTheme.text,
    fontSize: 17,
    fontWeight: "900"
  },
  cardHint: {
    color: defaultTheme.muted,
    fontSize: 12,
    marginTop: 3
  },
  chartIcon: {
    alignItems: "center",
    borderRadius: 8,
    height: 38,
    justifyContent: "center",
    width: 38
  },
  donutRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 16
  },
  segmentedDonut: {
    alignItems: "center",
    borderRadius: 66,
    height: 132,
    justifyContent: "center",
    position: "relative",
    zIndex: 5,
    width: 132
  },
  donutCenter: {
    alignItems: "center",
    height: 86,
    justifyContent: "center",
    left: 23,
    position: "absolute",
    top: 23,
    width: 86
  },
  donutName: {
    color: defaultTheme.text,
    fontSize: 13,
    fontWeight: "900",
    maxWidth: 76,
    textAlign: "center"
  },
  donutValue: {
    color: defaultTheme.text,
    fontSize: 20,
    fontWeight: "900"
  },
  donutLabel: {
    color: defaultTheme.muted,
    fontSize: 11,
    fontWeight: "800"
  },
  segmentInfoPanel: {
    backgroundColor: "#FFFFFF",
    borderColor: "#DFF3FF",
    borderRadius: 8,
    borderWidth: 1,
    elevation: 4,
    gap: 3,
    left: 144,
    minWidth: 128,
    paddingHorizontal: 12,
    paddingVertical: 10,
    position: "absolute",
    shadowColor: "#8CCFEB",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 14,
    top: 30,
    zIndex: 10
  },
  segmentInfoHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 7
  },
  segmentInfoName: {
    color: defaultTheme.text,
    fontSize: 13,
    fontWeight: "900"
  },
  segmentInfoPercent: {
    color: defaultTheme.primary,
    fontSize: 20,
    fontWeight: "900"
  },
  segmentInfoAmount: {
    color: defaultTheme.muted,
    fontSize: 12,
    fontWeight: "800"
  },
  legend: {
    flex: 1,
    gap: 7
  },
  legendItem: {
    alignItems: "center",
    borderRadius: 8,
    flexDirection: "row",
    gap: 8,
    minHeight: 30,
    paddingHorizontal: 8
  },
  legendActive: {
    backgroundColor: "#F2FAFF"
  },
  legendDot: {
    borderRadius: 5,
    height: 10,
    width: 10
  },
  legendText: {
    color: defaultTheme.text,
    flex: 1,
    fontSize: 13,
    fontWeight: "800"
  },
  legendAmount: {
    color: defaultTheme.muted,
    fontSize: 12,
    fontWeight: "800"
  },
  rangeSwitch: {
    backgroundColor: defaultTheme.primarySoft,
    borderRadius: 8,
    flexDirection: "row",
    padding: 3
  },
  rangeButton: {
    alignItems: "center",
    borderRadius: 7,
    justifyContent: "center",
    minHeight: 32,
    minWidth: 48
  },
  rangeActive: {
    backgroundColor: "#FFFFFF"
  },
  rangeText: {
    color: defaultTheme.muted,
    fontSize: 12,
    fontWeight: "900"
  },
  rangeTextActive: {
    color: defaultTheme.primary
  },
  lineChartWrap: {
    height: 190,
    justifyContent: "center",
    overflow: "visible",
    position: "relative",
    width: "100%"
  },
  nativeAxisLabels: {
    height: 104,
    justifyContent: "space-between",
    left: 0,
    position: "absolute",
    top: 45,
    width: 34
  },
  axisAmount: {
    color: defaultTheme.muted,
    fontSize: 10,
    fontWeight: "800",
    textAlign: "right"
  },
  nativeXAxis: {
    bottom: 4,
    flexDirection: "row",
    justifyContent: "space-between",
    left: 42,
    position: "absolute",
    right: 12
  },
  axisDate: {
    color: defaultTheme.muted,
    fontSize: 10,
    fontWeight: "800"
  },
  emptyTrendText: {
    color: defaultTheme.muted,
    fontSize: 12,
    fontWeight: "800",
    left: 42,
    position: "absolute",
    right: 12,
    textAlign: "center",
    top: 94
  },
  lineTooltip: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    borderWidth: 1,
    elevation: 4,
    gap: 2,
    paddingHorizontal: 10,
    paddingVertical: 7,
    position: "absolute"
  },
  tooltipLabel: {
    color: defaultTheme.text,
    fontSize: 11,
    fontWeight: "900"
  },
  tooltipValue: {
    fontSize: 13,
    fontWeight: "900"
  },
  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10
  },
  filterChip: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: "#E7F5FF",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 7,
    minHeight: 44,
    paddingHorizontal: 10
  },
  filterChipActive: {
    backgroundColor: defaultTheme.primary
  },
  filterText: {
    color: defaultTheme.text,
    fontSize: 13,
    fontWeight: "900"
  },
  filterTextActive: {
    color: "#FFFFFF"
  },
  backdrop: {
    backgroundColor: "rgba(41, 70, 91, 0.28)",
    flex: 1,
    justifyContent: "flex-end"
  },
  backdropPressArea: {
    flex: 1
  },
  sheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    maxHeight: "58%",
    paddingBottom: 18,
    paddingHorizontal: 18,
    paddingTop: 16
  },
  sheetTitle: {
    color: defaultTheme.text,
    fontSize: 18,
    fontWeight: "900"
  },
  sheetHint: {
    color: defaultTheme.muted,
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 12,
    marginTop: 4
  },
  selectorList: {
    maxHeight: 360
  },
  selectorRow: {
    alignItems: "center",
    backgroundColor: "#F7FCFF",
    borderRadius: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
    minHeight: 48,
    paddingHorizontal: 12
  },
  selectorRowActive: {
    backgroundColor: defaultTheme.primary
  },
  selectorLeft: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10
  },
  selectorText: {
    color: defaultTheme.text,
    fontSize: 14,
    fontWeight: "900"
  },
  selectorTextActive: {
    color: "#FFFFFF"
  }
});
