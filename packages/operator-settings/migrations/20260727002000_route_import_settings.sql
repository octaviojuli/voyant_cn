CREATE TABLE IF NOT EXISTS "route_import_settings" (
	"id" text PRIMARY KEY NOT NULL,
	"sell_currency" text,
	"timezone" text,
	"product_type_id" text,
	"default_supplier_id" text,
	"adult_min_age" integer,
	"child_min_age" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
