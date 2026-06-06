import { sqlite } from "@/db/client";

let initialized = false;

export async function initializeDatabase(): Promise<void> {
  if (initialized) {
    return;
  }

  await sqlite.execAsync(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      kind TEXT NOT NULL,
      icon TEXT NOT NULL,
      color TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_system INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT categories_kind_check CHECK (kind IN ('income', 'expense')),
      CONSTRAINT categories_is_system_check CHECK (is_system IN (0, 1))
    );

    CREATE UNIQUE INDEX IF NOT EXISTS categories_kind_name_idx
      ON categories(kind, name);

    CREATE INDEX IF NOT EXISTS categories_kind_sort_idx
      ON categories(kind, sort_order);

    CREATE TABLE IF NOT EXISTS subscriptions (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      amount_cents INTEGER NOT NULL,
      category_id TEXT NOT NULL REFERENCES categories(id),
      day_of_month INTEGER NOT NULL,
      enabled INTEGER NOT NULL DEFAULT 1,
      note TEXT,
      last_generated_month TEXT,
      reminder_enabled INTEGER NOT NULL DEFAULT 0,
      reminder_days_before INTEGER,
      reminder_time TEXT,
      last_reminded_month TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT subscriptions_type_check CHECK (type IN ('income', 'expense')),
      CONSTRAINT subscriptions_amount_positive_check CHECK (amount_cents > 0),
      CONSTRAINT subscriptions_day_of_month_check CHECK (day_of_month BETWEEN 1 AND 28),
      CONSTRAINT subscriptions_enabled_check CHECK (enabled IN (0, 1)),
      CONSTRAINT subscriptions_reminder_enabled_check CHECK (reminder_enabled IN (0, 1)),
      CONSTRAINT subscriptions_reminder_days_check CHECK (
        reminder_days_before IS NULL OR reminder_days_before BETWEEN 0 AND 28
      )
    );

    CREATE INDEX IF NOT EXISTS subscriptions_enabled_day_idx
      ON subscriptions(enabled, day_of_month);

    CREATE INDEX IF NOT EXISTS subscriptions_category_idx
      ON subscriptions(category_id);

    CREATE TABLE IF NOT EXISTS records (
      id TEXT PRIMARY KEY NOT NULL,
      type TEXT NOT NULL,
      amount_cents INTEGER NOT NULL,
      category_id TEXT NOT NULL REFERENCES categories(id),
      note TEXT,
      record_date TEXT NOT NULL,
      record_month TEXT NOT NULL,
      source TEXT NOT NULL DEFAULT 'manual',
      subscription_id TEXT REFERENCES subscriptions(id) ON DELETE SET NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT records_type_check CHECK (type IN ('income', 'expense')),
      CONSTRAINT records_amount_positive_check CHECK (amount_cents > 0),
      CONSTRAINT records_source_check CHECK (source IN ('manual', 'subscription')),
      CONSTRAINT records_date_format_check CHECK (length(record_date) = 10),
      CONSTRAINT records_month_format_check CHECK (length(record_month) = 7),
      CONSTRAINT records_month_matches_date_check CHECK (record_month = substr(record_date, 1, 7)),
      CONSTRAINT records_subscription_source_check CHECK (
        (source = 'subscription' AND subscription_id IS NOT NULL) OR source = 'manual'
      )
    );

    CREATE INDEX IF NOT EXISTS records_month_sort_idx
      ON records(record_month, record_date, created_at);

    CREATE INDEX IF NOT EXISTS records_date_sort_idx
      ON records(record_date, created_at);

    CREATE INDEX IF NOT EXISTS records_category_month_idx
      ON records(category_id, record_month);

    CREATE INDEX IF NOT EXISTS records_subscription_month_idx
      ON records(subscription_id, record_month, source);

    CREATE UNIQUE INDEX IF NOT EXISTS records_subscription_month_unique_idx
      ON records(subscription_id, record_month, source)
      WHERE source = 'subscription' AND subscription_id IS NOT NULL;

    CREATE TABLE IF NOT EXISTS exchange_rates (
      id TEXT PRIMARY KEY NOT NULL,
      base_currency TEXT NOT NULL,
      target_currency TEXT NOT NULL,
      rate TEXT NOT NULL,
      rate_date TEXT NOT NULL,
      fetched_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT exchange_rates_currency_check CHECK (
        base_currency IN ('CNY', 'USD', 'EUR', 'JPY', 'HKD', 'GBP', 'KRW')
        AND target_currency IN ('CNY', 'USD', 'EUR', 'JPY', 'HKD', 'GBP', 'KRW')
      ),
      CONSTRAINT exchange_rates_pair_check CHECK (base_currency <> target_currency),
      CONSTRAINT exchange_rates_rate_positive_check CHECK (CAST(rate AS REAL) > 0),
      CONSTRAINT exchange_rates_date_format_check CHECK (length(rate_date) = 10)
    );

    CREATE UNIQUE INDEX IF NOT EXISTS exchange_rates_currency_date_idx
      ON exchange_rates(base_currency, target_currency, rate_date);

    CREATE INDEX IF NOT EXISTS exchange_rates_latest_idx
      ON exchange_rates(base_currency, target_currency, rate_date);

    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL,
      value_type TEXT NOT NULL DEFAULT 'string',
      theme_name TEXT,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT app_settings_value_type_check CHECK (value_type IN ('string', 'number', 'boolean', 'json')),
      CONSTRAINT app_settings_theme_name_check CHECK (
        theme_name IS NULL
        OR theme_name IN ('lightBlue', 'sakuraPink', 'mintGreen', 'creamYellow', 'nightBlue')
      )
    );
  `);

  initialized = true;
}
