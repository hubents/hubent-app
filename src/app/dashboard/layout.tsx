import { MainSidebar } from "@/components/layout/main-sidebar";
import { EventSidebar } from "@/components/layout/event-sidebar";
import { Header } from "@/components/layout/header";
import { MobileHeader } from "@/components/layout/mobile-header";
import { BottomNav } from "@/components/layout/bottom-nav";
import { OrgCookieSetter } from "@/components/layout/org-cookie-setter";
import { EventProvider } from "@/contexts/event-context";
import { DashboardContent } from "@/components/layout/dashboard-content";
import { RealtimeNotifications } from "@/components/notifications/realtime-notifications";
import { NotificationPrompt } from "@/components/notifications/notification-prompt";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <EventProvider>
      <div className="min-h-screen bg-[var(--background)]">
        <OrgCookieSetter />
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
          <main className="p-4 md:p-6 pb-20 md:pb-6">{children}</main>
        </DashboardContent>
        
        {/* Mobile Bottom Navigation */}
        <BottomNav />
      </div>
    </EventProvider>
  );
}
