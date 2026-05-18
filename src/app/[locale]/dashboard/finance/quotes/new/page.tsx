import { redirect } from "next/navigation";

export default function NewQuotePage() {
  redirect("/dashboard/finance/quotes?new=true");
}
