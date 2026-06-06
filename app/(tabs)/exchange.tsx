import { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import { ArrowLeftRight, CheckCircle2, RefreshCcw } from "lucide-react-native";
import { AnimatedPressable } from "@/components/common/AnimatedPressable";
import { AppScreen } from "@/components/common/AppScreen";
import { MiaoCard } from "@/components/common/MiaoCard";
import { MiaoLoader } from "@/components/common/MiaoLoader";
import { PageHeader } from "@/components/common/PageHeader";
import { currencyLabels, supportedCurrencies } from "@/constants/currencies";
import { defaultTheme } from "@/constants/themes";
import { getExchangeRateDetail } from "@/services/exchangeRateService";
import type { CurrencyCode } from "@/types/models";

export default function ExchangeScreen() {
  const [amount, setAmount] = useState("100");
  const [fromCurrency, setFromCurrency] = useState<CurrencyCode>("CNY");
  const [toCurrency, setToCurrency] = useState<CurrencyCode>("USD");
  const [loading, setLoading] = useState(false);
  const [rate, setRate] = useState(0);
  const [rateDate, setRateDate] = useState("");
  const [rateSource, setRateSource] = useState("cache");
  const [cnyRates, setCnyRates] = useState<Partial<Record<CurrencyCode, number>>>({ CNY: 1 });

  const result = useMemo(() => {
    const value = Number(amount);
    if (!Number.isFinite(value) || value < 0) {
      return "0.00";
    }
    return (value * rate).toFixed(2);
  }, [amount, rate]);

  useEffect(() => {
    let mounted = true;

    async function loadRate() {
      setLoading(true);
      const nextRate = await getExchangeRateDetail(fromCurrency, toCurrency);
      if (mounted) {
        setRate(Number(nextRate.rate));
        setRateDate(nextRate.rateDate);
        setRateSource(nextRate.source);
        setLoading(false);
      }
    }

    loadRate().catch((error) => {
      console.warn("Load exchange rate failed", error);
      if (mounted) {
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
    };
  }, [fromCurrency, toCurrency]);

  useEffect(() => {
    let mounted = true;

    async function loadRateTable() {
      const entries = await Promise.all(
        supportedCurrencies.map(async (code) => {
          if (code === "CNY") {
            return [code, 1] as const;
          }

          const nextRate = await getExchangeRateDetail(code, "CNY");
          return [code, Number(nextRate.rate)] as const;
        })
      );

      if (mounted) {
        setCnyRates(Object.fromEntries(entries));
      }
    }

    loadRateTable().catch((error) => {
      console.warn("Load exchange rate table failed", error);
    });

    return () => {
      mounted = false;
    };
  }, []);

  function swap() {
    setFromCurrency(toCurrency);
    setToCurrency(fromCurrency);
  }

  return (
    <AppScreen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <PageHeader title="汇率计算" subtitle="常见币种换算，按天缓存，离线优先使用最近缓存" />

        <Animated.View entering={FadeInUp.delay(40).duration(260)}>
          <MiaoCard style={styles.converterCard}>
            <View style={styles.inputBlock}>
              <Text style={styles.inputLabel}>金额</Text>
              <TextInput
                keyboardType="decimal-pad"
                onChangeText={setAmount}
                placeholder="输入金额"
                placeholderTextColor={defaultTheme.muted}
                style={styles.amountInput}
                value={amount}
              />
            </View>

            <View style={styles.currencyPanel}>
              <View style={styles.currencyHeader}>
                <Text style={styles.currencyTitle}>原币种</Text>
                <Text style={styles.currencyTitle}>目标币种</Text>
              </View>
              <View style={styles.currencyRow}>
                <CurrencyPicker value={fromCurrency} onChange={setFromCurrency} />
                <AnimatedPressable accessibilityLabel="交换币种" onPress={swap} pressedScale={0.9} style={styles.swapButton}>
                  <ArrowLeftRight color="#FFFFFF" size={20} strokeWidth={2.7} />
                </AnimatedPressable>
                <CurrencyPicker value={toCurrency} onChange={setToCurrency} />
              </View>
            </View>

            <View style={styles.resultBox}>
              {loading ? (
                <MiaoLoader label="正在换算..." />
              ) : (
                <>
                  <Text style={styles.resultLabel}>换算结果</Text>
                  <Text style={styles.resultValue}>
                    {result} {toCurrency}
                  </Text>
                  <Text style={styles.rateText}>
                    1 {fromCurrency} ≈ {rate.toFixed(4)} {toCurrency}
                  </Text>
                </>
              )}
            </View>
          </MiaoCard>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(100).duration(260)} style={styles.statusGrid}>
          <MiaoCard style={styles.statusCard}>
            <CheckCircle2 color={defaultTheme.primary} size={22} />
            <Text style={styles.statusTitle}>{rateSource === "network" ? "今日已更新" : "缓存可用"}</Text>
            <Text style={styles.statusText}>{rateDate || "等待汇率数据"}</Text>
          </MiaoCard>
          <MiaoCard style={styles.statusCard}>
            <RefreshCcw color={defaultTheme.pink} size={22} />
            <Text style={styles.statusTitle}>失败回退</Text>
            <Text style={styles.statusText}>请求失败时使用最近历史缓存</Text>
          </MiaoCard>
        </Animated.View>

        <MiaoCard style={styles.tableCard}>
          <Text style={styles.cardTitle}>常见币种</Text>
          {supportedCurrencies.map((code) => (
            <View key={code} style={styles.rateRow}>
              <View>
                <Text style={styles.rateCode}>{code}</Text>
                <Text style={styles.rateName}>{currencyLabels[code]}</Text>
              </View>
              <Text style={styles.rateNumber}>1 {code} = {(cnyRates[code] ?? 0).toFixed(4)} CNY</Text>
            </View>
          ))}
        </MiaoCard>
      </ScrollView>
    </AppScreen>
  );
}

interface CurrencyPickerProps {
  onChange: (value: CurrencyCode) => void;
  value: CurrencyCode;
}

function CurrencyPicker({ onChange, value }: CurrencyPickerProps) {
  return (
    <View style={styles.picker}>
      {supportedCurrencies.map((code) => (
        <AnimatedPressable
          key={code}
          onPress={() => onChange(code)}
          style={[styles.currencyChip, value === code && styles.currencyChipActive]}
        >
          <Text style={[styles.currencyCode, value === code && styles.currencyCodeActive]}>{code}</Text>
        </AnimatedPressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingBottom: 110
  },
  converterCard: {
    gap: 16,
    marginBottom: 14
  },
  inputBlock: {
    gap: 8
  },
  inputLabel: {
    color: defaultTheme.muted,
    fontSize: 13,
    fontWeight: "900"
  },
  amountInput: {
    backgroundColor: defaultTheme.primarySoft,
    borderColor: "#CBEFFF",
    borderRadius: 8,
    borderWidth: 1,
    color: defaultTheme.text,
    fontSize: 30,
    fontWeight: "900",
    minHeight: 64,
    paddingHorizontal: 14
  },
  currencyPanel: {
    gap: 10
  },
  currencyHeader: {
    flexDirection: "row",
    justifyContent: "space-between"
  },
  currencyTitle: {
    color: defaultTheme.muted,
    fontSize: 12,
    fontWeight: "900",
    width: "42%"
  },
  currencyRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10
  },
  picker: {
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7
  },
  currencyChip: {
    alignItems: "center",
    backgroundColor: "#F2FAFF",
    borderRadius: 8,
    minHeight: 34,
    minWidth: 52,
    justifyContent: "center",
    paddingHorizontal: 8
  },
  currencyChipActive: {
    backgroundColor: defaultTheme.primary
  },
  currencyCode: {
    color: defaultTheme.text,
    fontSize: 12,
    fontWeight: "900"
  },
  currencyCodeActive: {
    color: "#FFFFFF"
  },
  swapButton: {
    alignItems: "center",
    backgroundColor: defaultTheme.primary,
    borderRadius: 8,
    height: 44,
    justifyContent: "center",
    width: 44
  },
  resultBox: {
    alignItems: "center",
    backgroundColor: "#F7FCFF",
    borderRadius: 8,
    minHeight: 128,
    justifyContent: "center",
    padding: 14
  },
  resultLabel: {
    color: defaultTheme.muted,
    fontSize: 13,
    fontWeight: "900"
  },
  resultValue: {
    color: defaultTheme.text,
    fontSize: 32,
    fontWeight: "900",
    marginTop: 6
  },
  rateText: {
    color: defaultTheme.muted,
    fontSize: 12,
    fontWeight: "800",
    marginTop: 4
  },
  statusGrid: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 14
  },
  statusCard: {
    flex: 1,
    gap: 7,
    minHeight: 116
  },
  statusTitle: {
    color: defaultTheme.text,
    fontSize: 14,
    fontWeight: "900"
  },
  statusText: {
    color: defaultTheme.muted,
    fontSize: 12,
    lineHeight: 17
  },
  tableCard: {
    gap: 4
  },
  cardTitle: {
    color: defaultTheme.text,
    fontSize: 17,
    fontWeight: "900",
    marginBottom: 8
  },
  rateRow: {
    alignItems: "center",
    borderTopColor: "#EEF8FF",
    borderTopWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 54
  },
  rateCode: {
    color: defaultTheme.text,
    fontSize: 14,
    fontWeight: "900"
  },
  rateName: {
    color: defaultTheme.muted,
    fontSize: 12,
    marginTop: 2
  },
  rateNumber: {
    color: defaultTheme.primary,
    fontSize: 12,
    fontWeight: "900"
  }
});
