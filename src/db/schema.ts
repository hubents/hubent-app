import {
  pgTable,
  serial,
  text,
  timestamp,
  integer,
  boolean,
  decimal,
  pgEnum,
  primaryKey,
  json,
  jsonb,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ============================================
// ENUMS
// ============================================

export const eventStatusEnum = pgEnum("event_status", [
  "draft",
  "confirmed",
  "in_progress",
  "completed",
  "cancelled",
]);

export const eventTypeEnum = pgEnum("event_type", [
  "wedding",
  "pre_wedding",
  "post_wedding",
  "birthday",
  "corporate",
  "social",
  "other",
]);

export const taskStatusEnum = pgEnum("task_status", [
  "pending",
  "in_progress",
  "completed",
  "cancelled",
]);

export const paymentStatusEnum = pgEnum("payment_status", [
  "pending",
  "partial",
  "paid",
  "refunded",
]);

export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "active",
  "canceled",
  "past_due",
  "trialing",
  "paused",
]);

export const invitationStatusEnum = pgEnum("invitation_status", [
  "pending",
  "accepted",
  "expired",
  "revoked",
]);

export const platformAdminLevelEnum = pgEnum("platform_admin_level", [
  "super_admin",
  "support",
]);

export const orgStatusEnum = pgEnum("org_status", [
  "active",
  "suspended",
  "deleted",
]);

// New enums for extended functionality
export const leadStatusEnum = pgEnum("lead_status", [
  "new",
  "contacted",
  "qualified",
  "proposal",
  "negotiation",
  "won",
  "lost",
]);

export const documentTypeEnum = pgEnum("document_type", [
  "quote",
  "proforma",
  "invoice",
  "delivery_note",
  "credit_note",
]);

export const documentStatusEnum = pgEnum("document_status", [
  "draft",
  "approved",
  "sent",
  "accepted",
  "rejected",
  "paid",
  "cancelled",
  "delivered",
]);

export const messageTypeEnum = pgEnum("message_type", [
  "text",
  "file",
  "image",
  "link",
  "system",
]);

export const participantTypeEnum = pgEnum("participant_type", [
  "planner",
  "vendor",
  "client",
  "assistant",
  "guest",
  "contact",
]);

export const attachmentTypeEnum = pgEnum("attachment_type", [
  "file",
  "document",
  "image",
  "link",
]);

export const rsvpStatusEnum = pgEnum("rsvp_status", [
  "pending",
  "confirmed",
  "declined",
  "maybe",
]);

export const vendorClaimStatusEnum = pgEnum("vendor_claim_status", [
  "pending",
  "verified",
  "rejected",
]);

export const orgTypeEnum = pgEnum("org_type", [
  "tenant",
  "provider",
  "client",
]);

export const verificationStatusEnum = pgEnum("verification_status", [
  "unverified",
  "verified",
  "rejected",
  "suspended",
]);

// ============================================
// NEXTAUTH TABLES
// ============================================

export const userStatusEnum = pgEnum("user_status", [
  "active",
  "suspended",
]);

