import { db } from "@/db";
import { 
  vendors,
  vendorProfiles,
  vendorPortfolio,
  vendorReviews,
  vendorClaims,
  contacts,
  users
} from "@/db/schema";
import { eq, and, desc, sql, isNull, ilike } from "drizzle-orm";
import type { TenantSession, PaginationParams, FilterParams } from "@/types";

// ============================================
// VENDORS (Internal)
// ============================================

export async function getVendors(
  session: TenantSession,
  params: PaginationParams & FilterParams & { category?: string } = {}
) {
  const { page = 1, limit = 50, search, category } = params;
  const offset = (page - 1) * limit;

  let whereClause = eq(vendors.organizationId, session.organizationId);

  if (search) {
    whereClause = and(whereClause, ilike(vendors.name, `%${search}%`))!;
  }

  if (category) {
    whereClause = and(whereClause, eq(vendors.category, category))!;
  }

  const results = await db
    .select()
    .from(vendors)
    .where(whereClause)
    .orderBy(desc(vendors.createdAt))
    .limit(limit)
    .offset(offset);

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(vendors)
    .where(whereClause);

  return {
    data: results,
    meta: {
      page,
      limit,
      total: Number(count),
      totalPages: Math.ceil(Number(count) / limit),
    },
  };
}

export async function getVendor(session: TenantSession, vendorId: number) {
  return db.query.vendors.findFirst({
    where: (v, { eq, and }) => 
      and(
        eq(v.id, vendorId),
        eq(v.organizationId, session.organizationId)
      ),
  });
}

export async function createVendor(
  session: TenantSession,
  data: {
    name: string;
    category?: string;
    email?: string;
    phone?: string;
    website?: string;
    address?: string;
    notes?: string;
  }
) {
  const [vendor] = await db.insert(vendors).values({
    organizationId: session.organizationId,
    name: data.name,
    category: data.category,
    email: data.email,
    phone: data.phone,
    website: data.website,
    address: data.address,
    notes: data.notes,
    createdBy: session.user.userId,
  }).returning();

  return vendor;
}

export async function updateVendor(
  session: TenantSession,
  vendorId: number,
  data: Partial<{
    name: string;
    category: string;
    email: string;
    phone: string;
    website: string;
    address: string;
    rating: number;
    notes: string;
  }>
) {
  const [updated] = await db.update(vendors)
    .set({ ...data, updatedAt: new Date() })
    .where(
      and(
        eq(vendors.id, vendorId),
        eq(vendors.organizationId, session.organizationId)
      )
    )
    .returning();

  // Sync common fields to linked contact if exists
  if (updated?.contactId) {
    const contactUpdates: Record<string, unknown> = { updatedAt: new Date() };
    if (data.name) contactUpdates.name = data.name;
    if (data.email) contactUpdates.email = data.email;
    if (data.phone) contactUpdates.phone = data.phone;
    if (data.website) contactUpdates.website = data.website;
    if (data.address) contactUpdates.address = data.address;
    if (data.notes) contactUpdates.notes = data.notes;
    if (data.category) contactUpdates.vendorCategory = data.category;

    if (Object.keys(contactUpdates).length > 1) {
      await db.update(contacts)
        .set(contactUpdates)
        .where(eq(contacts.id, updated.contactId));
    }
  }

  return updated;
}

export async function deleteVendor(session: TenantSession, vendorId: number) {
  await db.delete(vendors)
    .where(
      and(
        eq(vendors.id, vendorId),
        eq(vendors.organizationId, session.organizationId)
      )
    );
}

// ============================================
// VENDOR PROFILES (Public Marketplace)
// ============================================

export async function getPublicVendorProfiles(
  params: PaginationParams & { 
    category?: string; 
    serviceArea?: string;
    isPremium?: boolean;
  } = {}
) {
  const { page = 1, limit = 20, category, isPremium } = params;
  const offset = (page - 1) * limit;

  let whereClause = eq(vendorProfiles.isPublic, true);

  if (isPremium !== undefined) {
    whereClause = and(whereClause, eq(vendorProfiles.isPremium, isPremium))!;
  }

  const results = await db
    .select({
      id: vendorProfiles.id,
      slug: vendorProfiles.slug,
      displayName: vendorProfiles.displayName,
      tagline: vendorProfiles.tagline,
      coverImage: vendorProfiles.coverImage,
      categories: vendorProfiles.categories,
      priceRange: vendorProfiles.priceRange,
      serviceAreas: vendorProfiles.serviceAreas,
      totalReviews: vendorProfiles.totalReviews,
      averageRating: vendorProfiles.averageRating,
      isPremium: vendorProfiles.isPremium,
    })
    .from(vendorProfiles)
    .where(whereClause)
    .orderBy(desc(vendorProfiles.isPremium), desc(vendorProfiles.averageRating))
    .limit(limit)
    .offset(offset);

  return results;
}

export async function getVendorProfileBySlug(slug: string) {
  const profile = await db.query.vendorProfiles.findFirst({
    where: (p, { eq, and }) => 
      and(
        eq(p.slug, slug),
        eq(p.isPublic, true)
      ),
  });

  if (!profile) return null;

  // Get portfolio
  const portfolio = await db.query.vendorPortfolio.findMany({
    where: (p, { eq }) => eq(p.profileId, profile.id),
    orderBy: (p, { asc }) => [asc(p.sortOrder)],
  });

  // Get reviews
  const reviews = await db
    .select({
      id: vendorReviews.id,
      rating: vendorReviews.rating,
      title: vendorReviews.title,
      content: vendorReviews.content,
      isVerified: vendorReviews.isVerified,
      createdAt: vendorReviews.createdAt,
      reviewerName: users.name,
      reviewerImage: users.image,
    })
    .from(vendorReviews)
    .leftJoin(users, eq(vendorReviews.reviewerId, users.id))
    .where(
      and(
        eq(vendorReviews.profileId, profile.id),
        eq(vendorReviews.isPublic, true)
      )
    )
    .orderBy(desc(vendorReviews.createdAt))
    .limit(10);

  return {
    ...profile,
    portfolio,
    reviews,
  };
}

