import { ProviderSidebar } from "@/components/layout/provider-sidebar";
import { VendorBottomNav } from "@/components/layout/vendor-bottom-nav";
import { Header } from "@/components/layout/header";
import { OrgCookieSetter } from "@/components/layout/org-cookie-setter";
import { ImpersonationBanner } from "@/components/layout/impersonation-banner";
import { RealtimeNotifications } from "@/components/notifications/realtime-notifications";
import { UserSessionProvider } from "@/contexts/user-session-context";
import { Suspense } from "react";

export default function VendorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <UserSessionProvider>
      <div className="min-h-screen bg-[var(--background)]">
        <Suspense fallback={null}>
          <OrgCookieSetter />
        </Suspense>
        <ImpersonationBanner />
        <RealtimeNotifications />

        {/* Provider Sidebar (desktop) */}
        <ProviderSidebar />

        {/* Main Content */}
        <div className="md:ml-[260px]">
          <div className="hidden md:block">
            <Header />
          </div>
          <main className="p-[var(--padding-page)] md:p-[var(--padding-page-lg)] pb-20 md:pb-[var(--padding-page-lg)]">
            {children}
          </main>
        </div>

        {/* Mobile Bottom Navigation */}
        <VendorBottomNav />
      </div>
    </UserSessionProvider>
  );
}