export const users = pgTable("users", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").notNull().unique(),
  emailVerified: timestamp("email_verified", { mode: "date" }),
  image: text("image"),
  passwordHash: text("password_hash"),
  mustChangePassword: boolean("must_change_password").default(false),
  onboardingCompleted: boolean("onboarding_completed").default(false),
  status: userStatusEnum("status").default("active"),
  suspendedAt: timestamp("suspended_at"),
  suspendedBy: text("suspended_by"),
  suspendedReason: text("suspended_reason"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const accounts = pgTable("accounts", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  provider: text("provider").notNull(),
  providerAccountId: text("provider_account_id").notNull(),
  refresh_token: text("refresh_token"),
  access_token: text("access_token"),
  expires_at: integer("expires_at"),
  token_type: text("token_type"),
  scope: text("scope"),
  id_token: text("id_token"),
  session_state: text("session_state"),
});

export const sessions = pgTable("sessions", {
  sessionToken: text("session_token").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable("verification_tokens", {
  identifier: text("identifier").notNull(),
  token: text("token").notNull().unique(),
  expires: timestamp("expires", { mode: "date" }).notNull(),
}, (vt) => ({
  compoundKey: primaryKey({ columns: [vt.identifier, vt.token] }),
}));

// ============================================
// PLATFORM TABLES (SuperAdmin)
// ============================================

export const platformAdmins = pgTable("platform_admins", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  level: platformAdminLevelEnum("level").default("support"),
  permissions: json("permissions").$type<string[]>(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const adminInvitations = pgTable("admin_invitations", {
  id: serial("id").primaryKey(),
  email: text("email").notNull(),
  level: platformAdminLevelEnum("level").notNull(),
  token: text("token").notNull().unique(),
  status: invitationStatusEnum("status").default("pending"),
  invitedBy: text("invited_by").references(() => users.id),
  expiresAt: timestamp("expires_at").notNull(),
  acceptedAt: timestamp("accepted_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const subscriptionPlans = pgTable("subscription_plans", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  orgType: orgTypeEnum("org_type").default("tenant"),
  priceMonthly: decimal("price_monthly", { precision: 10, scale: 2 }).default("0"),
  priceYearly: decimal("price_yearly", { precision: 10, scale: 2 }).default("0"),
  currency: text("currency").default("EUR"),
  features: json("features").$type<string[]>(),
  limits: json("limits").$type<PlanLimits>(),
  isActive: boolean("is_active").default(true),
  highlighted: boolean("highlighted").default(false),
  sortOrder: integer("sort_order").default(0),
  trialDays: integer("trial_days").default(14),
  stripeProductId: text("stripe_product_id"),
  stripePriceIdMonthly: text("stripe_price_id_monthly"),
  stripePriceIdYearly: text("stripe_price_id_yearly"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export interface PlanLimits {
  maxUsers: number;
  maxEvents: number;
  maxStorage: number;
}

export const featureFlags = pgTable("feature_flags", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  enabled: boolean("enabled").default(false),
  planIds: json("plan_ids").$type<number[]>(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const platformSettings = pgTable("platform_settings", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: text("value"),
  type: text("type").default("string"),
  description: text("description"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  actorId: text("actor_id").references(() => users.id),
  actorEmail: text("actor_email"),
  action: text("action").notNull(),
  resource: text("resource").notNull(),
  resourceId: text("resource_id"),
  details: json("details"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const announcements = pgTable("announcements", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  type: text("type").default("info"),
  isActive: boolean("is_active").default(true),
  startsAt: timestamp("starts_at"),
  endsAt: timestamp("ends_at"),
  targetPlanIds: json("target_plan_ids").$type<number[]>(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ============================================
// TENANT TABLES (Multi-tenant)
// ============================================

export const organizations = pgTable("organizations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  logo: text("logo"),
  phone: text("phone"),
  website: text("website"),
  address: text("address"),
  orgType: orgTypeEnum("org_type").default("tenant"),
  status: orgStatusEnum("status").default("active"),
  planId: integer("plan_id").references(() => subscriptionPlans.id),
  settings: json("settings").$type<{
    timezone?: string;
    currency?: string;
    language?: string;
  }>(),
  ownerId: text("owner_id").references(() => users.id),
  // Provider-specific fields
  instagramHandle: text("instagram_handle"),
  serviceRadius: integer("service_radius"),
  serviceAreas: json("service_areas").$type<string[]>(),
  verificationStatus: verificationStatusEnum("verification_status").default("unverified"),
  verifiedAt: timestamp("verified_at"),
  verifiedBy: text("verified_by").references(() => users.id),
  rejectionReason: text("rejection_reason"),
  providerCategory: text("provider_category"),
  // Fiscal data (unified source of truth for documents)
  fiscalName: text("fiscal_name"),
  taxId: text("tax_id"),
  fiscalAddress: text("fiscal_address"),
  fiscalCity: text("fiscal_city"),
  fiscalPostalCode: text("fiscal_postal_code"),
  fiscalCountry: text("fiscal_country").default("España"),
  fiscalEmail: text("fiscal_email"),
  fiscalPhone: text("fiscal_phone"),
  invoiceLogo: text("invoice_logo"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const subscriptions = pgTable("subscriptions", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  planId: integer("plan_id").notNull().references(() => subscriptionPlans.id),
  status: subscriptionStatusEnum("status").default("trialing"),
  trialEndsAt: timestamp("trial_ends_at"),
  currentPeriodStart: timestamp("current_period_start"),
  currentPeriodEnd: timestamp("current_period_end"),
  cancelAt: timestamp("cancel_at"),
  canceledAt: timestamp("canceled_at"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  stripeCustomerId: text("stripe_customer_id"),
  presentmentCurrency: text("presentment_currency"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const invoices = pgTable("invoices", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id),
  subscriptionId: integer("subscription_id").references(() => subscriptions.id),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency").default("EUR"),
  status: text("status").default("pending"),
  paidAt: timestamp("paid_at"),
  dueDate: timestamp("due_date"),
  stripeInvoiceId: text("stripe_invoice_id"),
  pdfUrl: text("pdf_url"),
  presentmentAmount: decimal("presentment_amount", { precision: 10, scale: 2 }),
  presentmentCurrency: text("presentment_currency"),
  period: text("period"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const roles = pgTable("roles", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  description: text("description"),
  isSystem: boolean("is_system").default(false),
  eventScoped: boolean("event_scoped").default(false),
  organizationId: integer("organization_id").references(() => organizations.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const permissions = pgTable("permissions", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  resource: text("resource").notNull(),
  action: text("action").notNull(),
  description: text("description"),
});

export const rolePermissions = pgTable("role_permissions", {
  roleId: integer("role_id").notNull().references(() => roles.id, { onDelete: "cascade" }),
  permissionId: integer("permission_id").notNull().references(() => permissions.id, { onDelete: "cascade" }),
}, (t) => ({
  pk: primaryKey({ columns: [t.roleId, t.permissionId] }),
}));

export const organizationMembers = pgTable("organization_members", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  roleId: integer("role_id").notNull().references(() => roles.id),
  invitedBy: text("invited_by").references(() => users.id),
  joinedAt: timestamp("joined_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const invitations = pgTable("invitations", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  roleId: integer("role_id").notNull().references(() => roles.id),
  token: text("token").notNull().unique(),
  status: invitationStatusEnum("status").default("pending"),
  invitedBy: text("invited_by").references(() => users.id),
  expiresAt: timestamp("expires_at").notNull(),
  acceptedAt: timestamp("accepted_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ============================================
// BUSINESS TABLES (Multi-tenant)
// ============================================

export const clients = pgTable("clients", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  address: text("address"),
  notes: text("notes"),
  createdBy: text("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const events = pgTable("events", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  type: eventTypeEnum("type").default("wedding"),
  status: eventStatusEnum("status").default("draft"),
  date: timestamp("date"),
  endDate: timestamp("end_date"),
  location: text("location"),
  guestCount: integer("guest_count").default(0),
  budget: decimal("budget", { precision: 10, scale: 2 }),
  description: text("description"),
  coverImage: text("cover_image"),
  clientId: integer("client_id").references(() => clients.id),
  createdBy: text("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const eventDocuments = pgTable("event_documents", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  url: text("url").notNull(),
  type: text("type").default("document"),
  size: integer("size"),
  mimeType: text("mime_type"),
  uploadedBy: text("uploaded_by").references(() => users.id),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
});

export const vendors = pgTable("vendors", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  category: text("category"),
  email: text("email"),
  phone: text("phone"),
  website: text("website"),
  address: text("address"),
  rating: integer("rating").default(0),
  notes: text("notes"),
  contactId: integer("contact_id"),
  createdBy: text("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const eventVendors = pgTable("event_vendors", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  vendorId: integer("vendor_id").notNull().references(() => vendors.id),
  service: text("service"),
  cost: decimal("cost", { precision: 10, scale: 2 }),
  status: text("status").default("pending"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const providerEventAccess = pgTable("provider_event_access", {
  id: serial("id").primaryKey(),
  providerOrgId: integer("provider_org_id").notNull().references(() => organizations.id),
  eventId: integer("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  plannerOrgId: integer("planner_org_id").notNull().references(() => organizations.id),
  vendorId: integer("vendor_id").references(() => vendors.id),
  invitedBy: text("invited_by").references(() => users.id),
  status: text("status").default("pending"),
  invitedAt: timestamp("invited_at").defaultNow(),
  acceptedAt: timestamp("accepted_at"),
});

export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  status: taskStatusEnum("status").default("pending"),
  priority: text("priority").default("medium"),
  category: text("category").default("general"),
  dueDate: timestamp("due_date"),
  eventId: integer("event_id").references(() => events.id),
  assignedTo: text("assigned_to").references(() => users.id),
  createdBy: text("created_by").references(() => users.id),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  eventId: integer("event_id").references(() => events.id),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  status: paymentStatusEnum("status").default("pending"),
  method: text("method"),
  description: text("description"),
  dueDate: timestamp("due_date"),
  paidAt: timestamp("paid_at"),
  createdBy: text("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// ============================================
// CRM TABLES (Leads, Companies, People)
// ============================================

export const leadStages = pgTable("lead_stages", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  color: text("color").default("#6366f1"),
  sortOrder: integer("sort_order").default(0),
  isDefault: boolean("is_default").default(false),
  isWon: boolean("is_won").default(false),
  isLost: boolean("is_lost").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const leads = pgTable("leads", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  value: decimal("value", { precision: 12, scale: 2 }),
  currency: text("currency").default("EUR"),
  stageId: integer("stage_id").references(() => leadStages.id),
  status: leadStatusEnum("status").default("new"),
  probability: integer("probability").default(50),
  expectedCloseDate: timestamp("expected_close_date"),
  source: text("source"),
  contactId: integer("contact_id"),
  companyId: integer("company_id"),
  personId: integer("person_id"),
  eventId: integer("event_id").references(() => events.id),
  assignedTo: text("assigned_to").references(() => users.id),
  createdBy: text("created_by").references(() => users.id),
  closedAt: timestamp("closed_at"),
  lostReason: text("lost_reason"),
  stageChangedAt: timestamp("stage_changed_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  deletedAt: timestamp("deleted_at"),
});

export const leadStageHistory = pgTable("lead_stage_history", {
  id: serial("id").primaryKey(),
  leadId: integer("lead_id").notNull().references(() => leads.id, { onDelete: "cascade" }),
  fromStageId: integer("from_stage_id").references(() => leadStages.id, { onDelete: "set null" }),
  toStageId: integer("to_stage_id").references(() => leadStages.id, { onDelete: "set null" }),
  changedBy: text("changed_by").references(() => users.id),
  durationSeconds: integer("duration_seconds"),
  changedAt: timestamp("changed_at").defaultNow(),
});

export const companies = pgTable("companies", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  legalName: text("legal_name").notNull(),
  tradeName: text("trade_name"),
  taxId: text("tax_id"),
  taxIdType: text("tax_id_type").default("cif"),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  postalCode: text("postal_code"),
  country: text("country").default("ES"),
  phone: text("phone"),
  email: text("email"),
  website: text("website"),
  logo: text("logo"),
  industry: text("industry"),
  notes: text("notes"),
  fiscalDataVerified: boolean("fiscal_data_verified").default(false),
  fiscalDataSource: text("fiscal_data_source"),
  createdBy: text("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  deletedAt: timestamp("deleted_at"),
});

export const people = pgTable("people", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  firstName: text("first_name").notNull(),
  lastName: text("last_name"),
  email: text("email"),
  phone: text("phone"),
  mobile: text("mobile"),
  position: text("position"),
  department: text("department"),
  linkedinUrl: text("linkedin_url"),
  avatar: text("avatar"),
  notes: text("notes"),
  userId: text("user_id").references(() => users.id),
  createdBy: text("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  deletedAt: timestamp("deleted_at"),
});

export const peopleCompanies = pgTable("people_companies", {
  id: serial("id").primaryKey(),
  personId: integer("person_id").notNull().references(() => people.id, { onDelete: "cascade" }),
  companyId: integer("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  role: text("role"),
  isPrimary: boolean("is_primary").default(false),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ============================================
// CONTACTS TABLES (Unified Contact Management)
// ============================================

export const contactTypeEnum = pgEnum("contact_type", [
  "person",
  "company",
]);

export const contactSourceEnum = pgEnum("contact_source", [
  "manual",
  "import",
  "website",
  "referral",
  "social_media",
  "event",
  "other",
]);

export const contacts = pgTable("contacts", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  
  // Type: person or company
  type: contactTypeEnum("type").notNull().default("person"),
  
  // Common fields
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  phoneCountryCode: text("phone_country_code").default("+34"),
  avatar: text("avatar"),
  
  // Person-specific fields
  firstName: text("first_name"),
  lastName: text("last_name"),
  passportId: text("passport_id"),
  nieOrCif: text("nie_or_cif"),
  
  // Company-specific fields
  tradeName: text("trade_name"),
  taxId: text("tax_id"),
  website: text("website"),
  contactPersonName: text("contact_person_name"),
  contactPersonEmail: text("contact_person_email"),
  
  // Event-related fields (for leads/clients)
  eventDate: timestamp("event_date"),
  guestCount: integer("guest_count"),
  budget: decimal("budget", { precision: 12, scale: 2 }),
  venueType: text("venue_type"),
  
  // Address fields
  address: text("address"),
  city: text("city"),
  state: text("state"),
  postalCode: text("postal_code"),
  country: text("country").default("ES"),
  
  // Bank information
  bankName: text("bank_name"),
  bankAccountNumber: text("bank_account_number"),
  bankIban: text("bank_iban"),
  bankSwift: text("bank_swift"),
  paymentMethods: json("payment_methods").$type<string[]>(),
  
  // Marketing/CRM fields
  tags: json("tags").$type<string[]>(),
  source: contactSourceEnum("source").default("manual"),
  leadId: integer("lead_id").references(() => leads.id),
  isLead: boolean("is_lead").default(false),
  leadScore: integer("lead_score").default(0),
  notes: text("notes"),
  
  // Category (for non-vendors: person/company categories)
  category: text("category"),
  
  // Vendor fields (for contacts that offer professional services)
  isVendor: boolean("is_vendor").default(false),
  vendorCategory: text("vendor_category"),
  vendorId: integer("vendor_id").references(() => vendors.id),
  
  // Metadata
  createdBy: text("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  deletedAt: timestamp("deleted_at"),
});

export const contactDocuments = pgTable("contact_documents", {
  id: serial("id").primaryKey(),
  contactId: integer("contact_id").notNull().references(() => contacts.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  url: text("url").notNull(),
  type: text("type").default("document"),
  size: integer("size"),
  mimeType: text("mime_type"),
  uploadedBy: text("uploaded_by").references(() => users.id),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
});

export const contactPhotos = pgTable("contact_photos", {
  id: serial("id").primaryKey(),
  contactId: integer("contact_id").notNull().references(() => contacts.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  thumbnail: text("thumbnail"),
  caption: text("caption"),
  sortOrder: integer("sort_order").default(0),
  uploadedBy: text("uploaded_by").references(() => users.id),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
});

export const contactActivityTypeEnum = pgEnum("contact_activity_type", [
  "note",
  "call",
  "email",
  "meeting",
  "task_created",
  "event_linked",
  "lead_converted",
  "status_change",
  "other",
]);

export const contactActivities = pgTable("contact_activities", {
  id: serial("id").primaryKey(),
  contactId: integer("contact_id").notNull().references(() => contacts.id, { onDelete: "cascade" }),
  type: contactActivityTypeEnum("type").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  metadata: json("metadata").$type<Record<string, unknown>>(),
  createdBy: text("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const contactTags = pgTable("contact_tags", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  color: text("color").default("#6366f1"),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Link contacts to events
export const contactEvents = pgTable("contact_events", {
  id: serial("id").primaryKey(),
  contactId: integer("contact_id").notNull().references(() => contacts.id, { onDelete: "cascade" }),
  eventId: integer("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  role: text("role"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Link contacts to tasks
export const contactTasks = pgTable("contact_tasks", {
  id: serial("id").primaryKey(),
  contactId: integer("contact_id").notNull().references(() => contacts.id, { onDelete: "cascade" }),
  taskId: integer("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
  role: text("role"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relationships between Person and Company contacts
export const contactRelationships = pgTable("contact_relationships", {
  id: serial("id").primaryKey(),
  personContactId: integer("person_contact_id").notNull().references(() => contacts.id, { onDelete: "cascade" }),
  companyContactId: integer("company_contact_id").notNull().references(() => contacts.id, { onDelete: "cascade" }),
  role: text("role"),
  isPrimary: boolean("is_primary").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// ============================================
// FINANCE TABLES
// ============================================

// Organization Finance Settings (per-tenant configuration)
export const organizationFinanceSettings = pgTable("organization_finance_settings", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().unique().references(() => organizations.id, { onDelete: "cascade" }),
  
  // Currency settings
  defaultCurrency: text("default_currency").default("EUR"),
  enabledCurrencies: jsonb("enabled_currencies").$type<string[]>().default(["EUR", "USD"]),
  
  // Document numbering
  quotePrefix: text("quote_prefix").default("PRES"),
  invoicePrefix: text("invoice_prefix").default("FAC"),
  proformaPrefix: text("proforma_prefix").default("PROF"),
  deliveryNotePrefix: text("delivery_note_prefix").default("ALB"),
  creditNotePrefix: text("credit_note_prefix").default("ABONO"),
  nextQuoteNumber: integer("next_quote_number").default(1),
  nextInvoiceNumber: integer("next_invoice_number").default(1),
  nextProformaNumber: integer("next_proforma_number").default(1),
  nextDeliveryNoteNumber: integer("next_delivery_note_number").default(1),
  nextCreditNoteNumber: integer("next_credit_note_number").default(1),
  
  // Stripe Connect
  stripeAccountId: text("stripe_account_id"),
  stripeEnabled: boolean("stripe_enabled").default(false),
  
  // Payment methods enabled
  enableCash: boolean("enable_cash").default(true),
  enableBankTransfer: boolean("enable_bank_transfer").default(true),
  enableStripe: boolean("enable_stripe").default(false),
  
  // Default payment method for documents
  defaultPaymentMethod: text("default_payment_method").default("bank_transfer"),
  defaultBankAccountId: integer("default_bank_account_id").references(() => bankAccounts.id),
  
  // Default terms
  defaultPaymentTerms: text("default_payment_terms").default("30 días"),
  defaultTermsAndConditions: text("default_terms_and_conditions"),
  quoteValidityDays: integer("quote_validity_days").default(30),
  
  // Fiscal data
  companyName: text("company_name"),
  taxId: text("tax_id"),
  fiscalAddress: text("fiscal_address"),
  fiscalCity: text("fiscal_city"),
  fiscalPostalCode: text("fiscal_postal_code"),
  fiscalCountry: text("fiscal_country").default("España"),
  fiscalEmail: text("fiscal_email"),
  fiscalPhone: text("fiscal_phone"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Tax Rates (per-tenant)
export const taxRates = pgTable("tax_rates", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  rate: decimal("rate", { precision: 5, scale: 2 }).notNull(),
  isDefault: boolean("is_default").default(false),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const productCatalog = pgTable("product_catalog", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  sku: text("sku"),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category"),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }),
  taxRate: decimal("tax_rate", { precision: 5, scale: 2 }).default("21"),
  unit: text("unit").default("unit"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const bankAccounts = pgTable("bank_accounts", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  bankName: text("bank_name"),
  bankIcon: text("bank_icon"),
  iban: text("iban"),
  swift: text("swift"),
  isDefault: boolean("is_default").default(false),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const financialDocuments = pgTable("financial_documents", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  type: documentTypeEnum("type").notNull(),
  number: text("number").notNull(),
  status: documentStatusEnum("status").default("draft"),
  companyId: integer("company_id").references(() => companies.id),
  personId: integer("person_id").references(() => people.id),
  eventId: integer("event_id").references(() => events.id),
  vendorId: integer("vendor_id").references(() => vendors.id),
  contactId: integer("contact_id").references(() => contacts.id),
  parentDocumentId: integer("parent_document_id"),
  direction: text("direction").default("outgoing"),
  issueDate: timestamp("issue_date").defaultNow(),
  dueDate: timestamp("due_date"),
  validUntil: timestamp("valid_until"),
  subtotal: decimal("subtotal", { precision: 12, scale: 2 }),
  taxAmount: decimal("tax_amount", { precision: 12, scale: 2 }),
  total: decimal("total", { precision: 12, scale: 2 }),
  paidAmount: decimal("paid_amount", { precision: 12, scale: 2 }).default("0"),
  currency: text("currency").default("EUR"),
  globalDiscount: decimal("global_discount", { precision: 10, scale: 2 }).default("0"),
  globalDiscountType: text("global_discount_type").default("percentage"),
  paymentMethod: text("payment_method"),
  paymentTerms: text("payment_terms"),
  bankAccountId: integer("bank_account_id").references(() => bankAccounts.id),
  notes: text("notes"),
  termsAndConditions: text("terms_and_conditions"),
  pdfUrl: text("pdf_url"),
  sentAt: timestamp("sent_at"),
  paidAt: timestamp("paid_at"),
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  stripePaymentUrl: text("stripe_payment_url"),
  createdBy: text("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const documentItems = pgTable("document_items", {
  id: serial("id").primaryKey(),
  documentId: integer("document_id").notNull().references(() => financialDocuments.id, { onDelete: "cascade" }),
  productId: integer("product_id").references(() => productCatalog.id),
  taxRateId: integer("tax_rate_id").references(() => taxRates.id),
  description: text("description").notNull(),
  quantity: decimal("quantity", { precision: 10, scale: 2 }).default("1"),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  discount: decimal("discount", { precision: 5, scale: 2 }).default("0"),
  taxRate: decimal("tax_rate", { precision: 5, scale: 2 }).default("21"),
  total: decimal("total", { precision: 12, scale: 2 }),
  sortOrder: integer("sort_order").default(0),
});

export const paymentRecords = pgTable("payment_records", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  documentId: integer("document_id").references(() => financialDocuments.id),
  taskId: integer("task_id").references(() => tasks.id),
  vendorId: integer("vendor_id").references(() => vendors.id),
  contactId: integer("contact_id").references(() => contacts.id),
  eventId: integer("event_id").references(() => events.id),
  bankAccountId: integer("bank_account_id").references(() => bankAccounts.id),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  currency: text("currency").default("EUR"),
  direction: text("direction").default("incoming"),
  paymentDate: timestamp("payment_date").defaultNow(),
  paymentMethod: text("payment_method"),
  reference: text("reference"),
  stripePaymentId: text("stripe_payment_id"),
  notes: text("notes"),
  createdBy: text("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const paymentSchedules = pgTable("payment_schedules", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  taskId: integer("task_id").references(() => tasks.id),
  eventId: integer("event_id").references(() => events.id),
  vendorId: integer("vendor_id").references(() => vendors.id),
  name: text("name").notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  dueDate: timestamp("due_date").notNull(),
  isPaid: boolean("is_paid").default(false),
  paidAt: timestamp("paid_at"),
  paymentRecordId: integer("payment_record_id").references(() => paymentRecords.id),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const paymentReminders = pgTable("payment_reminders", {
  id: serial("id").primaryKey(),
  documentId: integer("document_id").references(() => financialDocuments.id),
  scheduleId: integer("schedule_id").references(() => paymentSchedules.id),
  scheduledAt: timestamp("scheduled_at").notNull(),
  sentAt: timestamp("sent_at"),
  channel: text("channel").notNull(),
  status: text("status").default("pending"),
  messageTemplate: text("message_template"),
  response: text("response"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ============================================
// TASK TABLES (Extended with Chat)
// ============================================

export const taskParticipants = pgTable("task_participants", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
  userId: text("user_id").references(() => users.id, { onDelete: "cascade" }),
  vendorId: integer("vendor_id").references(() => vendors.id, { onDelete: "cascade" }),
  contactId: integer("contact_id").references(() => contacts.id, { onDelete: "cascade" }),
  type: participantTypeEnum("type").default("planner"),
  canEdit: boolean("can_edit").default(false),
  canComment: boolean("can_comment").default(true),
  addedBy: text("added_by").references(() => users.id),
  addedAt: timestamp("added_at").defaultNow(),
});

export const taskMessages = pgTable("task_messages", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
  senderId: text("sender_id").notNull().references(() => users.id),
  type: messageTypeEnum("type").default("text"),
  content: text("content").notNull(),
  isPrivate: boolean("is_private").default(false),
  visibleTo: json("visible_to").$type<string[]>(),
  isEdited: boolean("is_edited").default(false),
  editedAt: timestamp("edited_at"),
  createdAt: timestamp("created_at").defaultNow(),
  deletedAt: timestamp("deleted_at"),
});

export const taskAttachments = pgTable("task_attachments", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
  messageId: integer("message_id").references(() => taskMessages.id),
  type: attachmentTypeEnum("type").default("file"),
  name: text("name").notNull(),
  url: text("url").notNull(),
  thumbnail: text("thumbnail"),
  size: integer("size"),
  mimeType: text("mime_type"),
  uploadedBy: text("uploaded_by").references(() => users.id),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
});

export const taskVideos = pgTable("task_videos", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
  youtubeUrl: text("youtube_url").notNull(),
  title: text("title"),
  description: text("description"),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const taskScheduleItems = pgTable("task_schedule_items", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  date: timestamp("date").notNull(),
  startTime: text("start_time"),
  endTime: text("end_time"),
  location: text("location"),
  notes: text("notes"),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const taskMeetings = pgTable("task_meetings", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  date: timestamp("date").notNull(),
  startTime: text("start_time"),
  endTime: text("end_time"),
  location: text("location"),
  notes: text("notes"),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const taskHtmlContent = pgTable("task_html_content", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
  content: text("content"),
  updatedBy: text("updated_by").references(() => users.id),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const taskPayments = pgTable("task_payments", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
  description: text("description").notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  date: timestamp("date").notNull(),
  status: text("status").default("pending"),
  vendorId: integer("vendor_id").references(() => vendors.id),
  paymentMethod: text("payment_method"),
  notes: text("notes"),
  createdBy: text("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Task Checklist Items (To-Do List)
export const taskChecklistItems = pgTable("task_checklist_items", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  isCompleted: boolean("is_completed").default(false),
  dueDate: timestamp("due_date"),
  sortOrder: integer("sort_order").default(0),
  completedAt: timestamp("completed_at"),
  completedBy: text("completed_by").references(() => users.id),
  createdBy: text("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Task Checklist Assignees (N:N with task_participants)
export const taskChecklistAssignees = pgTable("task_checklist_assignees", {
  id: serial("id").primaryKey(),
  checklistItemId: integer("checklist_item_id").notNull().references(() => taskChecklistItems.id, { onDelete: "cascade" }),
  participantId: integer("participant_id").notNull().references(() => taskParticipants.id, { onDelete: "cascade" }),
  assignedAt: timestamp("assigned_at").defaultNow(),
  assignedBy: text("assigned_by").references(() => users.id),
});

// ============================================
// EVENT TEMPLATES
// ============================================

export const eventTemplates = pgTable("event_templates", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").references(() => organizations.id),
  name: text("name").notNull(),
  eventType: eventTypeEnum("event_type"),
  description: text("description"),
  defaultBudget: decimal("default_budget", { precision: 12, scale: 2 }),
  isGlobal: boolean("is_global").default(false),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const taskTemplates = pgTable("task_templates", {
  id: serial("id").primaryKey(),
  eventTemplateId: integer("event_template_id").notNull().references(() => eventTemplates.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  htmlContent: text("html_content"),
  category: text("category"),
  daysBeforeEvent: integer("days_before_event"),
  daysAfterEvent: integer("days_after_event"),
  assignToRole: text("assign_to_role"),
  priority: text("priority").default("medium"),
  estimatedHours: decimal("estimated_hours", { precision: 5, scale: 2 }),
  sortOrder: integer("sort_order").default(0),
});

export const taskTemplateChecklists = pgTable("task_template_checklists", {
  id: serial("id").primaryKey(),
  taskTemplateId: integer("task_template_id").notNull().references(() => taskTemplates.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  sortOrder: integer("sort_order").default(0),
});

export const eventParticipants = pgTable("event_participants", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  userId: text("user_id").references(() => users.id),
  vendorId: integer("vendor_id").references(() => vendors.id),
  clientId: integer("client_id").references(() => clients.id),
  contactId: integer("contact_id").references(() => contacts.id, { onDelete: "cascade" }),
  type: participantTypeEnum("type").notNull(),
  role: text("role"),
  permissions: json("permissions").$type<{
    general?: "view" | "edit" | "none";
    tasks?: "view" | "edit" | "none";
    guests?: "view" | "edit" | "none";
    rsvp?: "view" | "edit" | "none";
    vendors?: "view" | "none";
    finances?: "view" | "none";
    settings?: "none";
  }>(),
  invitedBy: text("invited_by").references(() => users.id),
  invitedAt: timestamp("invited_at").defaultNow(),
  acceptedAt: timestamp("accepted_at"),
});

export const briefingForms = pgTable("briefing_forms", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").references(() => organizations.id),
  name: text("name").notNull(),
  description: text("description"),
  targetType: text("target_type"),
  fields: json("fields").$type<Array<{
    id: string;
    type: string;
    label: string;
    required: boolean;
    options?: string[];
  }>>(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const briefingResponses = pgTable("briefing_responses", {
  id: serial("id").primaryKey(),
  formId: integer("form_id").notNull().references(() => briefingForms.id),
  eventId: integer("event_id").references(() => events.id),
  taskId: integer("task_id").references(() => tasks.id),
  respondentId: text("respondent_id").references(() => users.id),
  responses: json("responses").$type<Record<string, unknown>>(),
  status: text("status").default("pending"),
  submittedAt: timestamp("submitted_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ============================================
// EVENT TABLES (Floor Plan / Seating Chart)
// ============================================

export const eventTables = pgTable("event_tables", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  shape: text("shape").default("round"),
  capacity: integer("capacity").default(8),
  positionX: integer("position_x").default(100),
  positionY: integer("position_y").default(100),
  width: integer("width").default(120),
  height: integer("height").default(120),
  rotation: integer("rotation").default(0),
  color: text("color").default("#ffffff"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ============================================
// GUESTS AND RSVP
// ============================================

export const guestGroups = pgTable("guest_groups", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  tableNumber: integer("table_number"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const guests = pgTable("guests", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  groupId: integer("group_id").references(() => guestGroups.id),
  tableId: integer("table_id").references(() => eventTables.id, { onDelete: "set null" }),
  firstName: text("first_name").notNull(),
  lastName: text("last_name"),
  email: text("email"),
  phone: text("phone"),
  ageGroup: text("age_group").default("adult"),
  menuPreference: text("menu_preference"),
  plusOne: boolean("plus_one").default(false),
  plusOneName: text("plus_one_name"),
  dietaryRestrictions: text("dietary_restrictions"),
  notes: text("notes"),
  invitedBy: text("invited_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const rsvpResponses = pgTable("rsvp_responses", {
  id: serial("id").primaryKey(),
  guestId: integer("guest_id").notNull().references(() => guests.id, { onDelete: "cascade" }),
  status: rsvpStatusEnum("status").default("pending"),
  plusOneConfirmed: boolean("plus_one_confirmed").default(false),
  message: text("message"),
  respondedAt: timestamp("responded_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const guestCompanions = pgTable("guest_companions", {
  id: serial("id").primaryKey(),
  guestId: integer("guest_id").notNull().references(() => guests.id, { onDelete: "cascade" }),
  fullName: text("full_name").notNull(),
  menuPreference: text("menu_preference"),
  dietaryRestrictions: text("dietary_restrictions"),
  needsTransport: boolean("needs_transport").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const guestCheckins = pgTable("guest_checkins", {
  id: serial("id").primaryKey(),
  guestId: integer("guest_id").notNull().references(() => guests.id, { onDelete: "cascade" }),
  checkedInAt: timestamp("checked_in_at").notNull().defaultNow(),
  checkedInBy: text("checked_in_by").references(() => users.id),
  notes: text("notes"),
});

export const rsvpLandingPages = pgTable("rsvp_landing_pages", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  slug: text("slug").notNull().unique(),
  title: text("title"),
  description: text("description"),
  heroImage: text("hero_image"),
  customCss: text("custom_css"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// RSVP Settings per event
export const rsvpSettings = pgTable("rsvp_settings", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  enabled: boolean("enabled").default(true),
  deadline: timestamp("deadline"),
  allowPlusOne: boolean("allow_plus_one").default(false),
  maxCompanionsPerGuest: integer("max_companions_per_guest").default(1),
  askDietaryRestrictions: boolean("ask_dietary_restrictions").default(true),
  customMessage: text("custom_message"),
  showItinerary: boolean("show_itinerary").default(true),
  showHotels: boolean("show_hotels").default(true),
  showNearbyPlans: boolean("show_nearby_plans").default(true),
  showFaqs: boolean("show_faqs").default(true),
  showLocation: boolean("show_location").default(true),
  showTransport: boolean("show_transport").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Itinerary items for events
export const rsvpItinerary = pgTable("rsvp_itinerary", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  startTime: timestamp("start_time"),
  endTime: timestamp("end_time"),
  location: text("location"),
  orderIndex: integer("order_index").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// Recommended hotels
export const rsvpHotels = pgTable("rsvp_hotels", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  address: text("address"),
  phone: text("phone"),
  website: text("website"),
  priceRange: text("price_range"),
  distance: text("distance"),
  imageUrl: text("image_url"),
  orderIndex: integer("order_index").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// Nearby plans/activities
export const rsvpNearbyPlans = pgTable("rsvp_nearby_plans", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category"),
  address: text("address"),
  website: text("website"),
  imageUrl: text("image_url"),
  orderIndex: integer("order_index").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// FAQs
export const rsvpFaqs = pgTable("rsvp_faqs", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  orderIndex: integer("order_index").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// Transport options for RSVP
export const rsvpTransportOptions = pgTable("rsvp_transport_options", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  departureLocation: text("departure_location"),
  departureAddress: text("departure_address"),
  departureTime: text("departure_time"),
  returnTime: text("return_time"),
  capacity: integer("capacity"),
  price: decimal("price", { precision: 10, scale: 2 }).default("0"),
  mapImageUrl: text("map_image_url"),
  isActive: boolean("is_active").default(true),
  orderIndex: integer("order_index").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// Transport bookings per guest
export const rsvpTransportBookings = pgTable("rsvp_transport_bookings", {
  id: serial("id").primaryKey(),
  guestId: integer("guest_id").notNull().references(() => guests.id, { onDelete: "cascade" }),
  transportOptionId: integer("transport_option_id").notNull().references(() => rsvpTransportOptions.id, { onDelete: "cascade" }),
  seats: integer("seats").default(1),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ============================================
// EVENT PAYMENTS (Direct payments, not from tasks)
// ============================================

export const eventPayments = pgTable("event_payments", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  description: text("description").notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  status: text("status").default("pending"), // pending, paid, overdue
  dueDate: timestamp("due_date"),
  paidDate: timestamp("paid_date"),
  paidTo: text("paid_to"),
  paidBy: text("paid_by"),
  vendorId: integer("vendor_id").references(() => vendors.id),
  notes: text("notes"),
  createdBy: text("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ============================================
// VENDOR MARKETPLACE
// ============================================

export const vendorProfiles = pgTable("vendor_profiles", {
  id: serial("id").primaryKey(),
  vendorId: integer("vendor_id").references(() => vendors.id),
  userId: text("user_id").references(() => users.id),
  slug: text("slug").unique(),
  displayName: text("display_name"),
  tagline: text("tagline"),
  description: text("description"),
  coverImage: text("cover_image"),
  categories: json("categories").$type<string[]>(),
  services: json("services").$type<string[]>(),
  priceRange: text("price_range"),
  serviceAreas: json("service_areas").$type<string[]>(),
  instagramHandle: text("instagram_handle"),
  instagramAccessToken: text("instagram_access_token"),
  facebookUrl: text("facebook_url"),
  pinterestUrl: text("pinterest_url"),
  totalReviews: integer("total_reviews").default(0),
  averageRating: decimal("average_rating", { precision: 3, scale: 2 }),
  isPublic: boolean("is_public").default(false),
  isClaimed: boolean("is_claimed").default(false),
  claimedAt: timestamp("claimed_at"),
  isPremium: boolean("is_premium").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const vendorPortfolio = pgTable("vendor_portfolio", {
  id: serial("id").primaryKey(),
  profileId: integer("profile_id").notNull().references(() => vendorProfiles.id, { onDelete: "cascade" }),
  type: text("type").default("image"),
  url: text("url").notNull(),
  thumbnail: text("thumbnail"),
  title: text("title"),
  description: text("description"),
  eventType: text("event_type"),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const vendorReviews = pgTable("vendor_reviews", {
  id: serial("id").primaryKey(),
  profileId: integer("profile_id").notNull().references(() => vendorProfiles.id, { onDelete: "cascade" }),
  reviewerId: text("reviewer_id").references(() => users.id),
  eventId: integer("event_id").references(() => events.id),
  rating: integer("rating").notNull(),
  title: text("title"),
  content: text("content"),
  isVerified: boolean("is_verified").default(false),
  isPublic: boolean("is_public").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const vendorClaims = pgTable("vendor_claims", {
  id: serial("id").primaryKey(),
  profileId: integer("profile_id").notNull().references(() => vendorProfiles.id),
  email: text("email").notNull(),
  token: text("token").notNull().unique(),
  status: vendorClaimStatusEnum("status").default("pending"),
  verificationMethod: text("verification_method"),
  expiresAt: timestamp("expires_at").notNull(),
  verifiedAt: timestamp("verified_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ============================================
// RELATIONS
// ============================================

export const usersRelations = relations(users, ({ many }) => ({
  accounts: many(accounts),
  sessions: many(sessions),
  organizationMembers: many(organizationMembers),
}));

export const organizationsRelations = relations(organizations, ({ one, many }) => ({
  plan: one(subscriptionPlans, {
    fields: [organizations.planId],
    references: [subscriptionPlans.id],
  }),
  owner: one(users, {
    fields: [organizations.ownerId],
    references: [users.id],
  }),
  members: many(organizationMembers),
  subscriptions: many(subscriptions),
  events: many(events),
  clients: many(clients),
  vendors: many(vendors),
  tasks: many(tasks),
}));

export const organizationMembersRelations = relations(organizationMembers, ({ one }) => ({
  organization: one(organizations, {
    fields: [organizationMembers.organizationId],
    references: [organizations.id],
  }),
  user: one(users, {
    fields: [organizationMembers.userId],
    references: [users.id],
  }),
  role: one(roles, {
    fields: [organizationMembers.roleId],
    references: [roles.id],
  }),
}));

// ============================================
// AI ASSISTANT TABLES
// ============================================

export const aiDocumentCategoryEnum = pgEnum("ai_document_category", [
  "faq",
  "tutorial",
  "feature",
  "policy",
  "general",
]);

export const aiPromptContextEnum = pgEnum("ai_prompt_context", [
  "general",
  "event",
  "task",
  "finance",
  "support",
  "onboarding",
]);

export const aiMessageRoleEnum = pgEnum("ai_message_role", [
  "user",
  "assistant",
  "system",
]);

// Configuración global de la IA
export const aiConfig = pgTable("ai_config", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: text("value"),
  type: text("type").default("string"), // string, number, boolean, json
  description: text("description"),
  updatedBy: text("updated_by").references(() => users.id),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Documentación para RAG/contexto
export const aiDocuments = pgTable("ai_documents", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  category: aiDocumentCategoryEnum("category").default("general"),
  tags: json("tags").$type<string[]>(),
  isActive: boolean("is_active").default(true),
  priority: integer("priority").default(0),
  // Nuevos campos para archivos y links
  type: text("type").default("text"), // text, file, link
  fileUrl: text("file_url"),
  fileName: text("file_name"),
  fileSize: integer("file_size"),
  mimeType: text("mime_type"),
  linkUrl: text("link_url"),
  createdBy: text("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Prompts personalizados por contexto
export const aiPrompts = pgTable("ai_prompts", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  content: text("content").notNull(),
  context: aiPromptContextEnum("context").default("general"),
  roleTarget: text("role_target"), // null = todos, o específico: owner, admin, planner
  isActive: boolean("is_active").default(true),
  version: integer("version").default(1),
  createdBy: text("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Historial de conversaciones
export const aiConversations = pgTable("ai_conversations", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").notNull(),
  userId: text("user_id").notNull().references(() => users.id),
  organizationId: integer("organization_id").references(() => organizations.id),
  title: text("title"),
  messageCount: integer("message_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Mensajes individuales
export const aiMessages = pgTable("ai_messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull().references(() => aiConversations.id, { onDelete: "cascade" }),
  role: aiMessageRoleEnum("role").notNull(),
  content: text("content").notNull(),
  toolCalls: json("tool_calls").$type<object[]>(),
  tokenCount: integer("token_count"),
  latencyMs: integer("latency_ms"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Feedback de usuarios
export const aiFeedback = pgTable("ai_feedback", {
  id: serial("id").primaryKey(),
  messageId: integer("message_id").notNull().references(() => aiMessages.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id),
  rating: integer("rating"), // 1 = 👎, 5 = 👍
  comment: text("comment"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ============================================
// NOTIFICATIONS
// ============================================

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  organizationId: integer("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // task_assigned, new_message, mention, payment, rsvp, event_reminder
  title: text("title").notNull(),
  body: text("body").notNull(),
  data: json("data").$type<Record<string, string>>(),
  link: text("link"),
  read: boolean("read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Métricas agregadas diarias
export const aiAnalytics = pgTable("ai_analytics", {
  id: serial("id").primaryKey(),
  date: timestamp("date").notNull(),
  organizationId: integer("organization_id").references(() => organizations.id),
  totalConversations: integer("total_conversations").default(0),
  totalMessages: integer("total_messages").default(0),
  totalTokens: integer("total_tokens").default(0),
  avgLatencyMs: integer("avg_latency_ms"),
  positiveRatings: integer("positive_ratings").default(0),
  negativeRatings: integer("negative_ratings").default(0),
  topTools: json("top_tools").$type<Record<string, number>>(),
  createdAt: timestamp("created_at").defaultNow(),
});

// ============================================
// TYPES
// ============================================

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Organization = typeof organizations.$inferSelect;
export type NewOrganization = typeof organizations.$inferInsert;
export type OrganizationMember = typeof organizationMembers.$inferSelect;
export type Role = typeof roles.$inferSelect;
export type Permission = typeof permissions.$inferSelect;
export type SubscriptionPlan = typeof subscriptionPlans.$inferSelect;
export type Subscription = typeof subscriptions.$inferSelect;
export type Client = typeof clients.$inferSelect;
export type NewClient = typeof clients.$inferInsert;
export type Event = typeof events.$inferSelect;
export type NewEvent = typeof events.$inferInsert;
export type Vendor = typeof vendors.$inferSelect;
export type NewVendor = typeof vendors.$inferInsert;
export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;
export type Payment = typeof payments.$inferSelect;
export type NewPayment = typeof payments.$inferInsert;
export type AuditLog = typeof auditLogs.$inferSelect;
export type PlatformAdmin = typeof platformAdmins.$inferSelect;
export type Invitation = typeof invitations.$inferSelect;

// CRM Types
export type Lead = typeof leads.$inferSelect;
export type NewLead = typeof leads.$inferInsert;
export type LeadStage = typeof leadStages.$inferSelect;
export type Company = typeof companies.$inferSelect;
export type NewCompany = typeof companies.$inferInsert;
export type Person = typeof people.$inferSelect;
export type NewPerson = typeof people.$inferInsert;
export type PersonCompany = typeof peopleCompanies.$inferSelect;

// Contact Types
export type Contact = typeof contacts.$inferSelect;
export type NewContact = typeof contacts.$inferInsert;
export type ContactDocument = typeof contactDocuments.$inferSelect;
export type NewContactDocument = typeof contactDocuments.$inferInsert;
export type ContactPhoto = typeof contactPhotos.$inferSelect;
export type NewContactPhoto = typeof contactPhotos.$inferInsert;
export type ContactActivity = typeof contactActivities.$inferSelect;
export type NewContactActivity = typeof contactActivities.$inferInsert;
export type ContactTag = typeof contactTags.$inferSelect;
export type NewContactTag = typeof contactTags.$inferInsert;
export type ContactEvent = typeof contactEvents.$inferSelect;
export type ContactTask = typeof contactTasks.$inferSelect;

// Finance Types
export type ProductCatalogItem = typeof productCatalog.$inferSelect;
export type NewProductCatalogItem = typeof productCatalog.$inferInsert;
export type BankAccount = typeof bankAccounts.$inferSelect;
export type FinancialDocument = typeof financialDocuments.$inferSelect;
export type NewFinancialDocument = typeof financialDocuments.$inferInsert;
export type DocumentItem = typeof documentItems.$inferSelect;
export type PaymentRecord = typeof paymentRecords.$inferSelect;
export type PaymentSchedule = typeof paymentSchedules.$inferSelect;
export type PaymentReminder = typeof paymentReminders.$inferSelect;

// Task Types (Extended)
export type TaskParticipant = typeof taskParticipants.$inferSelect;
export type TaskMessage = typeof taskMessages.$inferSelect;
export type NewTaskMessage = typeof taskMessages.$inferInsert;
export type TaskAttachment = typeof taskAttachments.$inferSelect;
export type TaskVideo = typeof taskVideos.$inferSelect;
export type TaskScheduleItem = typeof taskScheduleItems.$inferSelect;
export type TaskHtmlContent = typeof taskHtmlContent.$inferSelect;
export type TaskChecklistItem = typeof taskChecklistItems.$inferSelect;
export type NewTaskChecklistItem = typeof taskChecklistItems.$inferInsert;
export type TaskChecklistAssignee = typeof taskChecklistAssignees.$inferSelect;
export type NewTaskChecklistAssignee = typeof taskChecklistAssignees.$inferInsert;

// Event Template Types
export type EventTemplate = typeof eventTemplates.$inferSelect;
export type NewEventTemplate = typeof eventTemplates.$inferInsert;
export type TaskTemplate = typeof taskTemplates.$inferSelect;
export type NewTaskTemplate = typeof taskTemplates.$inferInsert;
export type TaskTemplateChecklist = typeof taskTemplateChecklists.$inferSelect;
export type NewTaskTemplateChecklist = typeof taskTemplateChecklists.$inferInsert;
export type EventParticipant = typeof eventParticipants.$inferSelect;
export type BriefingForm = typeof briefingForms.$inferSelect;
export type BriefingResponse = typeof briefingResponses.$inferSelect;

// Guest & RSVP Types
export type GuestGroup = typeof guestGroups.$inferSelect;
export type Guest = typeof guests.$inferSelect;
export type NewGuest = typeof guests.$inferInsert;
export type RsvpResponse = typeof rsvpResponses.$inferSelect;
export type RsvpLandingPage = typeof rsvpLandingPages.$inferSelect;
export type RsvpSettings = typeof rsvpSettings.$inferSelect;
export type RsvpItineraryItem = typeof rsvpItinerary.$inferSelect;
export type RsvpHotel = typeof rsvpHotels.$inferSelect;
export type RsvpNearbyPlan = typeof rsvpNearbyPlans.$inferSelect;
export type RsvpFaq = typeof rsvpFaqs.$inferSelect;

// Vendor Marketplace Types
export type VendorProfile = typeof vendorProfiles.$inferSelect;
export type VendorPortfolioItem = typeof vendorPortfolio.$inferSelect;
export type VendorReview = typeof vendorReviews.$inferSelect;
export type VendorClaim = typeof vendorClaims.$inferSelect;

// Notifications Types
export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;

// AI Assistant Types
export type AiConfig = typeof aiConfig.$inferSelect;
export type NewAiConfig = typeof aiConfig.$inferInsert;
export type AiDocument = typeof aiDocuments.$inferSelect;
export type NewAiDocument = typeof aiDocuments.$inferInsert;
export type AiPrompt = typeof aiPrompts.$inferSelect;
export type NewAiPrompt = typeof aiPrompts.$inferInsert;
export type AiConversation = typeof aiConversations.$inferSelect;
export type NewAiConversation = typeof aiConversations.$inferInsert;
export type AiMessage = typeof aiMessages.$inferSelect;
export type NewAiMessage = typeof aiMessages.$inferInsert;
export type AiFeedback = typeof aiFeedback.$inferSelect;
export type NewAiFeedback = typeof aiFeedback.$inferInsert;
export type AiAnalytics = typeof aiAnalytics.$inferSelect;
