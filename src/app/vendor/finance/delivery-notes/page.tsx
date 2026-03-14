"use client";

import { Suspense } from "react";
import { DeliveryNotesContent } from "@/app/dashboard/finance/delivery-notes/page";

export default function VendorDeliveryNotesPage() {
  return (
    <Suspense>
      <DeliveryNotesContent basePath="/vendor/finance/delivery-notes" />
    </Suspense>
  );
}
