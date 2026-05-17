import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { organizations, organizationMembers, organizationFinanceSettings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { apiHandler, ok, badRequest } from "@/lib/api-handler";

// User preferences stored in a JSON field
interface UserPreferences {
  notifications: {
    email: boolean;
    push: boolean;
    sound: boolean;
    taskReminders: boolean;
    eventUpdates: boolean;
    teamActivity: boolean;
    marketing: boolean;
  };
  appearance: {
    theme: "light" | "dark" | "system";
    compactMode: boolean;
    sidebarCollapsed: boolean;
  };
  locale: {
    language: string;
    timezone: string;
    dateFormat: string;
    currency: string;
  };
  privacy: {
    showProfile: boolean;
    showActivity: boolean;
    allowAnalytics: boolean;
  };
}

const DEFAULT_PREFERENCES: UserPreferences = {
  notifications: {
    email: true,
    push: true,
    sound: true,
    taskReminders: true,
    eventUpdates: true,
    teamActivity: true,
    marketing: false,
  },
  appearance: {
    theme: "system",
    compactMode: false,
    sidebarCollapsed: false,
  },
  locale: {
    language: "es",
    timezone: "America/Argentina/Buenos_Aires",
    dateFormat: "DD/MM/YYYY",
    currency: "EUR",
  },
  privacy: {
    showProfile: true,
    showActivity: true,
    allowAnalytics: true,
  },
};

/**
 * GET /api/user/preferences
 * Get user preferences
 */
export async function GET() {
  return apiHandler(async () => {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "No autorizado" } },
        { status: 401 }
      );
    }

    // For now, we'll store preferences in localStorage on the client
    // and organization settings in the database
    // This returns the default preferences merged with any stored ones

    // Get organization settings for locale defaults
    const membership = await db.query.organizationMembers.findFirst({
      where: eq(organizationMembers.userId, session.user.id),
    });

    let orgSettings = null;
    if (membership) {
      const org = await db.query.organizations.findFirst({
        where: eq(organizations.id, membership.organizationId),
      });
      orgSettings = org?.settings;
    }

    // Merge org settings into default preferences
    const preferences = {
      ...DEFAULT_PREFERENCES,
      locale: {
        ...DEFAULT_PREFERENCES.locale,
        timezone: orgSettings?.timezone || DEFAULT_PREFERENCES.locale.timezone,
        currency: orgSettings?.currency || DEFAULT_PREFERENCES.locale.currency,
        language: orgSettings?.language || DEFAULT_PREFERENCES.locale.language,
        dateFormat: orgSettings?.dateFormat || DEFAULT_PREFERENCES.locale.dateFormat,
      },
    };

    return ok(preferences);
  }, "GET /api/user/preferences");
}

/**
 * PATCH /api/user/preferences
 * Update user preferences
 */
export async function PATCH(request: NextRequest) {
  return apiHandler(async () => {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "No autorizado" } },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { section, data } = body;

    if (!section || !data) {
      return badRequest("Sección y datos son requeridos");
    }

    // Handle locale settings - these are stored in organization
    if (section === "locale") {
      const membership = await db.query.organizationMembers.findFirst({
        where: eq(organizationMembers.userId, session.user.id),
      });

      if (membership) {
        const org = await db.query.organizations.findFirst({
          where: eq(organizations.id, membership.organizationId),
        });

        const currentSettings = org?.settings || {};
        const newSettings = {
          ...currentSettings,
          timezone: data.timezone || currentSettings.timezone,
          currency: data.currency || currentSettings.currency,
          language: data.language || currentSettings.language,
          dateFormat: data.dateFormat || currentSettings.dateFormat,
        };

        await db
          .update(organizations)
          .set({
            settings: newSettings,
            updatedAt: new Date(),
          })
          .where(eq(organizations.id, membership.organizationId));

        // Keep finance settings in sync with the locale currency
        if (data.currency) {
          const [existingFinance] = await db
            .select({ id: organizationFinanceSettings.id })
            .from(organizationFinanceSettings)
            .where(eq(organizationFinanceSettings.organizationId, membership.organizationId))
            .limit(1);

          if (existingFinance) {
            await db
              .update(organizationFinanceSettings)
              .set({ defaultCurrency: data.currency, updatedAt: new Date() })
              .where(eq(organizationFinanceSettings.organizationId, membership.organizationId));
          }
        }
      }
    }

    // Other preferences (notifications, appearance, privacy) are stored client-side
    // We just acknowledge the update here

    return ok({ message: "Preferencias actualizadas" });
  }, "PATCH /api/user/preferences");
}
