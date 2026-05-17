import { MainSidebar } from "@/components/layout/main-sidebar";
import { EventSidebar } from "@/components/layout/event-sidebar";
import { Header } from "@/components/layout/header";
import { MobileHeaderClient, BottomNavClient } from "@/components/layout/mobile-nav-client";
import { OrgCookieSetter } from "@/components/layout/org-cookie-setter";
import { ImpersonationBanner } from "@/components/layout/impersonation-banner";
import { EventProvider } from "@/contexts/event-context";
import { UserSessionProvider } from "@/contexts/user-session-context";
import { DashboardContent } from "@/components/layout/dashboard-content";
import { RealtimeNotifications } from "@/components/notifications/realtime-notifications";
import { NotificationPrompt } from "@/components/notifications/notification-prompt";
import { ErrorBoundary } from "@/components/layout/error-boundary";
import { Suspense } from "react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <UserSessionProvider>
    <EventProvider>
      <div className="min-h-screen bg-[var(--background)]">
        <Suspense fallback={null}>
          <OrgCookieSetter />
        </Suspense>
        <ImpersonationBanner />
        <RealtimeNotifications />
        <NotificationPrompt />
        
        {/* Desktop Sidebars */}
        <MainSidebar />
        <EventSidebar />
        
        {/* Mobile Header */}
        <MobileHeaderClient />
        
        {/* Main Content Area */}
        <DashboardContent>
          {/* Desktop Header */}
          <div className="hidden md:block">
            <Header />
          </div>
          <ErrorBoundary>
            <main className="p-[var(--padding-page)] md:p-[var(--padding-page-lg)] pb-20 md:pb-[var(--padding-page-lg)]">{children}</main>
          </ErrorBoundary>
        </DashboardContent>
        
        {/* Mobile Bottom Navigation */}
        <BottomNavClient />
      </div>
    </EventProvider>
    </UserSessionProvider>
  );
}
