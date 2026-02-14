import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

// Routes configuration
const PUBLIC_ROUTES = ["/", "/api/auth", "/components", "/terms", "/privacy", "/providers"];
const TENANT_AUTH_ROUTES = ["/auth"];
const PROVIDER_AUTH_ROUTES = ["/provider/register", "/provider/login"];
const ADMIN_AUTH_ROUTES = ["/admin/login", "/admin/invite"];
const ADMIN_PROTECTED_ROUTES = ["/admin"];
const DASHBOARD_ROUTES = ["/dashboard", "/onboarding", "/billing", "/select-org"];
const INVITE_ROUTES = ["/invite"];
const VENDOR_PORTAL_ROUTES = ["/vendor"];
const CLIENT_PORTAL_ROUTES = ["/client"];

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;
  const pathname = nextUrl.pathname;

  // Check route types
  const isPublicRoute = PUBLIC_ROUTES.some((route) => 
    pathname === route || pathname.startsWith(`${route}/`)
  );
  const isTenantAuthRoute = TENANT_AUTH_ROUTES.some((route) => 
    pathname === route || pathname.startsWith(`${route}/`)
  );
  const isAdminAuthRoute = ADMIN_AUTH_ROUTES.some((route) => 
    pathname === route || pathname.startsWith(`${route}/`)
  );
  const isAdminProtectedRoute = ADMIN_PROTECTED_ROUTES.some((route) => 
    pathname.startsWith(route)
  ) && !isAdminAuthRoute;
  const isDashboardRoute = DASHBOARD_ROUTES.some((route) => 
    pathname === route || pathname.startsWith(`${route}/`)
  );
  const isInviteRoute = INVITE_ROUTES.some((route) => 
    pathname === route || pathname.startsWith(`${route}/`)
  );
  const isProviderAuthRoute = PROVIDER_AUTH_ROUTES.some((route) =>
    pathname === route || pathname.startsWith(`${route}/`)
  );
  const isVendorPortal = VENDOR_PORTAL_ROUTES.some((route) => pathname.startsWith(route)) && !isProviderAuthRoute;
  const isClientPortal = CLIENT_PORTAL_ROUTES.some((route) => pathname.startsWith(route));

  // Allow public routes
  if (isPublicRoute) {
    return NextResponse.next();
  }

  // Allow invite routes (they handle their own auth)
  if (isInviteRoute) {
    return NextResponse.next();
  }

  // Tenant auth routes (/auth/*) - redirect to dashboard if already logged in
  if (isTenantAuthRoute) {
    if (isLoggedIn) {
      return NextResponse.redirect(new URL("/dashboard", nextUrl));
    }
    return NextResponse.next();
  }

  // Provider auth routes (/provider/register, /provider/login) - allow public access
  if (isProviderAuthRoute) {
    if (isLoggedIn) {
      // Redirect to /dashboard — vendor layout validates orgType separately
      return NextResponse.redirect(new URL("/dashboard", nextUrl));
    }
    return NextResponse.next();
  }

  // Admin auth routes (/admin/login, /admin/invite/*) - allow access
  if (isAdminAuthRoute) {
    if (isLoggedIn && pathname === "/admin/login") {
      return NextResponse.redirect(new URL("/admin", nextUrl));
    }
    return NextResponse.next();
  }

  // Protected admin routes - require auth
  if (isAdminProtectedRoute) {
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL("/admin/login", nextUrl));
    }
    // Note: Platform admin verification is done in the admin layout/pages
    // The middleware just ensures the user is authenticated
  }

  // Dashboard and tenant protected routes
  if (isDashboardRoute || isVendorPortal || isClientPortal) {
    if (!isLoggedIn) {
      const callbackUrl = encodeURIComponent(pathname);
      return NextResponse.redirect(new URL(`/auth/login?callbackUrl=${callbackUrl}`, nextUrl));
    }
  }

  // For ALL requests (including API routes), add user info to headers if authenticated
  if (isLoggedIn && req.auth?.user) {
    const response = NextResponse.next();
    
    // Add user ID to headers for API routes
    response.headers.set("x-user-id", req.auth.user.id || "");
    response.headers.set("x-user-email", req.auth.user.email || "");
    
    // Organization ID will be set from cookie
    const orgId = req.cookies.get("hubents-org-id")?.value;
    if (orgId) {
      response.headers.set("x-organization-id", orgId);
    }

    // Impersonation: propagate flag as header
    const isImpersonating = req.cookies.get("hubents-impersonating")?.value;
    if (isImpersonating === "true") {
      response.headers.set("x-impersonating", "true");
    } else {
      // Cleanup: if impersonation cookie is gone but original-org-id remains, restore
      const originalOrgId = req.cookies.get("hubents-original-org-id")?.value;
      if (originalOrgId) {
        response.cookies.set("hubents-org-id", originalOrgId, { path: "/", maxAge: 30 * 24 * 60 * 60 });
        response.cookies.delete("hubents-original-org-id");
      }
    }

    // Log for debugging API routes
    if (pathname.startsWith("/api/") && !pathname.startsWith("/api/auth")) {
      console.log(`[Middleware] API route: ${pathname}, userId: ${req.auth.user.id}, orgId: ${orgId || 'NOT SET'}`);
    }

    return response;
  }

  // For unauthenticated requests, just continue
  return NextResponse.next();
});

export const config = {
  matcher: [
    // Match all routes except static files and images
    "/((?!_next/static|_next/image|favicon.ico|images|icons|fonts|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|css)$).*)",
  ],
};
