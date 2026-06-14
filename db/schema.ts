import { sql } from "drizzle-orm";
import { check, index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import type {
  BudgetPriority,
  CategoryKind,
  ClassificationRuleSource,
  CurrencyCode,
  ImportFileType,
  ImportProvider,
  ImportRowStatus,
  ImportTransactionKind,
  RecordSource,
  RecordType,
  ThemeName
} from "@/types/models";

export const categories = sqliteTable(
  "categories",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    kind: text("kind").$type<CategoryKind>().notNull(),
    icon: text("icon").notNull(),
    color: text("color").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    isSystem: integer("is_system", { mode: "boolean" }).notNull().default(true),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`)
  },
  (table) => [
    uniqueIndex("categories_kind_name_idx").on(table.kind, table.name),
    index("categories_kind_sort_idx").on(table.kind, table.sortOrder),
    check("categories_kind_check", sql`${table.kind} IN ('income', 'expense')`),
    check("categories_is_system_check", sql`${table.isSystem} IN (0, 1)`)
  ]
);

export const subscriptions = sqliteTable(
  "subscriptions",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    type: text("type").$type<RecordType>().notNull(),
    amountCents: integer("amount_cents").notNull(),
    categoryId: text("category_id")
      .notNull()
      .references(() => categories.id),
    dayOfMonth: integer("day_of_month").notNull(),
    enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
    note: text("note"),
    lastGeneratedMonth: text("last_generated_month"),
    reminderEnabled: integer("reminder_enabled", { mode: "boolean" }).notNull().default(false),
    reminderDaysBefore: integer("reminder_days_before"),
    reminderTime: text("reminder_time"),
    lastRemindedMonth: text("last_reminded_month"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`)
  },
  (table) => [
    index("subscriptions_enabled_day_idx").on(table.enabled, table.dayOfMonth),
    index("subscriptions_category_idx").on(table.categoryId),
    check("subscriptions_type_check", sql`${table.type} IN ('income', 'expense')`),
    check("subscriptions_amount_positive_check", sql`${table.amountCents} > 0`),
    check("subscriptions_day_of_month_check", sql`${table.dayOfMonth} BETWEEN 1 AND 28`),
    check("subscriptions_enabled_check", sql`${table.enabled} IN (0, 1)`),
    check("subscriptions_reminder_enabled_check", sql`${table.reminderEnabled} IN (0, 1)`),
    check(
      "subscriptions_reminder_days_check",
      sql`${table.reminderDaysBefore} IS NULL OR ${table.reminderDaysBefore} BETWEEN 0 AND 28`
    )
  ]
);

