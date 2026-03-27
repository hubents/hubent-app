import { redirect } from "next/navigation";

export default function ProviderRegisterPage() {
  redirect("/auth/register?type=provider");
}
