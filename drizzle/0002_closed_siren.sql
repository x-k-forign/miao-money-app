CREATE TABLE `budget_allocations` (
	`id` text PRIMARY KEY NOT NULL,
	`budget_id` text NOT NULL,
	`category_id` text NOT NULL,
	`priority` text NOT NULL,
	`monthly_budget_cents` integer NOT NULL,
	`daily_budget_cents` integer NOT NULL,
	`spent_cents` integer DEFAULT 0 NOT NULL,
	`suggestion` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`budget_id`) REFERENCES `monthly_budgets`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "budget_allocations_priority_check" CHECK("budget_allocations"."priority" IN ('fixed', 'essential', 'transport', 'flexible', 'high_spend', 'other')),
	CONSTRAINT "budget_allocations_monthly_nonnegative_check" CHECK("budget_allocations"."monthly_budget_cents" >= 0),
	CONSTRAINT "budget_allocations_daily_nonnegative_check" CHECK("budget_allocations"."daily_budget_cents" >= 0),
	CONSTRAINT "budget_allocations_spent_nonnegative_check" CHECK("budget_allocations"."spent_cents" >= 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `budget_allocations_budget_category_idx` ON `budget_allocations` (`budget_id`,`category_id`);--> statement-breakpoint
CREATE INDEX `budget_allocations_budget_idx` ON `budget_allocations` (`budget_id`);--> statement-breakpoint
CREATE TABLE `classification_rules` (
	`id` text PRIMARY KEY NOT NULL,
	`keyword` text NOT NULL,
	`match_type` text DEFAULT 'contains' NOT NULL,
	`category_id` text NOT NULL,
	`source` text NOT NULL,
	`priority` integer DEFAULT 0 NOT NULL,
	`hit_count` integer DEFAULT 0 NOT NULL,
	`last_hit_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "classification_rules_source_check" CHECK("classification_rules"."source" IN ('system', 'user')),
	CONSTRAINT "classification_rules_match_type_check" CHECK("classification_rules"."match_type" IN ('contains', 'exact'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `classification_rules_keyword_category_source_idx` ON `classification_rules` (`keyword`,`category_id`,`source`);--> statement-breakpoint
CREATE INDEX `classification_rules_priority_idx` ON `classification_rules` (`source`,`priority`);--> statement-breakpoint
CREATE TABLE `import_batches` (
	`id` text PRIMARY KEY NOT NULL,
	`provider` text NOT NULL,
	`provider_detail` text,
	`file_name` text NOT NULL,
	`file_type` text NOT NULL,
	`total_rows` integer DEFAULT 0 NOT NULL,
	`ready_rows` integer DEFAULT 0 NOT NULL,
	`error_rows` integer DEFAULT 0 NOT NULL,
	`duplicate_rows` integer DEFAULT 0 NOT NULL,
	`imported_rows` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "import_batches_provider_check" CHECK("import_batches"."provider" IN ('wechat', 'alipay', 'bank')),
	CONSTRAINT "import_batches_file_type_check" CHECK("import_batches"."file_type" IN ('csv', 'xls', 'xlsx', 'pdf'))
);
--> statement-breakpoint
CREATE INDEX `import_batches_provider_created_idx` ON `import_batches` (`provider`,`created_at`);--> statement-breakpoint
CREATE TABLE `import_rows` (
	`id` text PRIMARY KEY NOT NULL,
	`batch_id` text NOT NULL,
	`raw_json` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`type` text NOT NULL,
	`amount_cents` integer NOT NULL,
	`record_date` text NOT NULL,
	`merchant_name` text,
	`external_trade_no` text,
	`note` text,
	`category_id` text,
	`confidence` integer DEFAULT 0 NOT NULL,
	`duplicate_record_id` text,
	`dedupe_hash` text,
	`error_message` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`batch_id`) REFERENCES `import_batches`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`duplicate_record_id`) REFERENCES `records`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "import_rows_status_check" CHECK("import_rows"."status" IN ('pending', 'ready', 'error', 'duplicate', 'skipped', 'imported')),
	CONSTRAINT "import_rows_type_check" CHECK("import_rows"."type" IN ('income', 'expense')),
	CONSTRAINT "import_rows_amount_nonnegative_check" CHECK("import_rows"."amount_cents" >= 0),
	CONSTRAINT "import_rows_confidence_check" CHECK("import_rows"."confidence" BETWEEN 0 AND 100)
);
--> statement-breakpoint
CREATE INDEX `import_rows_batch_status_idx` ON `import_rows` (`batch_id`,`status`);--> statement-breakpoint
CREATE INDEX `import_rows_trade_idx` ON `import_rows` (`external_trade_no`);--> statement-breakpoint
CREATE INDEX `import_rows_dedupe_hash_idx` ON `import_rows` (`dedupe_hash`);--> statement-breakpoint
CREATE TABLE `monthly_budgets` (
	`id` text PRIMARY KEY NOT NULL,
	`month` text NOT NULL,
	`expected_income_cents` integer NOT NULL,
	`saving_rate` integer,
	`saving_target_cents` integer,
	`available_budget_cents` integer NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "monthly_budgets_month_format_check" CHECK(length("monthly_budgets"."month") = 7),
	CONSTRAINT "monthly_budgets_income_nonnegative_check" CHECK("monthly_budgets"."expected_income_cents" >= 0),
	CONSTRAINT "monthly_budgets_saving_rate_check" CHECK("monthly_budgets"."saving_rate" IS NULL OR "monthly_budgets"."saving_rate" BETWEEN 0 AND 10000)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `monthly_budgets_month_idx` ON `monthly_budgets` (`month`);--> statement-breakpoint
ALTER TABLE `records` ADD COLUMN `import_batch_id` text;--> statement-breakpoint
ALTER TABLE `records` ADD COLUMN `import_provider` text;--> statement-breakpoint
ALTER TABLE `records` ADD COLUMN `external_trade_no` text;--> statement-breakpoint
ALTER TABLE `records` ADD COLUMN `merchant_name` text;--> statement-breakpoint
ALTER TABLE `records` ADD COLUMN `dedupe_hash` text;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `records_import_batch_idx` ON `records` (`import_batch_id`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `records_import_provider_trade_idx` ON `records` (`import_provider`,`external_trade_no`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `records_dedupe_hash_idx` ON `records` (`dedupe_hash`);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `records_import_trade_unique_idx` ON `records` (`import_provider`,`external_trade_no`) WHERE "records"."source" = 'import' AND "records"."import_provider" IS NOT NULL AND "records"."external_trade_no" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `records_dedupe_hash_unique_idx` ON `records` (`dedupe_hash`) WHERE "records"."source" = 'import' AND "records"."dedupe_hash" IS NOT NULL;