export const records = sqliteTable(
  "records",
  {
    id: text("id").primaryKey(),
    type: text("type").$type<RecordType>().notNull(),
    amountCents: integer("amount_cents").notNull(),
    categoryId: text("category_id")
      .notNull()
      .references(() => categories.id),
    note: text("note"),
    recordDate: text("record_date").notNull(),
    recordMonth: text("record_month").notNull(),
    source: text("source").$type<RecordSource>().notNull().default("manual"),
    subscriptionId: text("subscription_id").references(() => subscriptions.id, { onDelete: "set null" }),
    importBatchId: text("import_batch_id"),
    importProvider: text("import_provider").$type<ImportProvider>(),
    externalTradeNo: text("external_trade_no"),
    merchantOrderNo: text("merchant_order_no"),
    merchantName: text("merchant_name"),
    dedupeHash: text("dedupe_hash"),
    transactionKind: text("transaction_kind").$type<ImportTransactionKind>(),
    relatedRecordId: text("related_record_id"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`)
  },
  (table) => [
    index("records_month_sort_idx").on(table.recordMonth, table.recordDate, table.createdAt),
    index("records_date_sort_idx").on(table.recordDate, table.createdAt),
    index("records_category_month_idx").on(table.categoryId, table.recordMonth),
    index("records_subscription_month_idx").on(table.subscriptionId, table.recordMonth, table.source),
    index("records_import_batch_idx").on(table.importBatchId),
    index("records_import_provider_trade_idx").on(table.importProvider, table.externalTradeNo),
    index("records_import_provider_merchant_order_idx").on(table.importProvider, table.merchantOrderNo),
    index("records_dedupe_hash_idx").on(table.dedupeHash),
    index("records_related_record_idx").on(table.relatedRecordId),
    uniqueIndex("records_subscription_month_unique_idx")
      .on(table.subscriptionId, table.recordMonth, table.source)
      .where(sql`${table.source} = 'subscription' AND ${table.subscriptionId} IS NOT NULL`),
    uniqueIndex("records_import_trade_unique_idx")
      .on(table.importProvider, table.externalTradeNo, table.transactionKind)
      .where(sql`${table.source} = 'import' AND ${table.importProvider} IS NOT NULL AND ${table.externalTradeNo} IS NOT NULL`),
    uniqueIndex("records_dedupe_hash_unique_idx")
      .on(table.dedupeHash)
      .where(sql`${table.source} = 'import' AND ${table.dedupeHash} IS NOT NULL`),
    check("records_type_check", sql`${table.type} IN ('income', 'expense')`),
    check("records_amount_positive_check", sql`${table.amountCents} > 0`),
    check("records_source_check", sql`${table.source} IN ('manual', 'subscription', 'import')`),
    check("records_date_format_check", sql`length(${table.recordDate}) = 10`),
    check("records_month_format_check", sql`length(${table.recordMonth}) = 7`),
    check("records_month_matches_date_check", sql`${table.recordMonth} = substr(${table.recordDate}, 1, 7)`),
    check(
      "records_subscription_source_check",
      sql`(${table.source} = 'subscription' AND ${table.subscriptionId} IS NOT NULL)
        OR (${table.source} IN ('manual', 'import'))`
    ),
    check(
      "records_import_source_check",
      sql`${table.source} <> 'import' OR ${table.importProvider} IN ('wechat', 'alipay', 'bank')`
    ),
    check(
      "records_transaction_kind_check",
      sql`${table.transactionKind} IS NULL OR ${table.transactionKind} IN ('expense', 'income', 'transfer', 'refund', 'ignore')`
    )
  ]
);

export const importBatches = sqliteTable(
  "import_batches",
  {
    id: text("id").primaryKey(),
    provider: text("provider").$type<ImportProvider>().notNull(),
    providerDetail: text("provider_detail"),
    fileName: text("file_name").notNull(),
    fileType: text("file_type").$type<ImportFileType>().notNull(),
    totalRows: integer("total_rows").notNull().default(0),
    readyRows: integer("ready_rows").notNull().default(0),
    errorRows: integer("error_rows").notNull().default(0),
    duplicateRows: integer("duplicate_rows").notNull().default(0),
    importedRows: integer("imported_rows").notNull().default(0),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`)
  },
  (table) => [
    index("import_batches_provider_created_idx").on(table.provider, table.createdAt),
    check("import_batches_provider_check", sql`${table.provider} IN ('wechat', 'alipay', 'bank')`),
    check("import_batches_file_type_check", sql`${table.fileType} IN ('csv', 'xls', 'xlsx', 'pdf')`)
  ]
);

