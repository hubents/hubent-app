import { auth } from "@/lib/auth";
import { NextResponse, type NextRequest } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import { routing } from "@/i18n/routing";

const intlMiddleware = createIntlMiddleware(routing);

// Routes matched against pathname WITHOUT locale prefix
const PUBLIC_ROUTES = ["/", "/api/auth", "/api/public", "/api/v1", "/components", "/terms", "/privacy", "/providers", "/f", "/developers"];
const TENANT_AUTH_ROUTES = ["/auth"];
const ADMIN_AUTH_ROUTES = ["/admin/login", "/admin/invite"];
const DASHBOARD_ROUTES = ["/dashboard", "/onboarding", "/billing", "/select-org"];
const INVITE_ROUTES = ["/invite"];
const CLIENT_PORTAL_ROUTES = ["/client"];

// Paths that should NOT get a locale prefix
const UNLOCALIZED_PREFIXES = ["/api/", "/f/", "/_next/", "/admin", "/claim", "/invite", "/payment", "/rsvp", "/terms", "/privacy", "/developers", "/providers"];

function stripLocale(pathname: string): string {
  const match = routing.locales.find(
    (l) => pathname.startsWith(`/${l}/`) || pathname === `/${l}`
  );
  return match ? pathname.slice(`/${match}`.length) || "/" : pathname;
}

function getLocale(pathname: string): string {
  const match = routing.locales.find(
    (l) => pathname.startsWith(`/${l}/`) || pathname === `/${l}`
  );
  return match || routing.defaultLocale;
}

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;
  const pathname = nextUrl.pathname;

  const isUnlocalized = UNLOCALIZED_PREFIXES.some((p) => pathname.startsWith(p));

  // Run intl middleware first; capture its response to preserve locale headers
  let intlBaseResponse: NextResponse | undefined;
  if (!isUnlocalized) {
    const intlResponse = intlMiddleware(req as NextRequest);
    const location = intlResponse.headers.get("location");
    if (location && intlResponse.status >= 300 && intlResponse.status < 400) {
      return intlResponse;
    }
    // Keep the intl response as base so its x-next-intl-locale request headers survive
    intlBaseResponse = intlResponse;
  }

  const pathnameForAuth = stripLocale(pathname);
  const locale = getLocale(pathname);

  const isPublicRoute = PUBLIC_ROUTES.some(
    (route) => pathnameForAuth === route || pathnameForAuth.startsWith(`${route}/`)
  );
  const isTenantAuthRoute = TENANT_AUTH_ROUTES.some(
    (route) => pathnameForAuth === route || pathnameForAuth.startsWith(`${route}/`)
  );
  const isAdminAuthRoute = ADMIN_AUTH_ROUTES.some(
    (route) => pathnameForAuth === route || pathnameForAuth.startsWith(`${route}/`)
  );
  const isDashboardRoute = DASHBOARD_ROUTES.some(
    (route) => pathnameForAuth === route || pathnameForAuth.startsWith(`${route}/`)
  );
  const isInviteRoute = INVITE_ROUTES.some(
    (route) => pathnameForAuth === route || pathnameForAuth.startsWith(`${route}/`)
  );
  const isClientPortal = CLIENT_PORTAL_ROUTES.some((route) =>
    pathnameForAuth.startsWith(route)
  );
  const isVendorPortal = pathnameForAuth.startsWith("/vendor");
  const isProviderLogin = pathnameForAuth === "/provider/login";

  const localeRedirect = (path: string) =>
    NextResponse.redirect(new URL(`/${locale}${path}`, nextUrl));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const reqAny = req as any;
  if (isPublicRoute) return buildResponse(reqAny, isLoggedIn, intlBaseResponse);
  if (isInviteRoute) return intlBaseResponse ?? NextResponse.next();

  if (isProviderLogin) return localeRedirect("/auth/login");
  if (pathnameForAuth === "/provider/register" || pathnameForAuth.startsWith("/provider/register/")) {
    return localeRedirect("/auth/register");
  }
  if (isVendorPortal) {
    const dashboardPath = pathnameForAuth.replace(/^\/vendor/, "/dashboard");
    return NextResponse.redirect(new URL(`/${locale}${dashboardPath}${nextUrl.search}`, nextUrl));
  }

  if (isTenantAuthRoute) {
    if (isLoggedIn) return localeRedirect("/dashboard");
    return intlBaseResponse ?? NextResponse.next();
  }

  if (isAdminAuthRoute) {
    if (isLoggedIn && pathnameForAuth === "/admin/login") {
      return NextResponse.redirect(new URL("/admin", nextUrl));
    }
    return intlBaseResponse ?? NextResponse.next();
  }

  if (isDashboardRoute || isClientPortal) {
    if (!isLoggedIn) {
      const callbackUrl = encodeURIComponent(pathnameForAuth);
      return localeRedirect(`/auth/login?callbackUrl=${callbackUrl}`);
    }
  }

  return buildResponse(reqAny, isLoggedIn, intlBaseResponse);
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildResponse(req: any, isLoggedIn: boolean, intlBaseResponse?: NextResponse) {
  if (isLoggedIn && req.auth?.user) {
    // Use intl response as base to preserve locale headers set by the intl middleware
    const response = intlBaseResponse ?? NextResponse.next();
    response.headers.set("x-user-id", req.auth.user.id || "");
    response.headers.set("x-user-email", req.auth.user.email || "");

    const orgId = req.cookies.get("hubents-org-id")?.value;
    if (orgId) response.headers.set("x-organization-id", orgId);

    const isImpersonating = req.cookies.get("hubents-impersonating")?.value;
    if (isImpersonating === "true") {
      response.headers.set("x-impersonating", "true");
    } else {
      const originalOrgId = req.cookies.get("hubents-original-org-id")?.value;
      if (originalOrgId) {
        response.cookies.set("hubents-org-id", originalOrgId, { path: "/", maxAge: 30 * 24 * 60 * 60 });
        response.cookies.delete("hubents-original-org-id");
      }
    }
    return response;
  }
  return intlBaseResponse ?? NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|images|icons|fonts|api/webhooks|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|css)$).*)",
  ],
};
