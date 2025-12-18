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

// ============================================
// NEXTAUTH TABLES
// ============================================

export const users = pgTable("users", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").notNull().unique(),
  emailVerified: timestamp("email_verified", { mode: "date" }),
  image: text("image"),
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

export const subscriptionPlans = pgTable("subscription_plans", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  priceMonthly: decimal("price_monthly", { precision: 10, scale: 2 }).default("0"),
  priceYearly: decimal("price_yearly", { precision: 10, scale: 2 }).default("0"),
  features: json("features").$type<string[]>(),
  limits: json("limits").$type<{
    users: number;
    events: number;
    vendors: number;
    storage: number;
  }>(),
  isActive: boolean("is_active").default(true),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

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
  status: orgStatusEnum("status").default("active"),
  planId: integer("plan_id").references(() => subscriptionPlans.id),
  settings: json("settings").$type<{
    timezone?: string;
    currency?: string;
    language?: string;
  }>(),
  ownerId: text("owner_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const subscriptions = pgTable("subscriptions", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  planId: integer("plan_id").notNull().references(() => subscriptionPlans.id),
  status: subscriptionStatusEnum("status").default("active"),
  currentPeriodStart: timestamp("current_period_start"),
  currentPeriodEnd: timestamp("current_period_end"),
  cancelAt: timestamp("cancel_at"),
  canceledAt: timestamp("canceled_at"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  stripeCustomerId: text("stripe_customer_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const invoices = pgTable("invoices", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id),
  subscriptionId: integer("subscription_id").references(() => subscriptions.id),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency").default("USD"),
  status: text("status").default("pending"),
  paidAt: timestamp("paid_at"),
  dueDate: timestamp("due_date"),
  stripeInvoiceId: text("stripe_invoice_id"),
  pdfUrl: text("pdf_url"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const roles = pgTable("roles", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  description: text("description"),
  isSystem: boolean("is_system").default(false),
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
  clientId: integer("client_id").references(() => clients.id),
  createdBy: text("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
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

export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  status: taskStatusEnum("status").default("pending"),
  priority: text("priority").default("medium"),
  dueDate: timestamp("due_date"),
  eventId: integer("event_id").references(() => events.id),
  assignedTo: text("assigned_to").references(() => users.id),
  createdBy: text("created_by").references(() => users.id),
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
