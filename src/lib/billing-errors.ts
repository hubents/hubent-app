import { toast } from "sonner";

type BillingErrorCode = "UpgradeRequired" | "LimitReached" | "SubscriptionInactive";

const BILLING_MESSAGES: Record<BillingErrorCode, { title: string; description: string; action: string }> = {
  UpgradeRequired: {
    title: "Función no disponible",
    description: "Tu plan actual no incluye esta funcionalidad.",
    action: "Ver planes",
  },
  LimitReached: {
    title: "Límite alcanzado",
    description: "Has alcanzado el límite de tu plan.",
    action: "Ampliar plan",
  },
  SubscriptionInactive: {
    title: "Suscripción inactiva",
    description: "Tu suscripción está inactiva. Actualiza tu método de pago.",
    action: "Gestionar suscripción",
  },
};

/**
 * Checks an API error message for billing-related error codes and shows
 * an actionable toast with a link to the billing settings.
 *
 * @returns true if the error was a billing error (handled), false otherwise
 */
export function handleBillingError(
  errorMessage: string,
  settingsPath: "dashboard" | "vendor" = "dashboard"
): boolean {
  const code = (Object.keys(BILLING_MESSAGES) as BillingErrorCode[]).find((c) =>
    errorMessage.includes(c)
  );

  if (!code) return false;

  const msg = BILLING_MESSAGES[code];
  const billingUrl = `/${settingsPath}/settings?billing=upgrade`;

  toast.error(msg.title, {
    description: msg.description,
    action: {
      label: msg.action,
      onClick: () => {
        window.location.href = billingUrl;
      },
    },
    duration: 8000,
  });

  return true;
}
