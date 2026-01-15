import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { users, organizations, organizationMembers } from "@/db/schema";
import { eq } from "drizzle-orm";

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
    currency: "USD",
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
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
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
      },
    };

    return NextResponse.json({
      success: true,
      data: preferences,
    });
  } catch (error) {
    console.error("Get preferences error:", error);
    return NextResponse.json(
      { error: "Error al obtener preferencias" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/user/preferences
 * Update user preferences
 */
export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const { section, data } = body;

    if (!section || !data) {
      return NextResponse.json(
        { error: "Sección y datos son requeridos" },
        { status: 400 }
      );
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
        };

        await db
          .update(organizations)
          .set({
            settings: newSettings,
            updatedAt: new Date(),
          })
          .where(eq(organizations.id, membership.organizationId));
      }
    }

    // Other preferences (notifications, appearance, privacy) are stored client-side
    // We just acknowledge the update here

    return NextResponse.json({
      success: true,
      message: "Preferencias actualizadas",
    });
  } catch (error) {
    console.error("Update preferences error:", error);
    return NextResponse.json(
      { error: "Error al actualizar preferencias" },
      { status: 500 }
    );
  }
}
