CREATE TABLE "lead_stage_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"lead_id" integer NOT NULL,
	"from_stage_id" integer,
	"to_stage_id" integer,
	"changed_by" text,
	"duration_seconds" integer,
	"changed_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "ai_documents" ADD COLUMN "type" text DEFAULT 'text';--> statement-breakpoint
ALTER TABLE "ai_documents" ADD COLUMN "file_url" text;--> statement-breakpoint
ALTER TABLE "ai_documents" ADD COLUMN "file_name" text;--> statement-breakpoint
ALTER TABLE "ai_documents" ADD COLUMN "file_size" integer;--> statement-breakpoint
ALTER TABLE "ai_documents" ADD COLUMN "mime_type" text;--> statement-breakpoint
ALTER TABLE "ai_documents" ADD COLUMN "link_url" text;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "stage_changed_at" timestamp DEFAULT now();--> statement-breakpoint
ALTER TABLE "task_participants" ADD COLUMN "contact_id" integer;--> statement-breakpoint
ALTER TABLE "lead_stage_history" ADD CONSTRAINT "lead_stage_history_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_stage_history" ADD CONSTRAINT "lead_stage_history_from_stage_id_lead_stages_id_fk" FOREIGN KEY ("from_stage_id") REFERENCES "public"."lead_stages"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_stage_history" ADD CONSTRAINT "lead_stage_history_to_stage_id_lead_stages_id_fk" FOREIGN KEY ("to_stage_id") REFERENCES "public"."lead_stages"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_stage_history" ADD CONSTRAINT "lead_stage_history_changed_by_users_id_fk" FOREIGN KEY ("changed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_participants" ADD CONSTRAINT "task_participants_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE cascade ON UPDATE no action;