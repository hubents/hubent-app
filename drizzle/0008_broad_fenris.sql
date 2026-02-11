CREATE TABLE "contact_relationships" (
	"id" serial PRIMARY KEY NOT NULL,
	"person_contact_id" integer NOT NULL,
	"company_contact_id" integer NOT NULL,
	"role" text,
	"is_primary" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "event_tables" (
	"id" serial PRIMARY KEY NOT NULL,
	"event_id" integer NOT NULL,
	"name" text NOT NULL,
	"shape" text DEFAULT 'round',
	"capacity" integer DEFAULT 8,
	"position_x" integer DEFAULT 100,
	"position_y" integer DEFAULT 100,
	"width" integer DEFAULT 120,
	"height" integer DEFAULT 120,
	"rotation" integer DEFAULT 0,
	"color" text DEFAULT '#ffffff',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "guest_checkins" (
	"id" serial PRIMARY KEY NOT NULL,
	"guest_id" integer NOT NULL,
	"checked_in_at" timestamp DEFAULT now() NOT NULL,
	"checked_in_by" text,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "guest_companions" (
	"id" serial PRIMARY KEY NOT NULL,
	"guest_id" integer NOT NULL,
	"full_name" text NOT NULL,
	"menu_preference" text,
	"dietary_restrictions" text,
	"needs_transport" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "organization_finance_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"default_currency" text DEFAULT 'EUR',
	"enabled_currencies" jsonb DEFAULT '["EUR","USD"]'::jsonb,
	"quote_prefix" text DEFAULT 'PRES',
	"invoice_prefix" text DEFAULT 'FAC',
	"proforma_prefix" text DEFAULT 'PROF',
	"delivery_note_prefix" text DEFAULT 'ALB',
	"credit_note_prefix" text DEFAULT 'ABONO',
	"next_quote_number" integer DEFAULT 1,
	"next_invoice_number" integer DEFAULT 1,
	"next_proforma_number" integer DEFAULT 1,
	"next_delivery_note_number" integer DEFAULT 1,
	"next_credit_note_number" integer DEFAULT 1,
	"stripe_account_id" text,
	"stripe_enabled" boolean DEFAULT false,
	"enable_cash" boolean DEFAULT true,
	"enable_bank_transfer" boolean DEFAULT true,
	"enable_stripe" boolean DEFAULT false,
	"default_payment_terms" text DEFAULT '30 días',
	"default_terms_and_conditions" text,
	"quote_validity_days" integer DEFAULT 30,
	"company_name" text,
	"tax_id" text,
	"fiscal_address" text,
	"fiscal_city" text,
	"fiscal_postal_code" text,
	"fiscal_country" text DEFAULT 'España',
	"fiscal_email" text,
	"fiscal_phone" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "organization_finance_settings_organization_id_unique" UNIQUE("organization_id")
);
--> statement-breakpoint
CREATE TABLE "rsvp_transport_bookings" (
	"id" serial PRIMARY KEY NOT NULL,
	"guest_id" integer NOT NULL,
	"transport_option_id" integer NOT NULL,
	"seats" integer DEFAULT 1,
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "rsvp_transport_options" (
	"id" serial PRIMARY KEY NOT NULL,
	"event_id" integer NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"departure_location" text,
	"departure_address" text,
	"departure_time" text,
	"return_time" text,
	"capacity" integer,
	"price" numeric(10, 2) DEFAULT '0',
	"map_image_url" text,
	"is_active" boolean DEFAULT true,
	"order_index" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "task_checklist_assignees" (
	"id" serial PRIMARY KEY NOT NULL,
	"checklist_item_id" integer NOT NULL,
	"participant_id" integer NOT NULL,
	"assigned_at" timestamp DEFAULT now(),
	"assigned_by" text
);
--> statement-breakpoint
CREATE TABLE "task_checklist_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"task_id" integer NOT NULL,
	"title" text NOT NULL,
	"is_completed" boolean DEFAULT false,
	"due_date" timestamp,
	"sort_order" integer DEFAULT 0,
	"completed_at" timestamp,
	"completed_by" text,
	"created_by" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "task_template_checklists" (
	"id" serial PRIMARY KEY NOT NULL,
	"task_template_id" integer NOT NULL,
	"title" text NOT NULL,
	"sort_order" integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE "tax_rates" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"name" text NOT NULL,
	"rate" numeric(5, 2) NOT NULL,
	"is_default" boolean DEFAULT false,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "contacts" ADD COLUMN "category" text;--> statement-breakpoint
ALTER TABLE "contacts" ADD COLUMN "is_vendor" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "contacts" ADD COLUMN "vendor_category" text;--> statement-breakpoint
ALTER TABLE "contacts" ADD COLUMN "vendor_id" integer;--> statement-breakpoint
ALTER TABLE "document_items" ADD COLUMN "tax_rate_id" integer;--> statement-breakpoint
ALTER TABLE "financial_documents" ADD COLUMN "vendor_id" integer;--> statement-breakpoint
ALTER TABLE "financial_documents" ADD COLUMN "contact_id" integer;--> statement-breakpoint
ALTER TABLE "financial_documents" ADD COLUMN "direction" text DEFAULT 'outgoing';--> statement-breakpoint
ALTER TABLE "financial_documents" ADD COLUMN "paid_amount" numeric(12, 2) DEFAULT '0';--> statement-breakpoint
ALTER TABLE "financial_documents" ADD COLUMN "payment_terms" text;--> statement-breakpoint
ALTER TABLE "financial_documents" ADD COLUMN "bank_account_id" integer;--> statement-breakpoint
ALTER TABLE "financial_documents" ADD COLUMN "sent_at" timestamp;--> statement-breakpoint
ALTER TABLE "financial_documents" ADD COLUMN "paid_at" timestamp;--> statement-breakpoint
ALTER TABLE "financial_documents" ADD COLUMN "stripe_payment_intent_id" text;--> statement-breakpoint
ALTER TABLE "financial_documents" ADD COLUMN "stripe_payment_url" text;--> statement-breakpoint
ALTER TABLE "guests" ADD COLUMN "table_id" integer;--> statement-breakpoint
ALTER TABLE "guests" ADD COLUMN "age_group" text DEFAULT 'adult';--> statement-breakpoint
ALTER TABLE "guests" ADD COLUMN "menu_preference" text;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "fiscal_name" text;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "tax_id" text;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "fiscal_address" text;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "fiscal_city" text;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "fiscal_postal_code" text;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "fiscal_country" text DEFAULT 'España';--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "fiscal_email" text;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "fiscal_phone" text;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "invoice_logo" text;--> statement-breakpoint
ALTER TABLE "payment_records" ADD COLUMN "vendor_id" integer;--> statement-breakpoint
ALTER TABLE "payment_records" ADD COLUMN "contact_id" integer;--> statement-breakpoint
ALTER TABLE "payment_records" ADD COLUMN "event_id" integer;--> statement-breakpoint
ALTER TABLE "payment_records" ADD COLUMN "currency" text DEFAULT 'EUR';--> statement-breakpoint
ALTER TABLE "payment_records" ADD COLUMN "direction" text DEFAULT 'incoming';--> statement-breakpoint
ALTER TABLE "payment_records" ADD COLUMN "stripe_payment_id" text;--> statement-breakpoint
ALTER TABLE "rsvp_settings" ADD COLUMN "max_companions_per_guest" integer DEFAULT 1;--> statement-breakpoint
ALTER TABLE "rsvp_settings" ADD COLUMN "show_transport" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "task_payments" ADD COLUMN "vendor_id" integer;--> statement-breakpoint
ALTER TABLE "task_payments" ADD COLUMN "payment_method" text;--> statement-breakpoint
ALTER TABLE "task_payments" ADD COLUMN "notes" text;--> statement-breakpoint
ALTER TABLE "task_templates" ADD COLUMN "html_content" text;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "sort_order" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "vendors" ADD COLUMN "contact_id" integer;--> statement-breakpoint
ALTER TABLE "contact_relationships" ADD CONSTRAINT "contact_relationships_person_contact_id_contacts_id_fk" FOREIGN KEY ("person_contact_id") REFERENCES "public"."contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_relationships" ADD CONSTRAINT "contact_relationships_company_contact_id_contacts_id_fk" FOREIGN KEY ("company_contact_id") REFERENCES "public"."contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_tables" ADD CONSTRAINT "event_tables_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guest_checkins" ADD CONSTRAINT "guest_checkins_guest_id_guests_id_fk" FOREIGN KEY ("guest_id") REFERENCES "public"."guests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guest_checkins" ADD CONSTRAINT "guest_checkins_checked_in_by_users_id_fk" FOREIGN KEY ("checked_in_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guest_companions" ADD CONSTRAINT "guest_companions_guest_id_guests_id_fk" FOREIGN KEY ("guest_id") REFERENCES "public"."guests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_finance_settings" ADD CONSTRAINT "organization_finance_settings_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rsvp_transport_bookings" ADD CONSTRAINT "rsvp_transport_bookings_guest_id_guests_id_fk" FOREIGN KEY ("guest_id") REFERENCES "public"."guests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rsvp_transport_bookings" ADD CONSTRAINT "rsvp_transport_bookings_transport_option_id_rsvp_transport_options_id_fk" FOREIGN KEY ("transport_option_id") REFERENCES "public"."rsvp_transport_options"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rsvp_transport_options" ADD CONSTRAINT "rsvp_transport_options_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_checklist_assignees" ADD CONSTRAINT "task_checklist_assignees_checklist_item_id_task_checklist_items_id_fk" FOREIGN KEY ("checklist_item_id") REFERENCES "public"."task_checklist_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_checklist_assignees" ADD CONSTRAINT "task_checklist_assignees_participant_id_task_participants_id_fk" FOREIGN KEY ("participant_id") REFERENCES "public"."task_participants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_checklist_assignees" ADD CONSTRAINT "task_checklist_assignees_assigned_by_users_id_fk" FOREIGN KEY ("assigned_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_checklist_items" ADD CONSTRAINT "task_checklist_items_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_checklist_items" ADD CONSTRAINT "task_checklist_items_completed_by_users_id_fk" FOREIGN KEY ("completed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_checklist_items" ADD CONSTRAINT "task_checklist_items_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_template_checklists" ADD CONSTRAINT "task_template_checklists_task_template_id_task_templates_id_fk" FOREIGN KEY ("task_template_id") REFERENCES "public"."task_templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tax_rates" ADD CONSTRAINT "tax_rates_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_items" ADD CONSTRAINT "document_items_tax_rate_id_tax_rates_id_fk" FOREIGN KEY ("tax_rate_id") REFERENCES "public"."tax_rates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial_documents" ADD CONSTRAINT "financial_documents_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial_documents" ADD CONSTRAINT "financial_documents_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial_documents" ADD CONSTRAINT "financial_documents_bank_account_id_bank_accounts_id_fk" FOREIGN KEY ("bank_account_id") REFERENCES "public"."bank_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guests" ADD CONSTRAINT "guests_table_id_event_tables_id_fk" FOREIGN KEY ("table_id") REFERENCES "public"."event_tables"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_records" ADD CONSTRAINT "payment_records_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_records" ADD CONSTRAINT "payment_records_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_records" ADD CONSTRAINT "payment_records_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_payments" ADD CONSTRAINT "task_payments_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE no action ON UPDATE no action;