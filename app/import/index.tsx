import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Alert, InteractionManager, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import { ArrowLeft, Check, FileSpreadsheet, UploadCloud } from "lucide-react-native";
import { AnimatedPressable } from "@/components/common/AnimatedPressable";
import { AppScreen } from "@/components/common/AppScreen";
import { MiaoCard } from "@/components/common/MiaoCard";
import { MiaoLoader } from "@/components/common/MiaoLoader";
import { PageStepper } from "@/components/common/PageStepper";
import { PageHeader } from "@/components/common/PageHeader";
import { CategoryLearningDialog } from "@/components/import/CategoryLearningDialog";
import { DuplicateRecordDialog } from "@/components/import/DuplicateRecordDialog";
import { ImportPreviewList, type ImportPreviewItem } from "@/components/import/ImportPreviewList";
import { ImportSourceSelector } from "@/components/import/ImportSourceSelector";
import { defaultTheme } from "@/constants/themes";
import { getCategories } from "@/services/categoryService";
import { checkImportedRecordDuplicate, createImportDedupeHash } from "@/services/duplicateRecordService";
import { createImportClassifier } from "@/services/importClassifierService";
import { classifyImportTransaction } from "@/services/importTransactionClassifierService";
import {
  assertImportFileMatchesProvider,
  confirmImportBatch,
  getImportFileMismatchMessage,
  pickImportFile,
  readImportFileBuffer
} from "@/services/importService";
import { parseImportRowsAsync, type ParsedImportRow } from "@/services/importParserService";
import { learnClassificationRule } from "@/services/classificationKnowledgeService";
import { useRecordStore } from "@/stores/useRecordStore";
import type { CategoryDTO, ImportFileSelectionDTO, ImportProvider, ImportRecordDraftDTO, ImportRowStatus, RecordType } from "@/types/models";
import { getTodayDateString } from "@/utils/date";

const MAX_IMPORT_FILE_SIZE = 8 * 1024 * 1024;
const MAX_IMPORT_PREVIEW_ROWS = 1000;
const IMPORT_PREVIEW_PAGE_SIZE = 20;
const IMPORT_PARSE_TIMEOUT_MS = 45000;
const PREVIEW_BUILD_BATCH_SIZE = 25;
const MONTH_RANGE_OPTIONS = [1, 2, 3, 4, 5, 6] as const;
const DEFAULT_IMPORT_MONTH_RANGE = 6;

type ImportMonthRange = (typeof MONTH_RANGE_OPTIONS)[number];

interface ImportProgressState {
  label: string;
  percent: number;
  visible: boolean;
}

function normalizeVisibleProvider(provider?: ImportProvider): ImportProvider {
  return provider === "alipay" ? "alipay" : "wechat";
}

