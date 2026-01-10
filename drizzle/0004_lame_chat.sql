CREATE TYPE "public"."ai_document_category" AS ENUM('faq', 'tutorial', 'feature', 'policy', 'general');--> statement-breakpoint
CREATE TYPE "public"."ai_message_role" AS ENUM('user', 'assistant', 'system');--> statement-breakpoint
CREATE TYPE "public"."ai_prompt_context" AS ENUM('general', 'event', 'task', 'finance', 'support', 'onboarding');--> statement-breakpoint
CREATE TYPE "public"."contact_activity_type" AS ENUM('note', 'call', 'email', 'meeting', 'task_created', 'event_linked', 'lead_converted', 'status_change', 'other');--> statement-breakpoint
CREATE TYPE "public"."contact_source" AS ENUM('manual', 'import', 'website', 'referral', 'social_media', 'event', 'other');--> statement-breakpoint
CREATE TYPE "public"."contact_type" AS ENUM('person', 'company');--> statement-breakpoint
ALTER TYPE "public"."event_type" ADD VALUE 'pre_wedding' BEFORE 'birthday';--> statement-breakpoint
ALTER TYPE "public"."event_type" ADD VALUE 'post_wedding' BEFORE 'birthday';--> statement-breakpoint
CREATE TABLE "ai_analytics" (
	"id" serial PRIMARY KEY NOT NULL,
	"date" timestamp NOT NULL,
	"organization_id" integer,
	"total_conversations" integer DEFAULT 0,
	"total_messages" integer DEFAULT 0,
	"total_tokens" integer DEFAULT 0,
	"avg_latency_ms" integer,
	"positive_ratings" integer DEFAULT 0,
	"negative_ratings" integer DEFAULT 0,
	"top_tools" json,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ai_config" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"value" text,
	"type" text DEFAULT 'string',
	"description" text,
	"updated_by" text,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "ai_config_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "ai_conversations" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" text NOT NULL,
	"user_id" text NOT NULL,
	"organization_id" integer,
	"title" text,
	"message_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ai_documents" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"category" "ai_document_category" DEFAULT 'general',
	"tags" json,
	"is_active" boolean DEFAULT true,
	"priority" integer DEFAULT 0,
	"created_by" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ai_feedback" (
	"id" serial PRIMARY KEY NOT NULL,
	"message_id" integer NOT NULL,
	"user_id" text NOT NULL,
	"rating" integer,
	"comment" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ai_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"conversation_id" integer NOT NULL,
	"role" "ai_message_role" NOT NULL,
	"content" text NOT NULL,
	"tool_calls" json,
	"token_count" integer,
	"latency_ms" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ai_prompts" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"content" text NOT NULL,
	"context" "ai_prompt_context" DEFAULT 'general',
	"role_target" text,
	"is_active" boolean DEFAULT true,
	"version" integer DEFAULT 1,
	"created_by" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "ai_prompts_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "contact_activities" (
	"id" serial PRIMARY KEY NOT NULL,
	"contact_id" integer NOT NULL,
	"type" "contact_activity_type" NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"metadata" json,
	"created_by" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "contact_documents" (
	"id" serial PRIMARY KEY NOT NULL,
	"contact_id" integer NOT NULL,
	"name" text NOT NULL,
	"url" text NOT NULL,
	"type" text DEFAULT 'document',
	"size" integer,
	"mime_type" text,
	"uploaded_by" text,
	"uploaded_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "contact_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"contact_id" integer NOT NULL,
	"event_id" integer NOT NULL,
	"role" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "contact_photos" (
	"id" serial PRIMARY KEY NOT NULL,
	"contact_id" integer NOT NULL,
	"url" text NOT NULL,
	"thumbnail" text,
	"caption" text,
	"sort_order" integer DEFAULT 0,
	"uploaded_by" text,
	"uploaded_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "contact_tags" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"name" text NOT NULL,
	"color" text DEFAULT '#6366f1',
	"description" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "contact_tasks" (
	"id" serial PRIMARY KEY NOT NULL,
	"contact_id" integer NOT NULL,
	"task_id" integer NOT NULL,
	"role" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "contacts" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"type" "contact_type" DEFAULT 'person' NOT NULL,
	"name" text NOT NULL,
	"email" text,
	"phone" text,
	"phone_country_code" text DEFAULT '+34',
	"avatar" text,
	"first_name" text,
	"last_name" text,
	"passport_id" text,
	"nie_or_cif" text,
	"trade_name" text,
	"tax_id" text,
	"website" text,
	"contact_person_name" text,
	"contact_person_email" text,
	"event_date" timestamp,
	"guest_count" integer,
	"budget" numeric(12, 2),
	"venue_type" text,
	"address" text,
	"city" text,
	"state" text,
	"postal_code" text,
	"country" text DEFAULT 'ES',
	"bank_name" text,
	"bank_account_number" text,
	"bank_iban" text,
	"bank_swift" text,
	"payment_methods" json,
	"tags" json,
	"source" "contact_source" DEFAULT 'manual',
	"lead_id" integer,
	"is_lead" boolean DEFAULT false,
	"lead_score" integer DEFAULT 0,
	"notes" text,
	"created_by" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "event_documents" (
	"id" serial PRIMARY KEY NOT NULL,
	"event_id" integer NOT NULL,
	"name" text NOT NULL,
	"url" text NOT NULL,
	"type" text DEFAULT 'document',
	"size" integer,
	"mime_type" text,
	"uploaded_by" text,
	"uploaded_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "event_payments" (
	"id" serial PRIMARY KEY NOT NULL,
	"event_id" integer NOT NULL,
	"description" text NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"status" text DEFAULT 'pending',
	"due_date" timestamp,
	"paid_date" timestamp,
	"paid_to" text,
	"paid_by" text,
	"vendor_id" integer,
	"notes" text,
	"created_by" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "rsvp_faqs" (
	"id" serial PRIMARY KEY NOT NULL,
	"event_id" integer NOT NULL,
	"question" text NOT NULL,
	"answer" text NOT NULL,
	"order_index" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "rsvp_hotels" (
	"id" serial PRIMARY KEY NOT NULL,
	"event_id" integer NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"address" text,
	"phone" text,
	"website" text,
	"price_range" text,
	"distance" text,
	"image_url" text,
	"order_index" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "rsvp_itinerary" (
	"id" serial PRIMARY KEY NOT NULL,
	"event_id" integer NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"start_time" timestamp,
	"end_time" timestamp,
	"location" text,
	"order_index" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "rsvp_nearby_plans" (
	"id" serial PRIMARY KEY NOT NULL,
	"event_id" integer NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"category" text,
	"address" text,
	"website" text,
	"image_url" text,
	"order_index" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "rsvp_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"event_id" integer NOT NULL,
	"enabled" boolean DEFAULT true,
	"deadline" timestamp,
	"allow_plus_one" boolean DEFAULT false,
	"ask_dietary_restrictions" boolean DEFAULT true,
	"custom_message" text,
	"show_itinerary" boolean DEFAULT true,
	"show_hotels" boolean DEFAULT true,
	"show_nearby_plans" boolean DEFAULT true,
	"show_faqs" boolean DEFAULT true,
	"show_location" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "task_payments" (
	"id" serial PRIMARY KEY NOT NULL,
	"task_id" integer NOT NULL,
	"description" text NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"date" timestamp NOT NULL,
	"status" text DEFAULT 'pending',
	"created_by" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "task_participants" ALTER COLUMN "user_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "cover_image" text;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "contact_id" integer;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "phone" text;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "website" text;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "address" text;--> statement-breakpoint
ALTER TABLE "task_participants" ADD COLUMN "vendor_id" integer;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "category" text DEFAULT 'general';--> statement-breakpoint
ALTER TABLE "ai_analytics" ADD CONSTRAINT "ai_analytics_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_config" ADD CONSTRAINT "ai_config_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_conversations" ADD CONSTRAINT "ai_conversations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_conversations" ADD CONSTRAINT "ai_conversations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_documents" ADD CONSTRAINT "ai_documents_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_feedback" ADD CONSTRAINT "ai_feedback_message_id_ai_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."ai_messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_feedback" ADD CONSTRAINT "ai_feedback_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_messages" ADD CONSTRAINT "ai_messages_conversation_id_ai_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."ai_conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_prompts" ADD CONSTRAINT "ai_prompts_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_activities" ADD CONSTRAINT "contact_activities_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_activities" ADD CONSTRAINT "contact_activities_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_documents" ADD CONSTRAINT "contact_documents_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_documents" ADD CONSTRAINT "contact_documents_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_events" ADD CONSTRAINT "contact_events_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_events" ADD CONSTRAINT "contact_events_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_photos" ADD CONSTRAINT "contact_photos_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_photos" ADD CONSTRAINT "contact_photos_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_tags" ADD CONSTRAINT "contact_tags_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_tasks" ADD CONSTRAINT "contact_tasks_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_tasks" ADD CONSTRAINT "contact_tasks_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_documents" ADD CONSTRAINT "event_documents_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_documents" ADD CONSTRAINT "event_documents_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_payments" ADD CONSTRAINT "event_payments_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_payments" ADD CONSTRAINT "event_payments_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_payments" ADD CONSTRAINT "event_payments_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rsvp_faqs" ADD CONSTRAINT "rsvp_faqs_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rsvp_hotels" ADD CONSTRAINT "rsvp_hotels_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rsvp_itinerary" ADD CONSTRAINT "rsvp_itinerary_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rsvp_nearby_plans" ADD CONSTRAINT "rsvp_nearby_plans_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rsvp_settings" ADD CONSTRAINT "rsvp_settings_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_payments" ADD CONSTRAINT "task_payments_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_payments" ADD CONSTRAINT "task_payments_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_participants" ADD CONSTRAINT "task_participants_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE cascade ON UPDATE no action;