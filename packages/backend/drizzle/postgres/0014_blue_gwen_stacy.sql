CREATE TABLE "chart_snapshots" (
	"metric" text NOT NULL,
	"span" text NOT NULL,
	"bucket" timestamp with time zone NOT NULL,
	"value" bigint DEFAULT 0 NOT NULL,
	"delta" bigint,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "chart_snapshots_metric_span_bucket_pk" PRIMARY KEY("metric","span","bucket")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "plugin_configs" (
	"id" text PRIMARY KEY NOT NULL,
	"plugin_id" text NOT NULL,
	"key" text NOT NULL,
	"value" jsonb NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "chart_span_bucket_idx" ON "chart_snapshots" USING btree ("span","bucket");--> statement-breakpoint
CREATE INDEX "chart_metric_span_bucket_idx" ON "chart_snapshots" USING btree ("metric","span","bucket");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "plugin_configs_plugin_id_idx" ON "plugin_configs" USING btree ("plugin_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "plugin_configs_plugin_key_idx" ON "plugin_configs" USING btree ("plugin_id","key");