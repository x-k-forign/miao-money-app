export type RecordType = "income" | "expense";

export type RecordSource = "manual" | "subscription";

export type CategoryKind = RecordType;

export type CurrencyCode = "CNY" | "USD" | "EUR" | "JPY" | "HKD" | "GBP" | "KRW";

export type ThemeName = "lightBlue" | "sakuraPink" | "mintGreen" | "creamYellow" | "nightBlue";

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
