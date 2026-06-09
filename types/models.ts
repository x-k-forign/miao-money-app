export type RecordType = "income" | "expense";

export type RecordSource = "manual" | "subscription" | "import";

export type CategoryKind = RecordType;

export type CurrencyCode = "CNY" | "USD" | "EUR" | "JPY" | "HKD" | "GBP" | "KRW";

export type ThemeName = "lightBlue" | "sakuraPink" | "mintGreen" | "creamYellow" | "nightBlue";

export type ImportProvider = "wechat" | "alipay" | "bank";

export type ImportFileType = "csv" | "xls" | "xlsx" | "pdf";

export type ImportRowStatus = "pending" | "ready" | "error" | "duplicate" | "skipped" | "imported";

export type ClassificationRuleSource = "system" | "user";

export type BudgetPriority = "fixed" | "essential" | "transport" | "flexible" | "high_spend" | "other";

export interface CategorySeed {
  id: string;
  name: string;
  kind: CategoryKind;
  icon: string;
  color: string;
  sortOrder: number;
}

export interface CategoryDTO {
  id: string;
  name: string;
  kind: CategoryKind;
  icon: string;
  color: string;
  sortOrder: number;
}

export interface RecordDTO {
  id: string;
  type: RecordType;
  amountCents: number;
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  categoryColor: string;
  note: string;
  recordDate: string;
  source: RecordSource;
  subscriptionId?: string | null;
  importBatchId?: string | null;
  importProvider?: ImportProvider | null;
  externalTradeNo?: string | null;
  merchantName?: string | null;
  dedupeHash?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface SubscriptionDTO {
  id: string;
  name: string;
  type: RecordType;
  amountCents: number;
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  categoryColor: string;
  dayOfMonth: number;
  enabled: boolean;
  note: string;
  lastGeneratedMonth?: string | null;
  reminderDaysBefore?: number | null;
  reminderEnabled?: boolean;
  reminderTime?: string | null;
  lastRemindedMonth?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface MonthlySummaryDTO {
  incomeCents: number;
  expenseCents: number;
  balanceCents: number;
}

export interface CategoryShareDTO {
  amountCents: number;
  categoryColor: string;
  categoryIcon: string;
  categoryId: string;
  categoryName: string;
}

export interface TrendPointDTO {
  label: string;
  date?: string;
  month?: string;
  amountCents: number;
}

export interface ImportFileSelectionDTO {
  file?: File;
  fileType: ImportFileType;
  mimeType?: string;
  name: string;
  size?: number;
  uri: string;
}

export interface ImportRecordDraftDTO {
  amountCents: number;
  categoryId?: string;
  classificationTexts?: string[];
  confidence?: number;
  dedupeHash?: string;
  duplicateRecordId?: string;
  externalTradeNo?: string;
  importTemplate?: string;
  merchantName?: string;
  note: string;
  provider: ImportProvider;
  raw: Record<string, unknown>;
  recordDate: string;
  status: ImportRowStatus;
  type: RecordType;
}

export interface ImportBatchDTO {
  duplicateRows: number;
  errorRows: number;
  fileName: string;
  fileType: ImportFileType;
  id: string;
  importedRows: number;
  provider: ImportProvider;
  providerDetail?: string | null;
  readyRows: number;
  totalRows: number;
}

export interface ClassificationRuleDTO {
  categoryId: string;
  hitCount: number;
  id: string;
  keyword: string;
  lastHitAt?: string | null;
  matchType: string;
  priority: number;
  source: ClassificationRuleSource;
}

export interface BudgetAllocationDTO {
  id?: string;
  categoryId: string;
  categoryName: string;
  dailyBudgetCents: number;
  enabled?: boolean;
  monthlyBudgetCents: number;
  priority: BudgetPriority;
  spentCents: number;
  suggestion: string;
}

export interface MonthlyBudgetDTO {
  allocations: BudgetAllocationDTO[];
  availableBudgetCents: number;
  expectedIncomeCents: number;
  id: string;
  month: string;
  savingRate?: number | null;
  savingTargetCents?: number | null;
}
