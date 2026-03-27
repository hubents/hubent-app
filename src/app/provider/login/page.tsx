import { redirect } from "next/navigation";

export default function ProviderLoginPage() {
  redirect("/auth/login");
}
