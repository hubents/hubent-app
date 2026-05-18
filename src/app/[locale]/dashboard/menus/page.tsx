"use client";

import { useTranslations } from "next-intl";
import { ComingSoonPage } from "@/components/ui/coming-soon-page";
import { EventScopedGuard } from "@/components/layout/event-scoped-guard";
import { RiRestaurantLine } from "@remixicon/react";

export default function MenusPage() {
  const t = useTranslations("menus");
  return (
    <EventScopedGuard>
    <ComingSoonPage
      icon={<RiRestaurantLine className="h-16 w-16" />}
      title={t("title")}
      description={t("description")}
      features={[
        t("feature1"),
        t("feature2"),
        t("feature3"),
        t("feature4"),
      ]}
    />
    </EventScopedGuard>
  );
}
