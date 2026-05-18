"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { IntegrationCard } from "./integration-card";
import { ComingSoonCard } from "./coming-soon-card";
import { useIntegrations } from "@/hooks/use-integrations";
import { useUserSession } from "@/hooks/use-user-session";
import { toast } from "sonner";
import { RiPlugLine } from "@remixicon/react";

interface IntegrationsPageProps {
  portalType: "tenant" | "provider";
}

export function IntegrationsPage({ portalType }: IntegrationsPageProps) {
  const t = useTranslations("settingsSub");
  const searchParams = useSearchParams();
  const { toolkits, comingSoonApps, loading, connect, disconnect, refresh } = useIntegrations();
  const { role, can } = useUserSession();

  const canManage =
    role === "owner" ||
    role === "admin" ||
    can("integrations:manage");

  useEffect(() => {
    const connected = searchParams.get("connected");
    const error = searchParams.get("error");

    if (connected) {
      toast.success(`${connected} ${t("integrationsConnectedOk")}`);
      refresh();
      window.history.replaceState(
        {},
        "",
        window.location.pathname
      );
    }
    if (error) {
      toast.error(
        error === "connection_failed"
          ? t("integrationsErrorConnection")
          : error === "missing_params"
          ? t("integrationsErrorMissingParams")
          : t("integrationsErrorUnexpected")
      );
      window.history.replaceState(
        {},
        "",
        window.location.pathname
      );
    }
  }, [searchParams, refresh]);

  const connectedToolkits = toolkits.filter((t) => t.isConnected);
  const availableToolkits = toolkits.filter((t) => !t.isConnected);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <RiPlugLine className="w-6 h-6" />
          {t("integrationsTitle")}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {t("integrationsSubtitle")}
        </p>
      </div>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : (
        <Tabs defaultValue={connectedToolkits.length > 0 ? "my-apps" : "marketplace"}>
          <TabsList>
            <TabsTrigger value="my-apps">
              {t("integrationsMyApps")}{" "}
              {connectedToolkits.length > 0 && (
                <span className="ml-1 text-[10px] bg-green-600 text-white rounded-full px-1.5">
                  {connectedToolkits.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="marketplace">{t("integrationsMarketplace")}</TabsTrigger>
          </TabsList>

          <TabsContent value="my-apps" className="mt-4 space-y-3">
            {connectedToolkits.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <RiPlugLine className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">{t("integrationsNoApps")}</p>
                <p className="text-xs mt-1">
                  {t("integrationsNoAppsHint")}
                </p>
              </div>
            ) : (
              connectedToolkits.map((toolkit) => (
                <IntegrationCard
                  key={toolkit.slug}
                  {...toolkit}
                  canManage={canManage}
                  onConnect={connect}
                  onDisconnect={disconnect}
                />
              ))
            )}
          </TabsContent>

          <TabsContent value="marketplace" className="mt-4 space-y-4">
            {/* Disponibles */}
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                {t("integrationsAvailable")}
              </h3>
              <div className="space-y-3">
                {toolkits.map((toolkit) => (
                  <IntegrationCard
                    key={toolkit.slug}
                    {...toolkit}
                    canManage={canManage}
                    onConnect={connect}
                    onDisconnect={disconnect}
                  />
                ))}
              </div>
            </div>

            {/* Próximamente */}
            {comingSoonApps.length > 0 && (
              <div className="border-t pt-4">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  {t("integrationsSoon")}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {comingSoonApps.map((app) => (
                    <ComingSoonCard key={app.slug} {...app} />
                  ))}
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}

      {!canManage && !loading && (
        <p className="text-xs text-muted-foreground border-t pt-3">
          {t("integrationsReadOnly")}
        </p>
      )}
    </div>
  );
}
