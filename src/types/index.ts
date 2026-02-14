// ============================================
// GLOBAL TYPES FOR HUBENTS
// ============================================

// User roles within a tenant (organization)
export type TenantRole = 
  | "owner"           // Full control, can delete org
  | "admin"           // Full control except delete org
  | "planner"         // Event planner - main user
  | "assistant"       // Planner assistant
  | "accountant"      // Finance only
  | "viewer"          // Read only
  | "provider_owner"  // Provider org owner
  | "provider_admin"  // Provider org admin
  | "provider_tech";  // Provider technician

// Organization types
export type OrgType = "tenant" | "provider" | "client";

// External user types (portal access)
export type ExternalUserType =
  | "vendor"     // Vendor with portal access
  | "client";    // Client (novios) with portal access

// Plan limits enforced by entitlement engine
export interface PlanLimits {
  maxUsers: number;    // -1 = unlimited
  maxEvents: number;   // -1 = unlimited
  maxStorage: number;  // MB, -1 = unlimited
}

// Plan info attached to session
export interface PlanInfo {
  id: number;
  slug: string;
  name: string;
  features: string[];
  limits: PlanLimits;
}

// Usage counters for quota checks
export interface UsageInfo {
  users: number;
  events: number;
  storage: number;
}

// Platform admin levels
export type PlatformAdminLevel =
  | "super_admin"
  | "support";

// Combined user context
export interface UserContext {
  userId: string;
  email: string;
  name?: string;
  image?: string;
  
  // Platform level (null if not platform admin)
  platformLevel?: PlatformAdminLevel;
  
  // Impersonation flag (super_admin viewing as tenant)
  isImpersonating?: boolean;
  
  // Current tenant context
  currentOrganization?: {
    id: number;
    name: string;
    slug: string;
    orgType: OrgType;
    role: TenantRole;
    permissions: string[];
  };
  
  // All organizations user belongs to
  organizations: Array<{
    id: number;
    name: string;
    slug: string;
    role: TenantRole;
  }>;
}

// Session with tenant context
export interface TenantSession {
  user: UserContext;
  organizationId: number;
  orgType: OrgType;
  role: TenantRole;
  permissions: string[];
  plan: PlanInfo | null;
  isImpersonating?: boolean;
}

// Permission check result
export interface PermissionCheck {
  allowed: boolean;
  reason?: string;
}

// API Response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
  };
}

// Pagination params
export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

// Filter params for queries
export interface FilterParams {
  search?: string;
  status?: string;
  dateFrom?: Date;
  dateTo?: Date;
  [key: string]: unknown;
}

// Event participant types
export type EventParticipantType = 
  | "planner"
  | "vendor"
  | "client"
  | "guest";

// Task participant with role
export interface TaskParticipant {
  userId: string;
  type: EventParticipantType;
  canEdit: boolean;
  canComment: boolean;
  addedAt: Date;
  addedBy: string;
}

// Chat message types
export type MessageType = 
  | "text"
  | "file"
  | "image"
  | "link"
  | "system";

// Task chat message
export interface TaskMessage {
  id: number;
  taskId: number;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  type: MessageType;
  content: string;
  isPrivate: boolean;
  visibleTo?: string[]; // User IDs who can see private message
  attachments?: TaskAttachment[];
  createdAt: Date;
  updatedAt?: Date;
  isEdited: boolean;
}

// Task attachment
export interface TaskAttachment {
  id: number;
  taskId: number;
  type: "file" | "document" | "image" | "link";
  name: string;
  url: string;
  size?: number;
  mimeType?: string;
  uploadedBy: string;
  uploadedAt: Date;
}

// Schedule item for "Orden del día"
export interface ScheduleItem {
  id: number;
  taskId: number;
  title: string;
  description?: string;
  date: Date;
  startTime: string;
  endTime?: string;
  location?: string;
  notes?: string;
  sortOrder: number;
}