export default function ImportScreen() {
  const params = useLocalSearchParams<{ bankPreset?: "abc" | "cmb"; provider?: ImportProvider }>();
  const [provider, setProvider] = useState<ImportProvider>(normalizeVisibleProvider(params.provider));
  const [bankPreset, setBankPreset] = useState<"abc" | "cmb">("abc");
  const [file, setFile] = useState<ImportFileSelectionDTO | null>(null);
  const [items, setItems] = useState<ImportPreviewItem[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<CategoryDTO[]>([]);
  const [incomeCategories, setIncomeCategories] = useState<CategoryDTO[]>([]);
  const [monthRange, setMonthRange] = useState<ImportMonthRange>(DEFAULT_IMPORT_MONTH_RANGE);
  const [loading, setLoading] = useState(false);
  const [importProgress, setImportProgress] = useState<ImportProgressState>({
    label: "",
    percent: 0,
    visible: false
  });
  const [categoryTargetId, setCategoryTargetId] = useState<string | null>(null);
  const [duplicateTargetId, setDuplicateTargetId] = useState<string | null>(null);
  const [previewPage, setPreviewPage] = useState(0);
  const [imported, setImported] = useState(false);
  const requestRecordRefresh = useRecordStore((state) => state.requestRefresh);

  useEffect(() => {
    let mounted = true;

    Promise.all([getCategories("expense"), getCategories("income")])
      .then(([nextExpenseCategories, nextIncomeCategories]) => {
        if (mounted) {
          setExpenseCategories(nextExpenseCategories);
          setIncomeCategories(nextIncomeCategories);
        }
      })
      .catch((error) => {
        console.warn("Load import categories failed", error);
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (params.provider) {
      setProvider(normalizeVisibleProvider(params.provider));
    }
    if (params.bankPreset === "abc" || params.bankPreset === "cmb") {
      setBankPreset(params.bankPreset);
    }
  }, [params.bankPreset, params.provider]);

  const allCategories = useMemo(() => [...expenseCategories, ...incomeCategories], [expenseCategories, incomeCategories]);
  const categoryTarget = items.find((item) => item.id === categoryTargetId);
  const duplicateTarget = items.find((item) => item.id === duplicateTargetId);
  const previewItems = useMemo(() => items.filter((item) => item.draft.status !== "imported"), [items]);
  const previewPageCount = useMemo(
    () => Math.max(1, Math.ceil(previewItems.length / IMPORT_PREVIEW_PAGE_SIZE)),
    [previewItems.length]
  );
  const safePreviewPage = Math.min(previewPage, previewPageCount - 1);
  const visiblePreviewItems = useMemo(
    () =>
      previewItems.slice(
        safePreviewPage * IMPORT_PREVIEW_PAGE_SIZE,
        safePreviewPage * IMPORT_PREVIEW_PAGE_SIZE + IMPORT_PREVIEW_PAGE_SIZE
      ),
    [previewItems, safePreviewPage]
  );
  const previewStats = useMemo(() => {
    const ready = items.filter((item) => item.draft.status === "ready").length;
    const duplicate = items.filter((item) => item.draft.status === "duplicate").length;
    const skipped = items.filter((item) => item.draft.status === "skipped").length;
    const lowConfidence = items.filter((item) => (item.draft.confidence ?? 0) < 0.65 && item.draft.status === "ready").length;
    return { duplicate, lowConfidence, ready, skipped };
  }, [items]);

  useEffect(() => {
    if (previewPage > previewPageCount - 1) {
      setPreviewPage(Math.max(0, previewPageCount - 1));
    }
  }, [previewPage, previewPageCount]);

  function updateImportProgress(percent: number, label: string) {
    setImportProgress({
      label,
      percent: Math.max(0, Math.min(100, percent)),
      visible: true
    });
  }

  async function chooseFile() {
    setLoading(true);
    setImported(false);
    setPreviewPage(0);
    updateImportProgress(0, "正在打开文件选择器");

    try {
      const selection = await pickImportFile(provider);
      if (!selection) {
        return;
      }
      updateImportProgress(12, "已选择文件，正在校验格式");

      if (selection.size && selection.size > MAX_IMPORT_FILE_SIZE) {
        Alert.alert("文件过大", "请先选择 8MB 以内的账单文件。");
        return;
      }

      try {
        assertImportFileMatchesProvider(provider, selection.fileType);
      } catch {
        Alert.alert("文件格式不匹配", getImportFileMismatchMessage(provider));
        return;
      }

      updateImportProgress(22, "正在读取本地文件");
      await yieldToUi();
      const buffer = await readImportFileBuffer(selection);
      updateImportProgress(34, selection.fileType === "pdf" ? "正在准备解析 PDF" : "正在解析账单模板");
      await yieldToUi();
      const rows = await withImportTimeout(
        parseImportRowsAsync(selection.fileType, buffer, {
          bankPreset,
          onProgress: updateImportProgress
        }),
        IMPORT_PARSE_TIMEOUT_MS
      );
      updateImportProgress(72, `已解析 ${rows.length} 行，正在生成预览`);
      await yieldToUi();
      if (rows.length === 0) {
        setFile(selection);
        setItems([]);
        Alert.alert("未识别到交易流水", "当前 PDF 没有解析出银行交易行，请确认选择的是农行或招商银行的可复制文本流水 PDF。");
        return;
      }

      const nextItems = await buildPreviewItems(rows, provider, bankPreset, monthRange);
      if (nextItems.length === 0) {
        setFile(selection);
        setItems([]);
        Alert.alert("未生成可导入账单", "文件已读取，但金额或日期字段无法归一化，请检查账单模板是否匹配。");
        return;
      }

      const autoImportItems = nextItems.filter(isAutoImportItem);
      const silentSkippedItems = nextItems.filter(isSilentSkippedItem);
      let autoImportedRows = 0;

      setFile(selection);
      if (autoImportItems.length > 0 || silentSkippedItems.length > 0) {
        updateImportProgress(92, `正在自动导入 ${autoImportItems.length} 笔`);
        const batch = await confirmImportBatch({
          drafts: [...autoImportItems, ...silentSkippedItems].map((item) => item.draft),
          file: selection,
          provider,
          providerDetail: provider === "bank" ? bankPreset : null
        });
        autoImportedRows = batch.importedRows;
        requestRecordRefresh();
      }

      const remainingItems = nextItems.filter((item) => !isAutoImportItem(item) && !isSilentSkippedItem(item));
      setItems(remainingItems);
      setImported(autoImportedRows > 0);
      updateImportProgress(100, "导入处理完成");

      if (autoImportedRows > 0 && remainingItems.length === 0) {
        Alert.alert("已自动导入", `已自动导入 ${autoImportedRows} 笔，本次没有需要手动确认的账单。`, [
          { text: "留在本页" },
          { text: "返回添加收支", onPress: () => router.replace("/record/new" as never) }
        ]);
      } else if (autoImportedRows > 0) {
        Alert.alert(
          "已自动导入",
          `已自动导入 ${autoImportedRows} 笔，剩余 ${remainingItems.length} 笔需要确认分类或重复。`
        );
      }
    } catch (error) {
      console.warn("Import file failed", error);
      Alert.alert("解析失败", getImportFailureMessage(error));
    } finally {
      setLoading(false);
      setImportProgress((current) => ({ ...current, visible: false }));
    }
  }

  async function buildPreviewItems(
    rows: ParsedImportRow[],
    nextProvider: ImportProvider,
    nextBankPreset: "abc" | "cmb",
    nextMonthRange: ImportMonthRange
  ): Promise<ImportPreviewItem[]> {
    const drafts = rows
      .map((row, index) => normalizeRow(row, nextProvider, nextBankPreset, index))
      .filter(Boolean) as ImportRecordDraftDTO[];
    const filteredDrafts = filterDraftsByMonthRange(drafts, nextMonthRange);
    const classifyImportedRecord = await createImportClassifier();
    const checked: ImportPreviewItem[] = [];
    const previewToken = Date.now();

    for (let start = 0; start < filteredDrafts.length; start += PREVIEW_BUILD_BATCH_SIZE) {
      const batchDrafts = filteredDrafts.slice(start, start + PREVIEW_BUILD_BATCH_SIZE);
      const batchItems = await Promise.all(
        batchDrafts.map(async (draft, offset) => {
          const index = start + offset;
          const classification =
            draft.transactionKind === "refund"
              ? {
                  categoryId:
                    incomeCategories.find((category) => category.name === "退款")?.id ??
                    incomeCategories.find((category) => category.name.includes("其他"))?.id,
                  confidence: 1
                }
              : draft.transactionKind === "transfer" || draft.transactionKind === "ignore"
                ? { categoryId: undefined, confidence: 1 }
                : await classifyImportedRecord(draft);
          const enrichedDraft = {
            ...draft,
            categoryId: classification.categoryId,
            confidence: classification.confidence,
            dedupeHash: createImportDedupeHash(draft)
          };
          const duplicate = draft.status === "pending" ? await checkImportedRecordDuplicate(enrichedDraft) : { level: "none" as const };
          const status: ImportRowStatus =
            draft.status !== "pending"
              ? draft.status
              : duplicate.level === "none"
                ? "ready"
                : duplicate.level === "confirmed"
                  ? "skipped"
                  : "duplicate";
          const raw =
            duplicate.level === "confirmed"
              ? { ...enrichedDraft.raw, _importSkipReason: "confirmed_duplicate" }
              : enrichedDraft.raw;

          return {
            duplicateReason: "reason" in duplicate ? duplicate.reason : undefined,
            id: `preview-${previewToken}-${index}`,
            draft: {
              ...enrichedDraft,
              duplicateRecordId: "duplicateRecordId" in duplicate ? duplicate.duplicateRecordId : undefined,
              raw,
              status
            }
          };
        })
      );

      checked.push(...batchItems);
      updateImportProgress(
        74 + Math.round((Math.min(checked.length, filteredDrafts.length) / Math.max(1, filteredDrafts.length)) * 10),
        `正在识别分类和重复账单 ${Math.min(checked.length, filteredDrafts.length)}/${filteredDrafts.length}`
      );
      await yieldToUi();
    }

    return checked
      .sort((a, b) => b.draft.recordDate.localeCompare(a.draft.recordDate))
      .slice(0, MAX_IMPORT_PREVIEW_ROWS);
  }

  async function changeCategory(categoryId: string) {
    if (!categoryTargetId) {
      return;
    }

    const target = items.find((item) => item.id === categoryTargetId);
    if (target) {
      await learnClassificationRule({
        categoryId,
        keyword: target.draft.merchantName || target.draft.note
      });
    }

    setItems((current) =>
      current.map((item) =>
        item.id === categoryTargetId
          ? {
              ...item,
              draft: {
                ...item.draft,
                categoryId,
                confidence: 1,
                status: item.draft.status === "duplicate" ? "duplicate" : "ready"
              }
            }
          : item
      )
    );
    setCategoryTargetId(null);
  }

  function changeType(id: string, type: RecordType) {
    const nextCategories = type === "income" ? incomeCategories : expenseCategories;
    const fallbackCategoryId = nextCategories.find((item) => item.name.includes("其他"))?.id ?? nextCategories[0]?.id;

    setItems((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              draft: {
                ...item.draft,
                categoryId: fallbackCategoryId,
                confidence: 0.28,
                status: item.draft.status === "duplicate" || item.draft.status === "skipped" ? item.draft.status : "ready",
                transactionKind: type,
                type
              }
            }
          : item
      )
    );
  }

  function toggleSkip(id: string) {
    setItems((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              draft: {
                ...item.draft,
                status: item.draft.status === "skipped" ? "ready" : "skipped"
              }
            }
          : item
      )
    );
  }

  function markDuplicateAsReady(id: string) {
    setItems((current) =>
      current.map((item) => (item.id === id ? { ...item, draft: { ...item.draft, status: "ready" } } : item))
    );
    setDuplicateTargetId(null);
  }

  function confirmDuplicate(id: string) {
    setItems((current) =>
      current.map((item) => (item.id === id ? { ...item, draft: { ...item.draft, status: "skipped" } } : item))
    );
    setDuplicateTargetId(null);
  }

  async function confirmImport() {
    if (!file) {
      Alert.alert("请先选择文件", "需要先选择账单文件并生成预览。");
      return;
    }

    const readyCount = items.filter((item) => item.draft.status === "ready").length;
    if (readyCount === 0) {
      Alert.alert("没有可导入账单", "请先恢复或修正至少一条账单。");
      return;
    }

    setLoading(true);
    try {
      const batch = await confirmImportBatch({
        drafts: items.map((item) => item.draft),
        file,
        provider,
        providerDetail: provider === "bank" ? bankPreset : null
      });

      setItems((current) =>
        current.map((item) => (item.draft.status === "ready" ? { ...item, draft: { ...item.draft, status: "imported" } } : item))
      );
      requestRecordRefresh();
      setImported(true);
      Alert.alert("导入完成", `已导入 ${batch.importedRows} 笔，跳过重复 ${batch.duplicateRows} 笔。`);
    } catch (error) {
      console.warn("Confirm import failed", error);
      Alert.alert("导入失败", "部分账单可能已经导入或字段不完整，请检查预览后重试。");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppScreen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <PageHeader title="导入账单" subtitle="选择来源和账单文件，先预览修正再确认导入" compact showMenu={false} />

        <Animated.View entering={FadeInUp.delay(40).duration(260)}>
          <MiaoCard style={styles.card}>
            <Text style={styles.cardTitle}>导入来源</Text>
            <ImportSourceSelector
              value={provider}
              onChange={(nextProvider) => {
                setProvider(nextProvider);
                setFile(null);
                setItems([]);
                setPreviewPage(0);
                setImported(false);
              }}
            />

            <View style={styles.rangePanel}>
              <Text style={styles.rangeLabel}>导入月份范围</Text>
              <View style={styles.rangeOptions}>
                {MONTH_RANGE_OPTIONS.map((option) => {
                  const active = monthRange === option;
                  return (
                    <AnimatedPressable
                      key={option}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                      onPress={() => {
                        setMonthRange(option);
                        setFile(null);
                        setItems([]);
                        setPreviewPage(0);
                        setImported(false);
                      }}
                      style={[styles.rangeOption, active && styles.rangeOptionActive]}
                    >
                      <Text style={[styles.rangeText, active && styles.rangeTextActive]}>{option}个月</Text>
                    </AnimatedPressable>
                  );
                })}
              </View>
            </View>

            <AnimatedPressable onPress={chooseFile} style={styles.uploadButton}>
              <UploadCloud color="#FFFFFF" size={20} />
              <Text style={styles.uploadText}>{file ? "重新选择文件" : getUploadButtonLabel(provider)}</Text>
            </AnimatedPressable>

            {file ? (
              <View style={styles.fileBox}>
                <FileSpreadsheet color={defaultTheme.primary} size={20} />
                <View style={styles.fileText}>
                  <Text style={styles.fileName} numberOfLines={1}>{file.name}</Text>
                  <Text style={styles.fileMeta}>{file.fileType.toUpperCase()} · {file.size ? `${Math.round(file.size / 1024)} KB` : "本地文件"}</Text>
                </View>
              </View>
            ) : null}

            {importProgress.visible ? <ImportProgressBar progress={importProgress} /> : null}
          </MiaoCard>
        </Animated.View>

        {loading ? (
          <View style={styles.loaderBox}>
            <MiaoLoader label={importProgress.label || "正在解析账单..."} />
          </View>
        ) : items.length > 0 ? (
          <>
            <View style={styles.statsRow}>
              <Stat label="可导入" value={previewStats.ready} />
              <Stat label="待确认" value={previewStats.lowConfidence} />
              <Stat label="疑似重复" value={previewStats.duplicate} />
              <Stat label="已跳过" value={previewStats.skipped} />
            </View>

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>预览列表</Text>
              <Text style={styles.sectionMeta}>
                {previewItems.length > IMPORT_PREVIEW_PAGE_SIZE
                  ? `${safePreviewPage * IMPORT_PREVIEW_PAGE_SIZE + 1}-${Math.min(previewItems.length, (safePreviewPage + 1) * IMPORT_PREVIEW_PAGE_SIZE)} / ${previewItems.length} 行`
                  : `共 ${previewItems.length} 行`}
              </Text>
            </View>

            <PageStepper
              page={safePreviewPage}
              pageSize={IMPORT_PREVIEW_PAGE_SIZE}
              total={previewItems.length}
              onChange={setPreviewPage}
            />

            <ImportPreviewList
              categories={allCategories}
              items={visiblePreviewItems}
              onChangeType={changeType}
              onOpenCategory={setCategoryTargetId}
              onResolveDuplicate={setDuplicateTargetId}
              onToggleSkip={toggleSkip}
            />

            <AnimatedPressable onPress={confirmImport} style={[styles.confirmButton, imported && styles.importedButton]}>
              <Check color="#FFFFFF" size={18} />
              <Text style={styles.confirmText}>{imported ? "本次预览已确认" : "确认导入可用账单"}</Text>
            </AnimatedPressable>
          </>
        ) : null}

        <AnimatedPressable onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft color={defaultTheme.muted} size={18} />
          <Text style={styles.backText}>返回添加收支</Text>
        </AnimatedPressable>
      </ScrollView>

      <CategoryLearningDialog
        categories={categoryTarget?.draft.type === "income" ? incomeCategories : expenseCategories}
        onClose={() => setCategoryTargetId(null)}
        onSelect={changeCategory}
        open={Boolean(categoryTargetId)}
        selectedCategoryId={categoryTarget?.draft.categoryId}
      />
      <DuplicateRecordDialog
        onConfirmDuplicate={() => duplicateTargetId && confirmDuplicate(duplicateTargetId)}
        onImportAnyway={() => duplicateTargetId && markDuplicateAsReady(duplicateTargetId)}
        open={Boolean(duplicateTargetId)}
        reason={duplicateTarget?.duplicateReason}
      />
    </AppScreen>
  );
}

async function yieldToUi(): Promise<void> {
  if (Platform.OS === "web") {
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    return;
  }

  await new Promise<void>((resolve) => {
    InteractionManager.runAfterInteractions(() => {
      setTimeout(resolve, 0);
    });
  });
}

function normalizeRow(
  row: ParsedImportRow,
  provider: ImportProvider,
  bankPreset: "abc" | "cmb",
  index: number
): ImportRecordDraftDTO | null {
  const amountText = pickField(row, ["金额", "金额(元)", "交易金额", "收入金额", "支出金额", "amount", "money"]) ?? "";
  const signedAmount = parseSignedAmount(amountText);
  const directionText = pickField(row, ["收/支", "收支", "direction"]) ?? "";
  const typeText = pickField(row, ["交易类型", "交易分类", "交易摘要", "类型"]) ?? "";
  const statusText = pickField(row, ["当前状态", "交易状态", "状态", "status"]) ?? "";
  const productText = pickField(row, ["商品", "商品说明", "商品名称", "备注"]) ?? "";
  const rowText = stringifyRow(row);
  const transaction = classifyImportTransaction({
    directionText,
    productText,
    provider,
    rowText,
    signedAmount,
    statusText,
    typeText
  });
  const type = transaction.ledgerType;
  const silent = transaction.kind === "transfer" || transaction.kind === "ignore";
  const amountCents = Math.abs(Math.round(signedAmount * 100));
  const recordDate = resolveRecordDate(row, provider);

  if (!amountCents || !recordDate) {
    return {
      amountCents: amountCents || 0,
      note: stringifyRow(row),
      provider,
      raw: row,
      recordDate: recordDate || getTodayDateString(),
      status: "error",
      transactionKind: transaction.kind,
      type
    };
  }

  const merchantName = resolveMerchantName(row, provider, bankPreset, typeText);
  const note = resolveRecordNote(row, provider, bankPreset, merchantName, typeText, index);

  return {
    amountCents,
    classificationTexts: resolveClassificationTexts(row, provider, bankPreset),
    externalTradeNo: cleanValue(pickField(row, ["交易单号", "交易号", "交易订单号", "订单号", "日志号", "trade_no"])),
    importTemplate: provider === "bank" ? bankPreset : provider,
    merchantOrderNo: cleanValue(pickField(row, ["商户单号", "商家订单号", "商户订单号", "merchant_order_no", "order_no"])),
    merchantName,
    note,
    provider,
    raw: silent ? { ...row, _importSkipReason: transaction.kind, _importKindReason: transaction.reason } : row,
    recordDate,
    status: silent ? "skipped" : "pending",
    transactionKind: transaction.kind,
    type
  };
}

function pickField(row: ParsedImportRow, names: string[]): string | undefined {
  const entries = Object.entries(row);
  for (const name of names) {
    const match = entries.find(([key]) => key.trim().toLowerCase() === name.toLowerCase());
    if (match && String(match[1] ?? "").trim()) {
      return String(match[1]).trim();
    }
  }

  const fuzzy = entries.find(([key]) => names.some((name) => key.toLowerCase().includes(name.toLowerCase())));
  return fuzzy && String(fuzzy[1] ?? "").trim() ? String(fuzzy[1]).trim() : undefined;
}

function parseSignedAmount(value: string): number {
  const normalized = value.replace(/[¥,\s]/g, "").replace("元", "");
  const match = /[-+]?\d+(\.\d+)?/.exec(normalized);
  return match ? Number(match[0]) : 0;
}

function resolveMerchantName(
  row: ParsedImportRow,
  provider: ImportProvider,
  bankPreset: "abc" | "cmb",
  typeText: string
): string | undefined {
  if (provider === "wechat") {
    return (
      cleanValue(pickField(row, ["交易对方"])) ??
      cleanValue(pickField(row, ["商品"])) ??
      cleanValue(typeText)
    );
  }

  if (provider === "alipay") {
    return cleanValue(pickField(row, ["交易对方", "对方账号"])) ?? cleanValue(pickField(row, ["商品说明", "交易分类"]));
  }

  if (bankPreset === "abc") {
    return (
      cleanBankPostscript(pickField(row, ["交易附言"])) ??
      cleanBankPostscript(pickField(row, ["原始附言"])) ??
      cleanValue(pickField(row, ["对手信息", "交易摘要"]))
    );
  }

  return cleanValue(pickField(row, ["对手信息"])) ?? cleanValue(pickField(row, ["交易摘要"]));
}

function resolveClassificationTexts(row: ParsedImportRow, provider: ImportProvider, bankPreset: "abc" | "cmb"): string[] {
  if (provider !== "bank") {
    return [
      stringifyRow(row)
    ];
  }

  if (bankPreset === "abc") {
    return [
      normalizeBankClassificationText(pickField(row, ["交易摘要"])),
      cleanBankPostscript(pickField(row, ["交易附言"])),
      cleanBankPostscript(pickField(row, ["原始附言"])),
      cleanValue(pickField(row, ["对手信息"]))
    ].filter(Boolean) as string[];
  }

  return [
    normalizeBankClassificationText(pickField(row, ["交易摘要"])),
    cleanValue(pickField(row, ["对手信息"]))
  ].filter(Boolean) as string[];
}

function resolveRecordNote(
  row: ParsedImportRow,
  provider: ImportProvider,
  bankPreset: "abc" | "cmb",
  merchantName: string | undefined,
  typeText: string,
  index: number
): string {
  const parts =
    provider === "wechat"
      ? [pickField(row, ["商品"]), pickField(row, ["交易对方"]), typeText, pickField(row, ["备注"])]
      : provider === "alipay"
        ? [pickField(row, ["交易分类"]), pickField(row, ["商品说明"]), pickField(row, ["交易对方"]), pickField(row, ["备注"])]
        : bankPreset === "abc"
          ? [pickField(row, ["交易摘要"]), pickField(row, ["对手信息"]), pickField(row, ["交易附言"]), pickField(row, ["原始附言"])]
          : [pickField(row, ["交易摘要"]), pickField(row, ["对手信息"])];
  const note = parts.map(cleanValue).filter(Boolean).join(" · ");

  return note || merchantName || `导入账单 ${index + 1}`;
}

function cleanValue(value: string | undefined): string | undefined {
  const cleaned = value?.trim();
  return !cleaned || cleaned === "/" ? undefined : cleaned;
}

function cleanBankPostscript(value: string | undefined): string | undefined {
  const cleaned = cleanValue(value);
  if (!cleaned) {
    return undefined;
  }

  const withoutLeadingTradeNo = cleaned.replace(/^[A-Za-z0-9]+/, "").trim();
  return withoutLeadingTradeNo || cleaned;
}

function normalizeBankClassificationText(value: string | undefined): string | undefined {
  const cleaned = cleanValue(value);
  if (!cleaned || isGenericBankSummary(cleaned)) {
    return undefined;
  }

  return cleaned;
}

function isGenericBankSummary(value: string): boolean {
  return [
    "代付",
    "微信支付",
    "支付宝",
    "快捷支付",
    "银联入账",
    "转支",
    "转存",
    "转账",
    "消费",
    "现支",
    "现存",
    "网银转账",
    "掌上银行",
    "电子商务"
  ].includes(value.trim());
}

function normalizeComparableText(value: string): string {
  return value.trim().toLowerCase();
}

function containsAny(text: string, keywords: string[]): boolean {
  return keywords.some((keyword) => text.includes(keyword.toLowerCase()));
}

function normalizeDate(value: string): string {
  const compactMatch = /^(\d{4})(\d{2})(\d{2})$/.exec(value.trim());
  if (compactMatch) {
    return `${compactMatch[1]}-${compactMatch[2]}-${compactMatch[3]}`;
  }

  const match = /(\d{4})[/-](\d{1,2})[/-](\d{1,2})/.exec(value);
  if (!match) {
    return "";
  }

  return `${match[1]}-${match[2].padStart(2, "0")}-${match[3].padStart(2, "0")}`;
}

function resolveRecordDate(row: ParsedImportRow, provider: ImportProvider): string {
  const fieldNames =
    provider === "bank"
      ? ["交易日期", "记账日期", "date", "交易时间", "time"]
      : ["交易时间", "交易日期", "记账日期", "创建时间", "付款时间", "date", "time"];

  return normalizeDate(pickField(row, fieldNames) ?? "");
}

function stringifyRow(row: ParsedImportRow): string {
  return Object.values(row)
    .map((value) => String(value ?? "").trim())
    .filter(Boolean)
    .join(" · ");
}

interface StatProps {
  label: string;
  value: number;
}

function Stat({ label, value }: StatProps) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function filterDraftsByMonthRange(drafts: ImportRecordDraftDTO[], monthRange: ImportMonthRange): ImportRecordDraftDTO[] {
  const endDate = new Date();
  endDate.setHours(23, 59, 59, 999);
  const startDate = new Date(endDate.getFullYear(), endDate.getMonth() - monthRange, 1);
  startDate.setHours(0, 0, 0, 0);

  return drafts.filter((draft) => {
    const recordDate = parseRecordDate(draft.recordDate);
    return !recordDate || (recordDate >= startDate && recordDate <= endDate);
  });
}

function parseRecordDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    return null;
  }

  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

interface ImportProgressBarProps {
  progress: ImportProgressState;
}

function ImportProgressBar({ progress }: ImportProgressBarProps) {
  return (
    <View style={styles.progressBox}>
      <View style={styles.progressHeader}>
        <Text style={styles.progressLabel}>{progress.label}</Text>
        <Text style={styles.progressPercent}>{Math.round(progress.percent)}%</Text>
      </View>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progress.percent}%` }]} />
      </View>
    </View>
  );
}

function isAutoImportItem(item: ImportPreviewItem): boolean {
  return item.draft.status === "ready" && (item.draft.confidence ?? 0) >= 0.65;
}

function isSilentSkippedItem(item: ImportPreviewItem): boolean {
  return (
    item.draft.status === "skipped" &&
    ["transfer", "ignore", "confirmed_duplicate"].includes(String(item.draft.raw._importSkipReason ?? ""))
  );
}

function withImportTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error("IMPORT_PARSE_TIMEOUT"));
    }, timeoutMs);

    promise
      .then((value) => {
        clearTimeout(timeoutId);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timeoutId);
        reject(error);
      });
  });
}

function getImportFailureMessage(error: unknown): string {
  if (error instanceof Error && error.message === "IMPORT_PARSE_TIMEOUT") {
    return "PDF 解析超过 45 秒仍未完成，请确认文件是可复制文本的银行流水 PDF，或先换另一份 PDF 测试。";
  }

  if (error instanceof Error && error.message) {
    return `当前文件字段暂未适配或解析依赖加载失败：${error.message}`;
  }

  return "当前文件字段暂未适配；请确认微信导入 XLSX、支付宝导入 CSV。";
}

function getUploadButtonLabel(provider: ImportProvider): string {
  if (provider === "wechat") {
    return "选择微信 XLSX 账单文件";
  }

  if (provider === "alipay") {
    return "选择支付宝 CSV 账单文件";
  }

  return "选择账单文件";
}

const styles = StyleSheet.create({
  scroll: {
    paddingBottom: 36
  },
  card: {
    gap: 14,
    marginBottom: 14
  },
  cardTitle: {
    color: defaultTheme.text,
    fontSize: 17,
    fontWeight: "900"
  },
  uploadButton: {
    alignItems: "center",
    backgroundColor: defaultTheme.primary,
    borderRadius: 8,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    minHeight: 50
  },
  bankPresetPanel: {
    alignItems: "center",
    backgroundColor: "#F7FCFF",
    borderColor: "#DFF3FF",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    minHeight: 56,
    padding: 12
  },
  bankPresetTextBlock: {
    flex: 1,
    gap: 3
  },
  bankPresetTitle: {
    color: defaultTheme.muted,
    fontSize: 12,
    fontWeight: "900"
  },
  bankPresetText: {
    color: defaultTheme.text,
    fontSize: 14,
    fontWeight: "900"
  },
  rangePanel: {
    gap: 8
  },
  rangeLabel: {
    color: defaultTheme.muted,
    fontSize: 12,
    fontWeight: "900"
  },
  rangeOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  rangeOption: {
    alignItems: "center",
    backgroundColor: "#F7FCFF",
    borderColor: "#DFF3FF",
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 34,
    paddingHorizontal: 10
  },
  rangeOptionActive: {
    backgroundColor: defaultTheme.primary,
    borderColor: defaultTheme.primary
  },
  rangeText: {
    color: defaultTheme.muted,
    fontSize: 12,
    fontWeight: "900"
  },
  rangeTextActive: {
    color: "#FFFFFF"
  },
  uploadText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900"
  },
  fileBox: {
    alignItems: "center",
    backgroundColor: "#F7FCFF",
    borderRadius: 8,
    flexDirection: "row",
    gap: 10,
    padding: 12
  },
  fileText: {
    flex: 1,
    gap: 3
  },
  fileName: {
    color: defaultTheme.text,
    fontSize: 13,
    fontWeight: "900"
  },
  fileMeta: {
    color: defaultTheme.muted,
    fontSize: 12,
    fontWeight: "800"
  },
  progressBox: {
    backgroundColor: "#F7FCFF",
    borderColor: "#DFF3FF",
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
    padding: 12
  },
  progressHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between"
  },
  progressLabel: {
    color: defaultTheme.text,
    flex: 1,
    fontSize: 12,
    fontWeight: "900"
  },
  progressPercent: {
    color: defaultTheme.primary,
    fontSize: 12,
    fontWeight: "900"
  },
  progressTrack: {
    backgroundColor: "#E9F6FF",
    borderRadius: 999,
    height: 9,
    overflow: "hidden"
  },
  progressFill: {
    backgroundColor: defaultTheme.primary,
    borderRadius: 999,
    height: "100%"
  },
  loaderBox: {
    minHeight: 180,
    justifyContent: "center"
  },
  statsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 14
  },
  statCard: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: "#E7F5FF",
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    minHeight: 64,
    justifyContent: "center"
  },
  statValue: {
    color: defaultTheme.text,
    fontSize: 18,
    fontWeight: "900"
  },
  statLabel: {
    color: defaultTheme.muted,
    fontSize: 11,
    fontWeight: "900",
    marginTop: 3
  },
  sectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10
  },
  sectionTitle: {
    color: defaultTheme.text,
    fontSize: 18,
    fontWeight: "900"
  },
  sectionMeta: {
    color: defaultTheme.muted,
    fontSize: 12,
    fontWeight: "800"
  },
  confirmButton: {
    alignItems: "center",
    backgroundColor: defaultTheme.primary,
    borderRadius: 8,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    marginTop: 16,
    minHeight: 50
  },
  importedButton: {
    backgroundColor: "#42B992"
  },
  confirmText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900"
  },
  backButton: {
    alignItems: "center",
    alignSelf: "center",
    flexDirection: "row",
    gap: 6,
    marginTop: 16,
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  backText: {
    color: defaultTheme.muted,
    fontSize: 14,
    fontWeight: "900"
  }
});
