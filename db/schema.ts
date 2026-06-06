import { sql } from "drizzle-orm";
import { check, index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import type { CategoryKind, CurrencyCode, RecordSource, RecordType, ThemeName } from "@/types/models";

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
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`)
  },
  (table) => [
    index("records_month_sort_idx").on(table.recordMonth, table.recordDate, table.createdAt),
    index("records_date_sort_idx").on(table.recordDate, table.createdAt),
    index("records_category_month_idx").on(table.categoryId, table.recordMonth),
    index("records_subscription_month_idx").on(table.subscriptionId, table.recordMonth, table.source),
    uniqueIndex("records_subscription_month_unique_idx")
      .on(table.subscriptionId, table.recordMonth, table.source)
      .where(sql`${table.source} = 'subscription' AND ${table.subscriptionId} IS NOT NULL`),
    check("records_type_check", sql`${table.type} IN ('income', 'expense')`),
    check("records_amount_positive_check", sql`${table.amountCents} > 0`),
    check("records_source_check", sql`${table.source} IN ('manual', 'subscription')`),
    check("records_date_format_check", sql`length(${table.recordDate}) = 10`),
    check("records_month_format_check", sql`length(${table.recordMonth}) = 7`),
    check("records_month_matches_date_check", sql`${table.recordMonth} = substr(${table.recordDate}, 1, 7)`),
    check(
      "records_subscription_source_check",
      sql`(${table.source} = 'subscription' AND ${table.subscriptionId} IS NOT NULL) OR ${table.source} = 'manual'`
    )
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
export type Subscription = typeof subscriptions.$inferSelect;
export type NewSubscription = typeof subscriptions.$inferInsert;
export type ExchangeRate = typeof exchangeRates.$inferSelect;
export type NewExchangeRate = typeof exchangeRates.$inferInsert;
export type AppSetting = typeof appSettings.$inferSelect;
export type NewAppSetting = typeof appSettings.$inferInsert;
