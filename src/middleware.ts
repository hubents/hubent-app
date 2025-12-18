import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;

  // Public routes
  const publicRoutes = ["/", "/login", "/register", "/api/auth"];
  const isPublicRoute = publicRoutes.some((route) =>
    nextUrl.pathname.startsWith(route)
  );

  // Admin routes
  const isAdminRoute = nextUrl.pathname.startsWith("/admin");

  // Dashboard routes
  const isDashboardRoute = nextUrl.pathname.startsWith("/dashboard");

  // If not logged in and trying to access protected route
  if (!isLoggedIn && (isDashboardRoute || isAdminRoute)) {
    return NextResponse.redirect(new URL("/login", nextUrl));
  }

  // If logged in and trying to access login page
  if (isLoggedIn && nextUrl.pathname === "/login") {
    return NextResponse.redirect(new URL("/dashboard", nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