export async function createVendorProfile(
  session: TenantSession,
  vendorId: number,
  data: {
    slug: string;
    displayName: string;
    tagline?: string;
    description?: string;
    coverImage?: string;
    categories?: string[];
    services?: string[];
    priceRange?: string;
    serviceAreas?: string[];
    instagramHandle?: string;
    facebookUrl?: string;
    pinterestUrl?: string;
  }
) {
  const [profile] = await db.insert(vendorProfiles).values({
    vendorId,
    slug: data.slug,
    displayName: data.displayName,
    tagline: data.tagline,
    description: data.description,
    coverImage: data.coverImage,
    categories: data.categories,
    services: data.services,
    priceRange: data.priceRange,
    serviceAreas: data.serviceAreas,
    instagramHandle: data.instagramHandle,
    facebookUrl: data.facebookUrl,
    pinterestUrl: data.pinterestUrl,
    isPublic: false,
  }).returning();

  return profile;
}

export async function updateVendorProfile(
  profileId: number,
  data: Partial<{
    displayName: string;
    tagline: string;
    description: string;
    coverImage: string;
    categories: string[];
    services: string[];
    priceRange: string;
    serviceAreas: string[];
    instagramHandle: string;
    facebookUrl: string;
    pinterestUrl: string;
    isPublic: boolean;
  }>
) {
  const [updated] = await db.update(vendorProfiles)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(vendorProfiles.id, profileId))
    .returning();

  return updated;
}

// ============================================
// VENDOR CLAIMS (Claim Your Profile)
// ============================================

function generateToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

export async function createVendorClaim(
  profileId: number,
  email: string,
  expiresInDays: number = 7
) {
  const token = generateToken();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expiresInDays);

  const [claim] = await db.insert(vendorClaims).values({
    profileId,
    email,
    token,
    status: "pending",
    expiresAt,
  }).returning();

  return {
    claim,
    claimUrl: `${process.env.NEXT_PUBLIC_APP_URL}/vendor/claim/${token}`,
  };
}

export async function verifyVendorClaim(token: string, userId: string) {
  const claim = await db.query.vendorClaims.findFirst({
    where: (c, { eq }) => eq(c.token, token),
  });

  if (!claim) {
    throw new Error("Claim not found");
  }

  if (claim.status !== "pending") {
    throw new Error(`Claim is ${claim.status}`);
  }

  if (new Date() > claim.expiresAt) {
    await db.update(vendorClaims)
      .set({ status: "rejected" })
      .where(eq(vendorClaims.id, claim.id));
    throw new Error("Claim has expired");
  }

  // Update claim
  await db.update(vendorClaims)
    .set({ 
      status: "verified",
      verifiedAt: new Date(),
    })
    .where(eq(vendorClaims.id, claim.id));

  // Update profile
  await db.update(vendorProfiles)
    .set({
      userId,
      isClaimed: true,
      claimedAt: new Date(),
    })
    .where(eq(vendorProfiles.id, claim.profileId));

  return claim;
}

// ============================================
// VENDOR REVIEWS
// ============================================

export async function createVendorReview(
  profileId: number,
  reviewerId: string,
  data: {
    rating: number;
    title?: string;
    content?: string;
    eventId?: number;
  }
) {
  const [review] = await db.insert(vendorReviews).values({
    profileId,
    reviewerId,
    rating: data.rating,
    title: data.title,
    content: data.content,
    eventId: data.eventId,
    isVerified: !!data.eventId,
    isPublic: true,
  }).returning();

  // Update profile stats
  const reviews = await db.query.vendorReviews.findMany({
    where: (r, { eq }) => eq(r.profileId, profileId),
  });

  const totalReviews = reviews.length;
  const averageRating = reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews;

  await db.update(vendorProfiles)
    .set({
      totalReviews,
      averageRating: averageRating.toFixed(2),
    })
    .where(eq(vendorProfiles.id, profileId));

  return review;
}

// ============================================
// VENDOR PORTFOLIO
// ============================================

export async function addPortfolioItem(
  profileId: number,
  data: {
    type?: string;
    url: string;
    thumbnail?: string;
    title?: string;
    description?: string;
    eventType?: string;
  }
) {
  // Get next sort order
  const [{ maxOrder }] = await db
    .select({ maxOrder: sql<number>`COALESCE(MAX(${vendorPortfolio.sortOrder}), 0)` })
    .from(vendorPortfolio)
    .where(eq(vendorPortfolio.profileId, profileId));

  const [item] = await db.insert(vendorPortfolio).values({
    profileId,
    type: data.type || "image",
    url: data.url,
    thumbnail: data.thumbnail,
    title: data.title,
    description: data.description,
    eventType: data.eventType,
    sortOrder: Number(maxOrder) + 1,
  }).returning();

  return item;
}

export async function deletePortfolioItem(itemId: number) {
  await db.delete(vendorPortfolio)
    .where(eq(vendorPortfolio.id, itemId));
}