export const importRows = sqliteTable(
  "import_rows",
  {
    id: text("id").primaryKey(),
    batchId: text("batch_id")
      .notNull()
      .references(() => importBatches.id, { onDelete: "cascade" }),
    rawJson: text("raw_json").notNull(),
    status: text("status").$type<ImportRowStatus>().notNull().default("pending"),
    type: text("type").$type<RecordType>().notNull(),
    amountCents: integer("amount_cents").notNull(),
    recordDate: text("record_date").notNull(),
    merchantName: text("merchant_name"),
    externalTradeNo: text("external_trade_no"),
    merchantOrderNo: text("merchant_order_no"),
    note: text("note"),
    categoryId: text("category_id").references(() => categories.id),
    confidence: integer("confidence").notNull().default(0),
    duplicateRecordId: text("duplicate_record_id").references(() => records.id, { onDelete: "set null" }),
    dedupeHash: text("dedupe_hash"),
    transactionKind: text("transaction_kind").$type<ImportTransactionKind>().notNull(),
    errorMessage: text("error_message"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`)
  },
  (table) => [
    index("import_rows_batch_status_idx").on(table.batchId, table.status),
    index("import_rows_trade_idx").on(table.externalTradeNo),
    index("import_rows_merchant_order_idx").on(table.merchantOrderNo),
    index("import_rows_dedupe_hash_idx").on(table.dedupeHash),
    check(
      "import_rows_status_check",
      sql`${table.status} IN ('pending', 'ready', 'error', 'duplicate', 'skipped', 'imported')`
    ),
    check("import_rows_type_check", sql`${table.type} IN ('income', 'expense')`),
    check(
      "import_rows_transaction_kind_check",
      sql`${table.transactionKind} IN ('expense', 'income', 'transfer', 'refund', 'ignore')`
    ),
    check("import_rows_amount_nonnegative_check", sql`${table.amountCents} >= 0`),
    check("import_rows_confidence_check", sql`${table.confidence} BETWEEN 0 AND 100`)
  ]
);

export const classificationRules = sqliteTable(
  "classification_rules",
  {
    id: text("id").primaryKey(),
    keyword: text("keyword").notNull(),
    matchType: text("match_type").notNull().default("contains"),
    categoryId: text("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
    source: text("source").$type<ClassificationRuleSource>().notNull(),
    priority: integer("priority").notNull().default(0),
    hitCount: integer("hit_count").notNull().default(0),
    lastHitAt: text("last_hit_at"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`)
  },
  (table) => [
    uniqueIndex("classification_rules_keyword_category_source_idx").on(
      table.keyword,
      table.categoryId,
      table.source
    ),
    index("classification_rules_priority_idx").on(table.source, table.priority),
    check("classification_rules_source_check", sql`${table.source} IN ('system', 'user')`),
    check("classification_rules_match_type_check", sql`${table.matchType} IN ('contains', 'exact')`)
  ]
);

export const monthlyBudgets = sqliteTable(
  "monthly_budgets",
  {
    id: text("id").primaryKey(),
    month: text("month").notNull(),
    expectedIncomeCents: integer("expected_income_cents").notNull(),
    savingRate: integer("saving_rate"),
    savingTargetCents: integer("saving_target_cents"),
    availableBudgetCents: integer("available_budget_cents").notNull(),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`)
  },
  (table) => [
    uniqueIndex("monthly_budgets_month_idx").on(table.month),
    check("monthly_budgets_month_format_check", sql`length(${table.month}) = 7`),
    check("monthly_budgets_income_nonnegative_check", sql`${table.expectedIncomeCents} >= 0`),
    check(
      "monthly_budgets_saving_rate_check",
      sql`${table.savingRate} IS NULL OR ${table.savingRate} BETWEEN 0 AND 10000`
    )
  ]
);

export const budgetAllocations = sqliteTable(
  "budget_allocations",
  {
    id: text("id").primaryKey(),
    budgetId: text("budget_id")
      .notNull()
      .references(() => monthlyBudgets.id, { onDelete: "cascade" }),
    categoryId: text("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
    priority: text("priority").$type<BudgetPriority>().notNull(),
    monthlyBudgetCents: integer("monthly_budget_cents").notNull(),
    dailyBudgetCents: integer("daily_budget_cents").notNull(),
    spentCents: integer("spent_cents").notNull().default(0),
    suggestion: text("suggestion").notNull().default(""),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`)
  },
  (table) => [
    uniqueIndex("budget_allocations_budget_category_idx").on(table.budgetId, table.categoryId),
    index("budget_allocations_budget_idx").on(table.budgetId),
    check(
      "budget_allocations_priority_check",
      sql`${table.priority} IN ('fixed', 'essential', 'transport', 'flexible', 'high_spend', 'other')`
    ),
    check("budget_allocations_monthly_nonnegative_check", sql`${table.monthlyBudgetCents} >= 0`),
    check("budget_allocations_daily_nonnegative_check", sql`${table.dailyBudgetCents} >= 0`),
    check("budget_allocations_spent_nonnegative_check", sql`${table.spentCents} >= 0`)
  ]
);

