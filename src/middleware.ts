import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

// Routes configuration
const PUBLIC_ROUTES = ["/", "/login", "/register", "/api/auth", "/components"];
const ADMIN_ROUTES = ["/admin"];
const DASHBOARD_ROUTES = ["/dashboard"];
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
  const isAdminRoute = ADMIN_ROUTES.some((route) => pathname.startsWith(route));
  const isDashboardRoute = DASHBOARD_ROUTES.some((route) => pathname.startsWith(route));
  const isVendorPortal = VENDOR_PORTAL_ROUTES.some((route) => pathname.startsWith(route));
  const isClientPortal = CLIENT_PORTAL_ROUTES.some((route) => pathname.startsWith(route));
  const isApiRoute = pathname.startsWith("/api");

  // Allow public routes
  if (isPublicRoute) {
    return NextResponse.next();
  }

  // Redirect to login if not authenticated
  if (!isLoggedIn && (isDashboardRoute || isAdminRoute || isVendorPortal || isClientPortal)) {
    const callbackUrl = encodeURIComponent(pathname);
    return NextResponse.redirect(new URL(`/login?callbackUrl=${callbackUrl}`, nextUrl));
  }

  // Redirect logged in users away from login page
  if (isLoggedIn && pathname === "/login") {
    return NextResponse.redirect(new URL("/dashboard", nextUrl));
  }

  // For authenticated requests, add user info to headers
  if (isLoggedIn && req.auth?.user) {
    const response = NextResponse.next();
    
    // Add user ID to headers for API routes
    response.headers.set("x-user-id", req.auth.user.id || "");
    response.headers.set("x-user-email", req.auth.user.email || "");
    
    // Organization ID will be set from cookie or query param
    const orgId = req.cookies.get("hubents-org-id")?.value;
    if (orgId) {
      response.headers.set("x-organization-id", orgId);
    }

    return response;
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    // Match all routes except static files and images
    "/((?!_next/static|_next/image|favicon.ico|images|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
