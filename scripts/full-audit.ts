import "dotenv/config";
import { neon } from "@neondatabase/serverless";

async function audit() {
  const sql = neon(process.env.DATABASE_URL!);

  console.log("\n🔍 AUDITORÍA COMPLETA: Drizzle Schema vs DB Real\n");
  console.log("=".repeat(60));

  let totalIssues = 0;
  let criticalIssues = 0;

  // ============================================
  // 1. CHECK ALL TABLES EXIST
  // ============================================
  console.log("\n📋 1. VERIFICANDO TABLAS\n");

  const allDbTables = await sql`
    SELECT table_name FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `;
  const dbTableNames = allDbTables.map((t: any) => t.table_name);

  const schemaTables = [
    "users", "accounts", "sessions", "verification_tokens",
    "platform_admins", "admin_invitations", "subscription_plans",
    "feature_flags", "platform_settings", "audit_logs", "announcements",
    "organizations", "subscriptions", "invoices",
    "roles", "permissions", "role_permissions",
    "organization_members", "invitations",
    "clients", "events", "event_documents", "vendors", "event_vendors",
    "provider_event_access",
    "tasks", "payments",
    "lead_stages", "leads", "lead_stage_history",
    "companies", "people", "people_companies",
    "contacts", "contact_documents", "contact_photos",
    "contact_activities", "contact_tags", "contact_events", "contact_tasks",
    "contact_relationships",
    "organization_finance_settings", "tax_rates", "product_catalog",
    "bank_accounts", "financial_documents", "document_items",
    "payment_records", "payment_schedules", "payment_reminders",
    "task_participants", "task_messages", "task_attachments",
    "task_videos", "task_schedule_items", "task_meetings",
    "task_html_content", "task_payments",
    "task_checklist_items", "task_checklist_assignees",
    "event_templates", "task_templates", "task_template_checklists",
    "event_participants", "briefing_forms", "briefing_responses",
    "event_tables", "guest_groups", "guests",
    "rsvp_responses", "guest_companions", "guest_checkins",
    "rsvp_landing_pages", "rsvp_settings", "rsvp_itinerary",
    "rsvp_hotels", "rsvp_nearby_plans", "rsvp_faqs",
    "rsvp_transport_options", "rsvp_transport_bookings",
    "event_payments",
    "vendor_profiles", "vendor_portfolio", "vendor_reviews", "vendor_claims",
    "ai_config", "ai_documents", "ai_prompts",
    "ai_conversations", "ai_messages", "ai_feedback", "ai_analytics",
    "notifications",
  ];

  const missingTables: string[] = [];
  const extraTables: string[] = [];

  for (const t of schemaTables) {
    if (!dbTableNames.includes(t)) {
      console.log(`  ❌ MISSING TABLE: ${t}`);
      missingTables.push(t);
      totalIssues++;
      criticalIssues++;
    }
  }

  for (const t of dbTableNames) {
    if (!schemaTables.includes(t)) {
      extraTables.push(t);
    }
  }

  if (missingTables.length === 0) {
    console.log(`  ✅ All ${schemaTables.length} schema tables exist in DB`);
  } else {
    console.log(`\n  ⚠️  ${missingTables.length} tables MISSING from DB`);
  }

  if (extraTables.length > 0) {
    console.log(`  ℹ️  Extra tables in DB not in schema: ${extraTables.join(", ")}`);
  }

  // ============================================
  // 2. CHECK ALL ENUMS
  // ============================================
  console.log("\n📋 2. VERIFICANDO ENUMS\n");

  const schemaEnums: Record<string, string[]> = {
    event_status: ["draft", "confirmed", "in_progress", "completed", "cancelled"],
    event_type: ["wedding", "pre_wedding", "post_wedding", "birthday", "corporate", "social", "other"],
    task_status: ["pending", "in_progress", "completed", "cancelled"],
    payment_status: ["pending", "partial", "paid", "refunded"],
    subscription_status: ["active", "canceled", "past_due", "trialing", "paused"],
    invitation_status: ["pending", "accepted", "expired", "revoked"],
    platform_admin_level: ["super_admin", "support"],
    org_status: ["active", "suspended", "deleted"],
    lead_status: ["new", "contacted", "qualified", "proposal", "negotiation", "won", "lost"],
    document_type: ["quote", "proforma", "invoice", "delivery_note", "credit_note"],
    document_status: ["draft", "approved", "sent", "accepted", "rejected", "paid", "cancelled", "delivered"],
    message_type: ["text", "file", "image", "link", "system"],
    participant_type: ["planner", "vendor", "client", "assistant", "guest", "contact"],
    attachment_type: ["file", "document", "image", "link"],
    rsvp_status: ["pending", "confirmed", "declined", "maybe"],
    vendor_claim_status: ["pending", "verified", "rejected"],
    org_type: ["tenant", "provider", "client"],
    verification_status: ["unverified", "verified", "rejected", "suspended"],
    user_status: ["active", "suspended"],
    contact_type: ["person", "company"],
    contact_source: ["manual", "import", "website", "referral", "social_media", "event", "other"],
    contact_activity_type: ["note", "call", "email", "meeting", "task_created", "event_linked", "lead_converted", "status_change", "other"],
    ai_document_category: ["faq", "tutorial", "feature", "policy", "general"],
    ai_prompt_context: ["general", "event", "task", "finance", "support", "onboarding"],
    ai_message_role: ["user", "assistant", "system"],
  };

  const dbEnums = await sql`
    SELECT t.typname AS enum_name, e.enumlabel AS enum_value
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    JOIN pg_catalog.pg_namespace n ON t.typnamespace = n.oid
    WHERE n.nspname = 'public'
    ORDER BY t.typname, e.enumsortorder
  `;

  const dbEnumMap: Record<string, string[]> = {};
  for (const row of dbEnums) {
    const name = (row as any).enum_name;
    const value = (row as any).enum_value;
    if (!dbEnumMap[name]) dbEnumMap[name] = [];
    dbEnumMap[name].push(value);
  }

  for (const [enumName, expectedValues] of Object.entries(schemaEnums)) {
    const dbValues = dbEnumMap[enumName];
    if (!dbValues) {
      console.log(`  ❌ MISSING ENUM: ${enumName}`);
      totalIssues++;
      criticalIssues++;
      continue;
    }

    const missingValues = expectedValues.filter(v => !dbValues.includes(v));
    const extraValues = dbValues.filter(v => !expectedValues.includes(v));

    if (missingValues.length > 0 || extraValues.length > 0) {
      console.log(`  ⚠️  ENUM MISMATCH: ${enumName}`);
      if (missingValues.length > 0) {
        console.log(`      Missing values: ${missingValues.join(", ")}`);
      }
      if (extraValues.length > 0) {
        console.log(`      Extra values in DB: ${extraValues.join(", ")}`);
      }
      totalIssues++;
      if (missingValues.length > 0) criticalIssues++;
    } else {
      console.log(`  ✅ ${enumName}: OK (${dbValues.length} values)`);
    }
  }

  // Check for extra enums in DB not in schema
  const extraEnums = Object.keys(dbEnumMap).filter(e => !(e in schemaEnums));
  if (extraEnums.length > 0) {
    console.log(`  ℹ️  Extra enums in DB: ${extraEnums.join(", ")}`);
  }

  // ============================================
  // 3. CHECK CRITICAL COLUMNS ON KEY TABLES
  // ============================================
  console.log("\n📋 3. VERIFICANDO COLUMNAS CRÍTICAS\n");

  const criticalColumnChecks: Record<string, string[]> = {
    users: [
      "id", "name", "email", "email_verified", "image",
      "password_hash", "must_change_password", "onboarding_completed",
      "status", "suspended_at", "suspended_by", "suspended_reason",
      "created_at", "updated_at",
    ],
    organizations: [
      "id", "name", "slug", "logo", "phone", "website", "address",
      "org_type", "status", "plan_id", "settings", "owner_id",
      "instagram_handle", "service_radius", "service_areas",
      "verification_status", "verified_at", "verified_by",
      "rejection_reason", "provider_category",
      "fiscal_name", "tax_id", "fiscal_address", "fiscal_city",
      "fiscal_postal_code", "fiscal_country", "fiscal_email",
      "fiscal_phone", "invoice_logo",
      "created_at", "updated_at",
    ],
    organization_members: [
      "id", "organization_id", "user_id", "role_id",
      "invited_by", "joined_at", "created_at",
    ],
    roles: [
      "id", "name", "slug", "description", "is_system",
      "organization_id", "created_at",
    ],
    permissions: [
      "id", "name", "slug", "resource", "action", "description",
    ],
    subscription_plans: [
      "id", "name", "slug", "description", "org_type",
      "price_monthly", "price_yearly", "features", "limits",
      "is_active", "sort_order", "created_at", "updated_at",
    ],
    subscriptions: [
      "id", "organization_id", "plan_id", "status",
      "trial_ends_at", "current_period_start", "current_period_end",
      "cancel_at", "canceled_at", "stripe_subscription_id",
      "stripe_customer_id", "created_at", "updated_at",
    ],
    organization_finance_settings: [
      "id", "organization_id", "default_currency",
      "enabled_currencies", "quote_prefix", "invoice_prefix",
      "proforma_prefix", "delivery_note_prefix", "credit_note_prefix",
      "next_quote_number", "next_invoice_number",
      "next_proforma_number", "next_delivery_note_number",
      "next_credit_note_number",
      "stripe_account_id", "stripe_enabled",
      "enable_cash", "enable_bank_transfer", "enable_stripe",
      "default_payment_method", "default_bank_account_id",
      "default_payment_terms", "default_terms_and_conditions",
      "quote_validity_days",
      "company_name", "tax_id", "fiscal_address",
      "fiscal_city", "fiscal_postal_code", "fiscal_country",
      "fiscal_email", "fiscal_phone",
      "created_at", "updated_at",
    ],
    contacts: [
      "id", "organization_id", "type", "name", "email", "phone",
      "phone_country_code", "avatar",
      "first_name", "last_name", "passport_id", "nie_or_cif",
      "trade_name", "tax_id", "website",
      "contact_person_name", "contact_person_email",
      "event_date", "guest_count", "budget", "venue_type",
      "address", "city", "state", "postal_code", "country",
      "bank_name", "bank_account_number", "bank_iban", "bank_swift",
      "payment_methods",
      "tags", "source", "lead_id", "is_lead", "lead_score", "notes",
      "category",
      "is_vendor", "vendor_category", "vendor_id",
      "created_by", "created_at", "updated_at", "deleted_at",
    ],
    financial_documents: [
      "id", "organization_id", "type", "number", "status",
      "company_id", "person_id", "event_id", "vendor_id", "contact_id",
      "parent_document_id", "direction",
      "issue_date", "due_date", "valid_until",
      "subtotal", "tax_amount", "total", "paid_amount", "currency",
      "global_discount", "global_discount_type",
      "payment_method", "payment_terms", "bank_account_id",
      "notes", "terms_and_conditions", "pdf_url",
      "sent_at", "paid_at",
      "stripe_payment_intent_id", "stripe_payment_url",
      "created_by", "created_at", "updated_at",
    ],
  };

  for (const [table, expectedColumns] of Object.entries(criticalColumnChecks)) {
    if (missingTables.includes(table)) {
      console.log(`  ⏭️  ${table}: SKIPPED (table missing)`);
      continue;
    }

    const cols = await sql`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = ${table} AND table_schema = 'public'
    `;
    const colNames = cols.map((c: any) => c.column_name);

    const missing = expectedColumns.filter(c => !colNames.includes(c));
    if (missing.length > 0) {
      console.log(`  ⚠️  ${table}: missing ${missing.length} columns`);
      for (const m of missing) {
        console.log(`      ❌ ${m}`);
      }
      totalIssues += missing.length;
      criticalIssues += missing.length;
    } else {
      console.log(`  ✅ ${table}: all ${expectedColumns.length} columns OK`);
    }
  }

  // ============================================
  // 4. SUMMARY
  // ============================================
  console.log("\n" + "=".repeat(60));
  console.log("\n📊 RESUMEN DE AUDITORÍA\n");
  console.log(`  Total issues: ${totalIssues}`);
  console.log(`  Critical issues: ${criticalIssues}`);
  console.log(`  Missing tables: ${missingTables.length > 0 ? missingTables.join(", ") : "None"}`);
  console.log(`  DB tables count: ${dbTableNames.length}`);
  console.log(`  Schema tables count: ${schemaTables.length}`);
  console.log(`  DB enums count: ${Object.keys(dbEnumMap).length}`);
  console.log(`  Schema enums count: ${Object.keys(schemaEnums).length}`);

  if (totalIssues === 0) {
    console.log("\n  ✅ ¡Sin issues! Schema y DB están sincronizados.\n");
  } else {
    console.log(`\n  ⚠️  Se encontraron ${totalIssues} issues (${criticalIssues} críticos)\n`);
  }

  process.exit(totalIssues > 0 ? 1 : 0);
}

audit().catch((e) => {
  console.error("Error:", e);
  process.exit(1);
});