export const exchangeRates = sqliteTable(
  "exchange_rates",
  {
    id: text("id").primaryKey(),
    baseCurrency: text("base_currency").$type<CurrencyCode>().notNull(),
    targetCurrency: text("target_currency").$type<CurrencyCode>().notNull(),
    rate: text("rate").notNull(),
    rateDate: text("rate_date").notNull(),
    fetchedAt: text("fetched_at").notNull().default(sql`CURRENT_TIMESTAMP`)
  },
  (table) => [
    uniqueIndex("exchange_rates_currency_date_idx").on(
      table.baseCurrency,
      table.targetCurrency,
      table.rateDate
    ),
    index("exchange_rates_latest_idx").on(table.baseCurrency, table.targetCurrency, table.rateDate),
    check(
      "exchange_rates_currency_check",
      sql`${table.baseCurrency} IN ('CNY', 'USD', 'EUR', 'JPY', 'HKD', 'GBP', 'KRW')
        AND ${table.targetCurrency} IN ('CNY', 'USD', 'EUR', 'JPY', 'HKD', 'GBP', 'KRW')`
    ),
    check("exchange_rates_pair_check", sql`${table.baseCurrency} <> ${table.targetCurrency}`),
    check("exchange_rates_rate_positive_check", sql`CAST(${table.rate} AS REAL) > 0`),
    check("exchange_rates_date_format_check", sql`length(${table.rateDate}) = 10`)
  ]
);

export const appSettings = sqliteTable(
  "app_settings",
  {
    key: text("key").primaryKey(),
    value: text("value").notNull(),
    valueType: text("value_type").notNull().default("string"),
    themeName: text("theme_name").$type<ThemeName>(),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`)
  },
  (table) => [
    check("app_settings_value_type_check", sql`${table.valueType} IN ('string', 'number', 'boolean', 'json')`),
    check(
      "app_settings_theme_name_check",
      sql`${table.themeName} IS NULL OR ${table.themeName} IN ('lightBlue', 'sakuraPink', 'mintGreen', 'creamYellow', 'nightBlue')`
    )
  ]
);

export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;
export type RecordRow = typeof records.$inferSelect;
export type NewRecordRow = typeof records.$inferInsert;
export type ImportBatch = typeof importBatches.$inferSelect;
export type NewImportBatch = typeof importBatches.$inferInsert;
export type ImportRow = typeof importRows.$inferSelect;
export type NewImportRow = typeof importRows.$inferInsert;
export type ClassificationRule = typeof classificationRules.$inferSelect;
export type NewClassificationRule = typeof classificationRules.$inferInsert;
export type MonthlyBudget = typeof monthlyBudgets.$inferSelect;
export type NewMonthlyBudget = typeof monthlyBudgets.$inferInsert;
export type BudgetAllocation = typeof budgetAllocations.$inferSelect;
export type NewBudgetAllocation = typeof budgetAllocations.$inferInsert;
export type Subscription = typeof subscriptions.$inferSelect;
export type NewSubscription = typeof subscriptions.$inferInsert;
export type ExchangeRate = typeof exchangeRates.$inferSelect;
export type NewExchangeRate = typeof exchangeRates.$inferInsert;
export type AppSetting = typeof appSettings.$inferSelect;
export type NewAppSetting = typeof appSettings.$inferInsert;
