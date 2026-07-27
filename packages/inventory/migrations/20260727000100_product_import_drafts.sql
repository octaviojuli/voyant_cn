DO $$ BEGIN
	CREATE TYPE "product_import_draft_status" AS ENUM ('pending_review', 'in_review', 'committed', 'discarded');
EXCEPTION
	WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "product_import_drafts" (
	"id" text PRIMARY KEY NOT NULL,
	"status" "product_import_draft_status" DEFAULT 'pending_review' NOT NULL,
	"source_filename" text NOT NULL,
	"source_format" text NOT NULL,
	"source_storage_key" text,
	"draft" jsonb NOT NULL,
	"parsed_draft" jsonb NOT NULL,
	"warnings" jsonb,
	"product_id" text,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"committed_at" timestamp with time zone
);--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "product_import_drafts" ADD CONSTRAINT "product_import_drafts_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_product_import_drafts_status" ON "product_import_drafts" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_product_import_drafts_product" ON "product_import_drafts" USING btree ("product_id");
