import { sqlite } from "@/db/client";

let initialized = false;
let initializationPromise: Promise<void> | null = null;

export async function initializeDatabase(): Promise<void> {
  if (initialized) {
    return;
  }

  if (!initializationPromise) {
    initializationPromise = runDatabaseInitialization()
      .then(() => {
        initialized = true;
      })
      .finally(() => {
        initializationPromise = null;
      });
  }

  return initializationPromise;
}

async function runDatabaseInitialization(): Promise<void> {
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
      import_batch_id TEXT,
      import_provider TEXT,
      external_trade_no TEXT,
      merchant_order_no TEXT,
      merchant_name TEXT,
      dedupe_hash TEXT,
      transaction_kind TEXT,
      related_record_id TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT records_type_check CHECK (type IN ('income', 'expense')),
      CONSTRAINT records_amount_positive_check CHECK (amount_cents > 0),
      CONSTRAINT records_source_check CHECK (source IN ('manual', 'subscription', 'import')),
      CONSTRAINT records_date_format_check CHECK (length(record_date) = 10),
      CONSTRAINT records_month_format_check CHECK (length(record_month) = 7),
      CONSTRAINT records_month_matches_date_check CHECK (record_month = substr(record_date, 1, 7)),
      CONSTRAINT records_subscription_source_check CHECK (
        (source = 'subscription' AND subscription_id IS NOT NULL)
        OR source IN ('manual', 'import')
      ),
      CONSTRAINT records_import_source_check CHECK (
        source <> 'import' OR import_provider IN ('wechat', 'alipay', 'bank')
      ),
      CONSTRAINT records_transaction_kind_check CHECK (
        transaction_kind IS NULL OR transaction_kind IN ('expense', 'income', 'transfer', 'refund', 'ignore')
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

    CREATE TABLE IF NOT EXISTS import_batches (
      id TEXT PRIMARY KEY NOT NULL,
      provider TEXT NOT NULL,
      provider_detail TEXT,
      file_name TEXT NOT NULL,
      file_type TEXT NOT NULL,
      total_rows INTEGER NOT NULL DEFAULT 0,
      ready_rows INTEGER NOT NULL DEFAULT 0,
      error_rows INTEGER NOT NULL DEFAULT 0,
      duplicate_rows INTEGER NOT NULL DEFAULT 0,
      imported_rows INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT import_batches_provider_check CHECK (provider IN ('wechat', 'alipay', 'bank')),
      CONSTRAINT import_batches_file_type_check CHECK (file_type IN ('csv', 'xls', 'xlsx', 'pdf'))
    );

    CREATE INDEX IF NOT EXISTS import_batches_provider_created_idx
      ON import_batches(provider, created_at);

    CREATE TABLE IF NOT EXISTS import_rows (
      id TEXT PRIMARY KEY NOT NULL,
      batch_id TEXT NOT NULL REFERENCES import_batches(id) ON DELETE CASCADE,
      raw_json TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      type TEXT NOT NULL,
      amount_cents INTEGER NOT NULL,
      record_date TEXT NOT NULL,
      merchant_name TEXT,
      external_trade_no TEXT,
      merchant_order_no TEXT,
      note TEXT,
      category_id TEXT REFERENCES categories(id),
      confidence INTEGER NOT NULL DEFAULT 0,
      duplicate_record_id TEXT REFERENCES records(id) ON DELETE SET NULL,
      dedupe_hash TEXT,
      transaction_kind TEXT NOT NULL,
      error_message TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT import_rows_status_check CHECK (status IN ('pending', 'ready', 'error', 'duplicate', 'skipped', 'imported')),
      CONSTRAINT import_rows_type_check CHECK (type IN ('income', 'expense')),
      CONSTRAINT import_rows_transaction_kind_check CHECK (
        transaction_kind IN ('expense', 'income', 'transfer', 'refund', 'ignore')
      ),
      CONSTRAINT import_rows_amount_nonnegative_check CHECK (amount_cents >= 0),
      CONSTRAINT import_rows_confidence_check CHECK (confidence BETWEEN 0 AND 100)
    );

    CREATE INDEX IF NOT EXISTS import_rows_batch_status_idx
      ON import_rows(batch_id, status);

    CREATE INDEX IF NOT EXISTS import_rows_trade_idx
      ON import_rows(external_trade_no);

    CREATE INDEX IF NOT EXISTS import_rows_dedupe_hash_idx
      ON import_rows(dedupe_hash);

    CREATE TABLE IF NOT EXISTS classification_rules (
      id TEXT PRIMARY KEY NOT NULL,
      keyword TEXT NOT NULL,
      match_type TEXT NOT NULL DEFAULT 'contains',
      category_id TEXT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
      source TEXT NOT NULL,
      priority INTEGER NOT NULL DEFAULT 0,
      hit_count INTEGER NOT NULL DEFAULT 0,
      last_hit_at TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT classification_rules_source_check CHECK (source IN ('system', 'user')),
      CONSTRAINT classification_rules_match_type_check CHECK (match_type IN ('contains', 'exact'))
    );

    CREATE UNIQUE INDEX IF NOT EXISTS classification_rules_keyword_category_source_idx
      ON classification_rules(keyword, category_id, source);

    CREATE INDEX IF NOT EXISTS classification_rules_priority_idx
      ON classification_rules(source, priority);

    CREATE TABLE IF NOT EXISTS monthly_budgets (
      id TEXT PRIMARY KEY NOT NULL,
      month TEXT NOT NULL,
      expected_income_cents INTEGER NOT NULL,
      saving_rate INTEGER,
      saving_target_cents INTEGER,
      available_budget_cents INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT monthly_budgets_month_format_check CHECK (length(month) = 7),
      CONSTRAINT monthly_budgets_income_nonnegative_check CHECK (expected_income_cents >= 0),
      CONSTRAINT monthly_budgets_saving_rate_check CHECK (saving_rate IS NULL OR saving_rate BETWEEN 0 AND 10000)
    );

    CREATE UNIQUE INDEX IF NOT EXISTS monthly_budgets_month_idx
      ON monthly_budgets(month);

    CREATE TABLE IF NOT EXISTS budget_allocations (
      id TEXT PRIMARY KEY NOT NULL,
      budget_id TEXT NOT NULL REFERENCES monthly_budgets(id) ON DELETE CASCADE,
      category_id TEXT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
      priority TEXT NOT NULL,
      monthly_budget_cents INTEGER NOT NULL,
      daily_budget_cents INTEGER NOT NULL,
      spent_cents INTEGER NOT NULL DEFAULT 0,
      suggestion TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT budget_allocations_priority_check CHECK (priority IN ('fixed', 'essential', 'transport', 'flexible', 'high_spend', 'other')),
      CONSTRAINT budget_allocations_monthly_nonnegative_check CHECK (monthly_budget_cents >= 0),
      CONSTRAINT budget_allocations_daily_nonnegative_check CHECK (daily_budget_cents >= 0),
      CONSTRAINT budget_allocations_spent_nonnegative_check CHECK (spent_cents >= 0)
    );

    CREATE UNIQUE INDEX IF NOT EXISTS budget_allocations_budget_category_idx
      ON budget_allocations(budget_id, category_id);

    CREATE INDEX IF NOT EXISTS budget_allocations_budget_idx
      ON budget_allocations(budget_id);

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

  await migrateRecordsForImportSupport();
  await verifyDatabaseSchema();
}

async function migrateRecordsForImportSupport(): Promise<void> {
  const [recordTable] = await sqlite.getAllAsync<{ sql: string | null }>(
    "SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'records'"
  );
  const tableSql = recordTable?.sql ?? "";
  const columns = await sqlite.getAllAsync<{ name: string }>("PRAGMA table_info(records)");
  const columnNames = new Set(columns.map((column) => column.name));

  if (!columnNames.has("import_batch_id")) {
    await sqlite.execAsync("ALTER TABLE records ADD COLUMN import_batch_id TEXT;");
  }

  if (!columnNames.has("import_provider")) {
    await sqlite.execAsync("ALTER TABLE records ADD COLUMN import_provider TEXT;");
  }

  if (!columnNames.has("external_trade_no")) {
    await sqlite.execAsync("ALTER TABLE records ADD COLUMN external_trade_no TEXT;");
  }

  if (!columnNames.has("merchant_name")) {
    await sqlite.execAsync("ALTER TABLE records ADD COLUMN merchant_name TEXT;");
  }

  if (!columnNames.has("merchant_order_no")) {
    await sqlite.execAsync("ALTER TABLE records ADD COLUMN merchant_order_no TEXT;");
  }

  if (!columnNames.has("dedupe_hash")) {
    await sqlite.execAsync("ALTER TABLE records ADD COLUMN dedupe_hash TEXT;");
  }

  if (!columnNames.has("transaction_kind")) {
    await sqlite.execAsync("ALTER TABLE records ADD COLUMN transaction_kind TEXT;");
  }
  await sqlite.execAsync("UPDATE records SET transaction_kind = type WHERE transaction_kind IS NULL;");

  if (!columnNames.has("related_record_id")) {
    await sqlite.execAsync("ALTER TABLE records ADD COLUMN related_record_id TEXT;");
  }

  await migrateImportRowsForTransactionKinds();

  if (tableSql.includes("'import'") || !tableSql.includes("records_source_check")) {
    await ensureRecordImportIndexes();
    return;
  }

  const backupTableName = `records_backup_before_import_${Date.now()}`;

  await sqlite.execAsync(`
    PRAGMA foreign_keys = OFF;
    BEGIN TRANSACTION;

    DROP INDEX IF EXISTS records_month_sort_idx;
    DROP INDEX IF EXISTS records_date_sort_idx;
    DROP INDEX IF EXISTS records_category_month_idx;
    DROP INDEX IF EXISTS records_subscription_month_idx;
    DROP INDEX IF EXISTS records_import_batch_idx;
    DROP INDEX IF EXISTS records_import_provider_trade_idx;
    DROP INDEX IF EXISTS records_dedupe_hash_idx;
    DROP INDEX IF EXISTS records_subscription_month_unique_idx;
    DROP INDEX IF EXISTS records_import_trade_unique_idx;
    DROP INDEX IF EXISTS records_dedupe_hash_unique_idx;

    ALTER TABLE records RENAME TO ${backupTableName};

    CREATE TABLE records (
      id TEXT PRIMARY KEY NOT NULL,
      type TEXT NOT NULL,
      amount_cents INTEGER NOT NULL,
      category_id TEXT NOT NULL REFERENCES categories(id),
      note TEXT,
      record_date TEXT NOT NULL,
      record_month TEXT NOT NULL,
      source TEXT NOT NULL DEFAULT 'manual',
      subscription_id TEXT REFERENCES subscriptions(id) ON DELETE SET NULL,
      import_batch_id TEXT,
      import_provider TEXT,
      external_trade_no TEXT,
      merchant_order_no TEXT,
      merchant_name TEXT,
      dedupe_hash TEXT,
      transaction_kind TEXT,
      related_record_id TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT records_type_check CHECK (type IN ('income', 'expense')),
      CONSTRAINT records_amount_positive_check CHECK (amount_cents > 0),
      CONSTRAINT records_source_check CHECK (source IN ('manual', 'subscription', 'import')),
      CONSTRAINT records_date_format_check CHECK (length(record_date) = 10),
      CONSTRAINT records_month_format_check CHECK (length(record_month) = 7),
      CONSTRAINT records_month_matches_date_check CHECK (record_month = substr(record_date, 1, 7)),
      CONSTRAINT records_subscription_source_check CHECK (
        (source = 'subscription' AND subscription_id IS NOT NULL)
        OR source IN ('manual', 'import')
      ),
      CONSTRAINT records_import_source_check CHECK (
        source <> 'import' OR import_provider IN ('wechat', 'alipay', 'bank')
      ),
      CONSTRAINT records_transaction_kind_check CHECK (
        transaction_kind IS NULL OR transaction_kind IN ('expense', 'income', 'transfer', 'refund', 'ignore')
      )
    );

    INSERT OR IGNORE INTO records (
      id,
      type,
      amount_cents,
      category_id,
      note,
      record_date,
      record_month,
      source,
      subscription_id,
      import_batch_id,
      import_provider,
      external_trade_no,
      merchant_order_no,
      merchant_name,
      dedupe_hash,
      transaction_kind,
      related_record_id,
      created_at,
      updated_at
    )
    SELECT
      id,
      type,
      amount_cents,
      category_id,
      note,
      record_date,
      record_month,
      source,
      subscription_id,
      import_batch_id,
      import_provider,
      external_trade_no,
      merchant_order_no,
      merchant_name,
      dedupe_hash,
      COALESCE(transaction_kind, type),
      related_record_id,
      created_at,
      updated_at
    FROM ${backupTableName};

    COMMIT;
    PRAGMA foreign_keys = ON;
  `);

  await ensureRecordImportIndexes();
}

async function ensureRecordImportIndexes(): Promise<void> {
  await sqlite.execAsync(`
    CREATE INDEX IF NOT EXISTS records_month_sort_idx
      ON records(record_month, record_date, created_at);

    CREATE INDEX IF NOT EXISTS records_date_sort_idx
      ON records(record_date, created_at);

    CREATE INDEX IF NOT EXISTS records_category_month_idx
      ON records(category_id, record_month);

    CREATE INDEX IF NOT EXISTS records_subscription_month_idx
      ON records(subscription_id, record_month, source);

    CREATE INDEX IF NOT EXISTS records_import_batch_idx
      ON records(import_batch_id);

    CREATE INDEX IF NOT EXISTS records_import_provider_trade_idx
      ON records(import_provider, external_trade_no);

    CREATE INDEX IF NOT EXISTS records_import_provider_merchant_order_idx
      ON records(import_provider, merchant_order_no);

    CREATE INDEX IF NOT EXISTS records_dedupe_hash_idx
      ON records(dedupe_hash);

    CREATE INDEX IF NOT EXISTS records_related_record_idx
      ON records(related_record_id);

    CREATE UNIQUE INDEX IF NOT EXISTS records_subscription_month_unique_idx
      ON records(subscription_id, record_month, source)
      WHERE source = 'subscription' AND subscription_id IS NOT NULL;

    DROP INDEX IF EXISTS records_import_trade_unique_idx;
  `);

  const duplicateTrade = await sqlite.getFirstAsync<{ present: number }>(`
    SELECT 1 AS present
    FROM records
    WHERE source = 'import'
      AND import_provider IS NOT NULL
      AND external_trade_no IS NOT NULL
    GROUP BY import_provider, external_trade_no, transaction_kind
    HAVING COUNT(*) > 1
    LIMIT 1;
  `);
  if (duplicateTrade) {
    await sqlite.execAsync(`
      CREATE INDEX IF NOT EXISTS records_import_trade_lookup_idx
        ON records(import_provider, external_trade_no, transaction_kind);
    `);
  } else {
    await sqlite.execAsync(`
      DROP INDEX IF EXISTS records_import_trade_lookup_idx;
      CREATE UNIQUE INDEX IF NOT EXISTS records_import_trade_unique_idx
        ON records(import_provider, external_trade_no, transaction_kind)
        WHERE source = 'import' AND import_provider IS NOT NULL AND external_trade_no IS NOT NULL;
    `);
  }

  const duplicateHash = await sqlite.getFirstAsync<{ present: number }>(`
    SELECT 1 AS present
    FROM records
    WHERE source = 'import' AND dedupe_hash IS NOT NULL
    GROUP BY dedupe_hash
    HAVING COUNT(*) > 1
    LIMIT 1;
  `);
  if (duplicateHash) {
    await sqlite.execAsync(`
      DROP INDEX IF EXISTS records_dedupe_hash_unique_idx;
      CREATE INDEX IF NOT EXISTS records_dedupe_hash_lookup_idx
        ON records(dedupe_hash);
    `);
  } else {
    await sqlite.execAsync(`
      DROP INDEX IF EXISTS records_dedupe_hash_lookup_idx;
      CREATE UNIQUE INDEX IF NOT EXISTS records_dedupe_hash_unique_idx
        ON records(dedupe_hash)
        WHERE source = 'import' AND dedupe_hash IS NOT NULL;
    `);
  }
}

async function migrateImportRowsForTransactionKinds(): Promise<void> {
  const columns = await sqlite.getAllAsync<{ name: string }>("PRAGMA table_info(import_rows)");
  const columnNames = new Set(columns.map((column) => column.name));

  if (!columnNames.has("merchant_order_no")) {
    await sqlite.execAsync("ALTER TABLE import_rows ADD COLUMN merchant_order_no TEXT;");
  }

  if (!columnNames.has("transaction_kind")) {
    await sqlite.execAsync("ALTER TABLE import_rows ADD COLUMN transaction_kind TEXT;");
  }
  await sqlite.execAsync("UPDATE import_rows SET transaction_kind = type WHERE transaction_kind IS NULL;");

  await sqlite.execAsync(`
    CREATE INDEX IF NOT EXISTS import_rows_merchant_order_idx
      ON import_rows(merchant_order_no);
  `);
}

async function verifyDatabaseSchema(): Promise<void> {
  await assertColumnsExist("records", ["merchant_order_no", "transaction_kind", "related_record_id"]);
  await assertColumnsExist("import_rows", ["merchant_order_no", "transaction_kind"]);
}

async function assertColumnsExist(table: string, requiredColumns: string[]): Promise<void> {
  const columns = await sqlite.getAllAsync<{ name: string }>(`PRAGMA table_info(${table})`);
  const columnNames = new Set(columns.map((column) => column.name));
  const missingColumns = requiredColumns.filter((column) => !columnNames.has(column));

  if (missingColumns.length > 0) {
    throw new Error(`Database migration incomplete: ${table}.${missingColumns.join(",")}`);
  }
}
