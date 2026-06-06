CREATE UNIQUE INDEX IF NOT EXISTS `categories_kind_name_idx`
  ON `categories` (`kind`, `name`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `categories_kind_sort_idx`
  ON `categories` (`kind`, `sort_order`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `subscriptions_enabled_day_idx`
  ON `subscriptions` (`enabled`, `day_of_month`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `subscriptions_category_idx`
  ON `subscriptions` (`category_id`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `records_month_sort_idx`
  ON `records` (`record_month`, `record_date`, `created_at`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `records_date_sort_idx`
  ON `records` (`record_date`, `created_at`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `records_category_month_idx`
  ON `records` (`category_id`, `record_month`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `records_subscription_month_idx`
  ON `records` (`subscription_id`, `record_month`, `source`);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `records_subscription_month_unique_idx`
  ON `records` (`subscription_id`, `record_month`, `source`)
  WHERE `source` = 'subscription' AND `subscription_id` IS NOT NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `exchange_rates_latest_idx`
  ON `exchange_rates` (`base_currency`, `target_currency`, `rate_date`);
