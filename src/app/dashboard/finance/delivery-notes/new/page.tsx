import { redirect } from "next/navigation";

export default function NewDeliveryNotePage() {
  redirect("/dashboard/finance/delivery-notes?new=true");
}
