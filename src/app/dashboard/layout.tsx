import { MainSidebar } from "@/components/layout/main-sidebar";
import { EventSidebar } from "@/components/layout/event-sidebar";
import { Header } from "@/components/layout/header";
import { MobileHeader } from "@/components/layout/mobile-header";
import { BottomNav } from "@/components/layout/bottom-nav";
import { OrgCookieSetter } from "@/components/layout/org-cookie-setter";
import { ImpersonationBanner } from "@/components/layout/impersonation-banner";
import { EventProvider } from "@/contexts/event-context";
import { DashboardContent } from "@/components/layout/dashboard-content";
import { RealtimeNotifications } from "@/components/notifications/realtime-notifications";
import { NotificationPrompt } from "@/components/notifications/notification-prompt";
import { Suspense } from "react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
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
        <MobileHeader />
        
        {/* Main Content Area */}
        <DashboardContent>
          {/* Desktop Header */}
          <div className="hidden md:block">
            <Header />
          </div>
          <main className="p-[var(--padding-page)] md:p-[var(--padding-page-lg)] pb-20 md:pb-[var(--padding-page-lg)]">{children}</main>
        </DashboardContent>
        
        {/* Mobile Bottom Navigation */}
        <BottomNav />
      </div>
    </EventProvider>
  );
}
