CREATE TYPE "public"."api_key_environment" AS ENUM('live', 'test');--> statement-breakpoint
CREATE TYPE "public"."logistics_status" AS ENUM('pendiente', 'confirmada', 'en_ruta', 'entregada', 'devuelta', 'cancelada');--> statement-breakpoint
CREATE TYPE "public"."movement_type" AS ENUM('entrada', 'salida', 'transferencia', 'reserva', 'carga', 'entrega', 'devolucion', 'ajuste');--> statement-breakpoint
CREATE TYPE "public"."org_type" AS ENUM('tenant', 'provider', 'client');--> statement-breakpoint
CREATE TYPE "public"."product_subtype" AS ENUM('alquiler', 'venta', 'servicio');--> statement-breakpoint
CREATE TYPE "public"."product_type" AS ENUM('fisico', 'servicio', 'paquete');--> statement-breakpoint
CREATE TYPE "public"."provider_category_type" AS ENUM('booking', 'logistica', 'audiovisual', 'otro');--> statement-breakpoint
CREATE TYPE "public"."venue_booking_status" AS ENUM('confirmado', 'opcion', 'bloqueado', 'libre');--> statement-breakpoint
CREATE TYPE "public"."verification_status" AS ENUM('unverified', 'verified', 'rejected', 'suspended');--> statement-breakpoint
CREATE TYPE "public"."warehouse_type" AS ENUM('fijo', 'movil');--> statement-breakpoint
CREATE TYPE "public"."webhook_log_status" AS ENUM('pending', 'delivered', 'failed');--> statement-breakpoint
ALTER TYPE "public"."document_status" ADD VALUE 'payment_promise';--> statement-breakpoint
ALTER TYPE "public"."document_status" ADD VALUE 'partial';--> statement-breakpoint
ALTER TYPE "public"."message_type" ADD VALUE 'email_sent';--> statement-breakpoint
ALTER TYPE "public"."message_type" ADD VALUE 'email_received';--> statement-breakpoint
ALTER TYPE "public"."message_type" ADD VALUE 'whatsapp_sent';--> statement-breakpoint
ALTER TYPE "public"."message_type" ADD VALUE 'whatsapp_received';--> statement-breakpoint
CREATE TABLE "api_key_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"api_key_id" integer NOT NULL,
	"method" text NOT NULL,
	"path" text NOT NULL,
	"status_code" integer NOT NULL,
	"response_time_ms" integer,
	"ip_address" text,
	"user_agent" text,
	"request_id" text NOT NULL,
	"error_code" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "api_keys" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"name" text NOT NULL,
	"key_hash" text NOT NULL,
	"key_prefix" text NOT NULL,
	"scopes" json NOT NULL,
	"environment" text DEFAULT 'live' NOT NULL,
	"rate_limit" integer DEFAULT 100,
	"expires_at" timestamp,
	"last_used_at" timestamp,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by" text,
	"created_at" timestamp DEFAULT now(),
	"revoked_at" timestamp,
	"revoked_by" text,
	CONSTRAINT "api_keys_key_hash_unique" UNIQUE("key_hash")
);
--> statement-breakpoint
CREATE TABLE "composio_triggers" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"toolkit" text NOT NULL,
	"trigger_slug" text NOT NULL,
	"composio_trigger_id" text NOT NULL,
	"connected_account_id" text,
	"status" text DEFAULT 'active' NOT NULL,
	"config" jsonb,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "composio_triggers_composio_trigger_id_unique" UNIQUE("composio_trigger_id")
);
--> statement-breakpoint
CREATE TABLE "event_collaborations" (
	"id" serial PRIMARY KEY NOT NULL,
	"event_id" integer NOT NULL,
	"host_org_id" integer NOT NULL,
	"guest_org_id" integer,
	"invitation_email" text,
	"invitation_token" text,
	"permissions" json DEFAULT '{"scope":"full","general":"view","calendar":"view","tasks":"view","partners":"none","finances":"none","rsvp":"none","guests":"none","runsheet":"none"}'::json,
	"status" text DEFAULT 'pending' NOT NULL,
	"invited_by" text,
	"invited_at" timestamp DEFAULT now(),
	"accepted_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "event_collaborations_invitation_token_unique" UNIQUE("invitation_token")
);
--> statement-breakpoint
CREATE TABLE "event_schedule_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"event_id" integer NOT NULL,
	"organization_id" integer NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"date" timestamp NOT NULL,
	"start_time" text,
	"end_time" text,
	"location" text,
	"notes" text,
	"color" text,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "form_fields" (
	"id" serial PRIMARY KEY NOT NULL,
	"form_id" integer NOT NULL,
	"type" text NOT NULL,
	"label" text NOT NULL,
	"placeholder" text,
	"required" boolean DEFAULT false,
	"crm_mapping" text,
	"options" jsonb,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb
);
--> statement-breakpoint
CREATE TABLE "form_instances" (
	"id" serial PRIMARY KEY NOT NULL,
	"form_id" integer NOT NULL,
	"organization_id" integer NOT NULL,
	"type" text DEFAULT 'landing' NOT NULL,
	"slug" text,
	"event_id" integer,
	"task_id" integer,
	"status" text DEFAULT 'active' NOT NULL,
	"created_by" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "form_submissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"instance_id" integer NOT NULL,
	"form_id" integer NOT NULL,
	"data" jsonb NOT NULL,
	"respondent_name" text,
	"respondent_email" text,
	"respondent_user_id" text,
	"lead_id" integer,
	"contact_id" integer,
	"pdf_url" text,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "forms" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"logo_url" text,
	"cover_image" text,
	"primary_color" text DEFAULT '#111827',
	"submit_button_text" text DEFAULT 'Enviar',
	"thank_you_title" text DEFAULT '¡Gracias!',
	"thank_you_message" text DEFAULT 'Tu respuesta ha sido registrada.',
	"redirect_url" text,
	"default_event_type" text,
	"notify_on_response" boolean DEFAULT true,
	"notify_email" text,
	"gdpr_enabled" boolean DEFAULT false,
	"gdpr_text" text DEFAULT 'Acepto la política de privacidad.',
	"gdpr_link" text,
	"crm_create_contact" boolean DEFAULT true,
	"crm_create_lead" boolean DEFAULT true,
	"created_by" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "idempotency_keys" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"api_key_id" integer NOT NULL,
	"request_path" text NOT NULL,
	"request_body_hash" text,
	"response_code" integer,
	"response_body" jsonb,
	"created_at" timestamp DEFAULT now(),
	"expires_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inventory_products" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"catalog_id" integer,
	"sku" text,
	"name" text NOT NULL,
	"type" "product_type" DEFAULT 'fisico',
	"subtype" "product_subtype" DEFAULT 'alquiler',
	"category" text,
	"description" text,
	"detail" text,
	"tags" json,
	"cost" numeric(10, 2),
	"sell_price" numeric(10, 2),
	"vat_rate" integer DEFAULT 21,
	"warehouse_id" integer,
	"stock" integer DEFAULT 0,
	"stock_min" integer DEFAULT 0,
	"color" text,
	"initials" text,
	"image_url" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "logistics_reservation_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"reservation_id" integer NOT NULL,
	"product_id" integer NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "logistics_reservations" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"event_id" integer,
	"event_name" text,
	"date" text,
	"time_from" text,
	"time_to" text,
	"warehouse_id" integer,
	"warehouse_name" text,
	"items_location" text,
	"venue" text,
	"venue_city" text,
	"status" "logistics_status" DEFAULT 'pendiente',
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "organization_integrations" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"toolkit" text NOT NULL,
	"composio_connected_account_id" text,
	"status" text DEFAULT 'disconnected' NOT NULL,
	"connected_by" text,
	"connected_email" text,
	"metadata" jsonb,
	"connected_at" timestamp,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "provider_event_access" (
	"id" serial PRIMARY KEY NOT NULL,
	"provider_org_id" integer NOT NULL,
	"event_id" integer NOT NULL,
	"planner_org_id" integer NOT NULL,
	"vendor_id" integer,
	"invited_by" text,
	"status" text DEFAULT 'pending',
	"invited_at" timestamp DEFAULT now(),
	"accepted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "provider_favorites" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"user_id" text NOT NULL,
	"provider_org_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "stock_movements" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"type" "movement_type" NOT NULL,
	"product_id" integer NOT NULL,
	"quantity" integer NOT NULL,
	"date" text,
	"warehouse_id" integer,
	"from_warehouse_id" integer,
	"to_warehouse_id" integer,
	"event_id" integer,
	"event_name" text,
	"time_from" text,
	"time_to" text,
	"reference" text,
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "task_template_forms" (
	"id" serial PRIMARY KEY NOT NULL,
	"task_template_id" integer NOT NULL,
	"form_id" integer NOT NULL,
	"sort_order" integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE "venue_bookings" (
	"id" serial PRIMARY KEY NOT NULL,
	"venue_id" integer NOT NULL,
	"space_id" integer,
	"date" text NOT NULL,
	"event_name" text,
	"event_id" integer,
	"planner_org_id" integer,
	"status" "venue_booking_status" DEFAULT 'libre',
	"rate_id" integer,
	"rate_label" text,
	"price" numeric(10, 2),
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "venue_rates" (
	"id" serial PRIMARY KEY NOT NULL,
	"space_id" integer NOT NULL,
	"label" text NOT NULL,
	"months" json,
	"days" integer,
	"zone" text,
	"price" numeric(10, 2),
	"vat_rate" integer DEFAULT 21,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "venue_spaces" (
	"id" serial PRIMARY KEY NOT NULL,
	"venue_id" integer NOT NULL,
	"name" text NOT NULL,
	"capacity" integer,
	"type" text,
	"color" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "venues" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"name" text NOT NULL,
	"city" text,
	"address" text,
	"contact" text,
	"email" text,
	"phone" text,
	"web" text,
	"rating" numeric(3, 1),
	"verified" boolean DEFAULT false,
	"color" text,
	"initials" text,
	"cover" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "warehouses" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"name" text NOT NULL,
	"type" "warehouse_type" DEFAULT 'fijo',
	"location" text,
	"capacity" integer,
	"manager" text,
	"plate" text,
	"driver" text,
	"event_id" integer,
	"event_name" text,
	"color" text,
	"initials" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "webhook_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"webhook_id" integer NOT NULL,
	"event_type" text NOT NULL,
	"payload" jsonb NOT NULL,
	"response_code" integer,
	"response_body" text,
	"attempt" integer DEFAULT 1 NOT NULL,
	"delivered_at" timestamp,
	"next_retry_at" timestamp,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "webhooks" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"url" text NOT NULL,
	"secret" text NOT NULL,
	"events" json NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"description" text,
	"created_by" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "invoices" ALTER COLUMN "currency" SET DEFAULT 'EUR';--> statement-breakpoint
ALTER TABLE "organization_finance_settings" ALTER COLUMN "credit_note_prefix" SET DEFAULT 'FR';--> statement-breakpoint
ALTER TABLE "contacts" ADD COLUMN "user_id" text;--> statement-breakpoint
ALTER TABLE "event_participants" ADD COLUMN "contact_id" integer;--> statement-breakpoint
ALTER TABLE "event_participants" ADD COLUMN "permissions" json;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "custom_type" text;--> statement-breakpoint
ALTER TABLE "financial_documents" ADD COLUMN "source_document_id" integer;--> statement-breakpoint
ALTER TABLE "financial_documents" ADD COLUMN "source_org_id" integer;--> statement-breakpoint
ALTER TABLE "invitations" ADD COLUMN "metadata" json;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "presentment_amount" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "presentment_currency" text;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "period" text;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "org_type" "org_type" DEFAULT 'tenant';--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "instagram_handle" text;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "service_radius" integer;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "service_areas" json;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "verification_status" "verification_status" DEFAULT 'unverified';--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "verified_at" timestamp;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "verified_by" text;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "rejection_reason" text;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "provider_category" "provider_category_type";--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "tagline" text;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "city" text;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "region" text;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "cover_image" text;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "profile_completeness" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "services" json;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "created_by_org_id" integer;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "public_email" text;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "price_range" text;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "country" text;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "instagram_posts" json;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "brochure_url" text;--> statement-breakpoint
ALTER TABLE "payment_records" ADD COLUMN "status" text DEFAULT 'complete';--> statement-breakpoint
ALTER TABLE "payment_records" ADD COLUMN "attachment_url" text;--> statement-breakpoint
ALTER TABLE "payment_records" ADD COLUMN "attachment_name" text;--> statement-breakpoint
ALTER TABLE "payment_records" ADD COLUMN "source_payment_id" integer;--> statement-breakpoint
ALTER TABLE "payment_records" ADD COLUMN "source_org_id" integer;--> statement-breakpoint
ALTER TABLE "roles" ADD COLUMN "event_scoped" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "rsvp_settings" ADD COLUMN "menu_options" jsonb DEFAULT '["Carne","Pescado","Vegetariano"]'::jsonb;--> statement-breakpoint
ALTER TABLE "subscription_plans" ADD COLUMN "org_type" "org_type" DEFAULT 'tenant';--> statement-breakpoint
ALTER TABLE "subscription_plans" ADD COLUMN "provider_category" "provider_category_type";--> statement-breakpoint
ALTER TABLE "subscription_plans" ADD COLUMN "currency" text DEFAULT 'EUR';--> statement-breakpoint
ALTER TABLE "subscription_plans" ADD COLUMN "highlighted" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "subscription_plans" ADD COLUMN "trial_days" integer DEFAULT 14;--> statement-breakpoint
ALTER TABLE "subscription_plans" ADD COLUMN "stripe_product_id" text;--> statement-breakpoint
ALTER TABLE "subscription_plans" ADD COLUMN "stripe_price_id_monthly" text;--> statement-breakpoint
ALTER TABLE "subscription_plans" ADD COLUMN "stripe_price_id_yearly" text;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "presentment_currency" text;--> statement-breakpoint
ALTER TABLE "task_messages" ADD COLUMN "email_from" text;--> statement-breakpoint
ALTER TABLE "task_messages" ADD COLUMN "email_to" text[];--> statement-breakpoint
ALTER TABLE "task_messages" ADD COLUMN "email_cc" text[];--> statement-breakpoint
ALTER TABLE "task_messages" ADD COLUMN "email_bcc" text[];--> statement-breakpoint
ALTER TABLE "task_messages" ADD COLUMN "email_subject" text;--> statement-breakpoint
ALTER TABLE "task_messages" ADD COLUMN "email_thread_id" text;--> statement-breakpoint
ALTER TABLE "task_messages" ADD COLUMN "email_message_id" text;--> statement-breakpoint
ALTER TABLE "task_messages" ADD COLUMN "whatsapp_to" text;--> statement-breakpoint
ALTER TABLE "task_messages" ADD COLUMN "whatsapp_from" text;--> statement-breakpoint
ALTER TABLE "task_messages" ADD COLUMN "whatsapp_template" text;--> statement-breakpoint
ALTER TABLE "task_messages" ADD COLUMN "whatsapp_message_id" text;--> statement-breakpoint
ALTER TABLE "task_participants" ADD COLUMN "collaborator_org_id" integer;--> statement-breakpoint
ALTER TABLE "task_schedule_items" ADD COLUMN "vendor_id" integer;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "shared_with_host" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "vendors" ADD COLUMN "provider_org_id" integer;--> statement-breakpoint
ALTER TABLE "api_key_logs" ADD CONSTRAINT "api_key_logs_api_key_id_api_keys_id_fk" FOREIGN KEY ("api_key_id") REFERENCES "public"."api_keys"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_revoked_by_users_id_fk" FOREIGN KEY ("revoked_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "composio_triggers" ADD CONSTRAINT "composio_triggers_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_collaborations" ADD CONSTRAINT "event_collaborations_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_collaborations" ADD CONSTRAINT "event_collaborations_host_org_id_organizations_id_fk" FOREIGN KEY ("host_org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_collaborations" ADD CONSTRAINT "event_collaborations_guest_org_id_organizations_id_fk" FOREIGN KEY ("guest_org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_collaborations" ADD CONSTRAINT "event_collaborations_invited_by_users_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_schedule_items" ADD CONSTRAINT "event_schedule_items_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_schedule_items" ADD CONSTRAINT "event_schedule_items_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "form_fields" ADD CONSTRAINT "form_fields_form_id_forms_id_fk" FOREIGN KEY ("form_id") REFERENCES "public"."forms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "form_instances" ADD CONSTRAINT "form_instances_form_id_forms_id_fk" FOREIGN KEY ("form_id") REFERENCES "public"."forms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "form_instances" ADD CONSTRAINT "form_instances_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "form_instances" ADD CONSTRAINT "form_instances_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "form_instances" ADD CONSTRAINT "form_instances_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "form_instances" ADD CONSTRAINT "form_instances_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "form_submissions" ADD CONSTRAINT "form_submissions_instance_id_form_instances_id_fk" FOREIGN KEY ("instance_id") REFERENCES "public"."form_instances"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "form_submissions" ADD CONSTRAINT "form_submissions_form_id_forms_id_fk" FOREIGN KEY ("form_id") REFERENCES "public"."forms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "form_submissions" ADD CONSTRAINT "form_submissions_respondent_user_id_users_id_fk" FOREIGN KEY ("respondent_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "form_submissions" ADD CONSTRAINT "form_submissions_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "form_submissions" ADD CONSTRAINT "form_submissions_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forms" ADD CONSTRAINT "forms_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forms" ADD CONSTRAINT "forms_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "idempotency_keys" ADD CONSTRAINT "idempotency_keys_api_key_id_api_keys_id_fk" FOREIGN KEY ("api_key_id") REFERENCES "public"."api_keys"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_products" ADD CONSTRAINT "inventory_products_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_products" ADD CONSTRAINT "inventory_products_catalog_id_product_catalog_id_fk" FOREIGN KEY ("catalog_id") REFERENCES "public"."product_catalog"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_products" ADD CONSTRAINT "inventory_products_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "logistics_reservation_items" ADD CONSTRAINT "logistics_reservation_items_reservation_id_logistics_reservations_id_fk" FOREIGN KEY ("reservation_id") REFERENCES "public"."logistics_reservations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "logistics_reservation_items" ADD CONSTRAINT "logistics_reservation_items_product_id_inventory_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."inventory_products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "logistics_reservations" ADD CONSTRAINT "logistics_reservations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "logistics_reservations" ADD CONSTRAINT "logistics_reservations_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "logistics_reservations" ADD CONSTRAINT "logistics_reservations_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_integrations" ADD CONSTRAINT "organization_integrations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_integrations" ADD CONSTRAINT "organization_integrations_connected_by_users_id_fk" FOREIGN KEY ("connected_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_event_access" ADD CONSTRAINT "provider_event_access_provider_org_id_organizations_id_fk" FOREIGN KEY ("provider_org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_event_access" ADD CONSTRAINT "provider_event_access_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_event_access" ADD CONSTRAINT "provider_event_access_planner_org_id_organizations_id_fk" FOREIGN KEY ("planner_org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_event_access" ADD CONSTRAINT "provider_event_access_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_event_access" ADD CONSTRAINT "provider_event_access_invited_by_users_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_favorites" ADD CONSTRAINT "provider_favorites_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_favorites" ADD CONSTRAINT "provider_favorites_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_favorites" ADD CONSTRAINT "provider_favorites_provider_org_id_organizations_id_fk" FOREIGN KEY ("provider_org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_product_id_inventory_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."inventory_products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_from_warehouse_id_warehouses_id_fk" FOREIGN KEY ("from_warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_to_warehouse_id_warehouses_id_fk" FOREIGN KEY ("to_warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_template_forms" ADD CONSTRAINT "task_template_forms_task_template_id_task_templates_id_fk" FOREIGN KEY ("task_template_id") REFERENCES "public"."task_templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_template_forms" ADD CONSTRAINT "task_template_forms_form_id_forms_id_fk" FOREIGN KEY ("form_id") REFERENCES "public"."forms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "venue_bookings" ADD CONSTRAINT "venue_bookings_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "venue_bookings" ADD CONSTRAINT "venue_bookings_space_id_venue_spaces_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."venue_spaces"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "venue_bookings" ADD CONSTRAINT "venue_bookings_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "venue_bookings" ADD CONSTRAINT "venue_bookings_planner_org_id_organizations_id_fk" FOREIGN KEY ("planner_org_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "venue_bookings" ADD CONSTRAINT "venue_bookings_rate_id_venue_rates_id_fk" FOREIGN KEY ("rate_id") REFERENCES "public"."venue_rates"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "venue_rates" ADD CONSTRAINT "venue_rates_space_id_venue_spaces_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."venue_spaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "venue_spaces" ADD CONSTRAINT "venue_spaces_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "venues" ADD CONSTRAINT "venues_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warehouses" ADD CONSTRAINT "warehouses_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warehouses" ADD CONSTRAINT "warehouses_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_logs" ADD CONSTRAINT "webhook_logs_webhook_id_webhooks_id_fk" FOREIGN KEY ("webhook_id") REFERENCES "public"."webhooks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhooks" ADD CONSTRAINT "webhooks_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhooks" ADD CONSTRAINT "webhooks_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_participants" ADD CONSTRAINT "event_participants_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial_documents" ADD CONSTRAINT "financial_documents_source_org_id_organizations_id_fk" FOREIGN KEY ("source_org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_verified_by_users_id_fk" FOREIGN KEY ("verified_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_records" ADD CONSTRAINT "payment_records_source_org_id_organizations_id_fk" FOREIGN KEY ("source_org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_participants" ADD CONSTRAINT "task_participants_collaborator_org_id_organizations_id_fk" FOREIGN KEY ("collaborator_org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_schedule_items" ADD CONSTRAINT "task_schedule_items_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendors" ADD CONSTRAINT "vendors_provider_org_id_organizations_id_fk" FOREIGN KEY ("provider_org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;