ALTER TABLE records ADD COLUMN merchant_order_no TEXT;
--> statement-breakpoint
ALTER TABLE records ADD COLUMN transaction_kind TEXT;
--> statement-breakpoint
ALTER TABLE records ADD COLUMN related_record_id TEXT;
--> statement-breakpoint
UPDATE records SET transaction_kind = type WHERE transaction_kind IS NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS records_import_provider_merchant_order_idx
  ON records(import_provider, merchant_order_no);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS records_related_record_idx
  ON records(related_record_id);
--> statement-breakpoint
DROP INDEX IF EXISTS records_import_trade_unique_idx;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS records_import_trade_unique_idx
  ON records(import_provider, external_trade_no, transaction_kind)
  WHERE source = 'import' AND import_provider IS NOT NULL AND external_trade_no IS NOT NULL;
--> statement-breakpoint
ALTER TABLE import_rows ADD COLUMN merchant_order_no TEXT;
--> statement-breakpoint
ALTER TABLE import_rows ADD COLUMN transaction_kind TEXT;
--> statement-breakpoint
UPDATE import_rows SET transaction_kind = type WHERE transaction_kind IS NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS import_rows_merchant_order_idx
  ON import_rows(merchant_order_no);
