import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Next.js Middleware for Server-Side Authentication
 *
 * SECURITY: This middleware runs on the Edge runtime BEFORE the page renders,
 * providing server-side protection for authenticated routes. This prevents:
 * - Flash of protected content before client-side redirect
 * - Direct URL access to protected pages without authentication
 *
 * Authentication is verified by checking for the presence of the access_token
 * cookie (set as httpOnly by the backend on login).
 */

// Routes that require authentication
const PROTECTED_ROUTES = [
  "/dashboard",
  "/contacts",
  "/corporations",
  "/cases",
  "/appointments",
  "/documents",
  "/tasks",
  "/settings",
  "/reports",
  "/inbox",
  "/notifications",
  "/quotes",
  "/inventory",
  "/ai-agent",
  "/sales-insights",
  "/forecasts",
  "/esign-documents",
  "/internal-tickets",
  "/actions",
  "/audit",
  "/calls",
  "/meetings",
];

// Routes that should redirect to dashboard if already authenticated
const AUTH_ROUTES = ["/login"];

// Portal routes (separate auth system)
const PORTAL_PROTECTED_ROUTES = ["/portal/dashboard", "/portal/cases", "/portal/documents", "/portal/messages"];
const PORTAL_AUTH_ROUTES = ["/portal/login"];

// Public routes that don't require auth
const PUBLIC_ROUTES = [
  "/",
  "/api",
  "/_next",
  "/favicon.ico",
  "/public",
];

/**
 * Check if a path matches any of the given route prefixes
 */
function matchesRoute(path: string, routes: string[]): boolean {
  return routes.some((route) => path === route || path.startsWith(`${route}/`));
}

/**
 * Check if the request has a valid authentication cookie
 */
function isAuthenticated(request: NextRequest): boolean {
  const accessToken = request.cookies.get("access_token");
  return !!accessToken?.value;
}

/**
 * Check if the request has a valid portal authentication cookie
 */
function isPortalAuthenticated(request: NextRequest): boolean {
  const portalAccessToken = request.cookies.get("portal_access_token");
  return !!portalAccessToken?.value;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for public routes and static files
  if (
    matchesRoute(pathname, PUBLIC_ROUTES) ||
    pathname.includes(".") // Static files (e.g., .js, .css, .png)
  ) {
    return NextResponse.next();
  }

  // Handle portal routes separately
  if (pathname.startsWith("/portal")) {
    const isPortalAuth = isPortalAuthenticated(request);

    // Portal protected routes - redirect to portal login if not authenticated
    if (matchesRoute(pathname, PORTAL_PROTECTED_ROUTES) && !isPortalAuth) {
      const loginUrl = new URL("/portal/login", request.url);
      loginUrl.searchParams.set("from", pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Portal auth routes - redirect to portal dashboard if already authenticated
    if (matchesRoute(pathname, PORTAL_AUTH_ROUTES) && isPortalAuth) {
      return NextResponse.redirect(new URL("/portal/dashboard", request.url));
    }

    return NextResponse.next();
  }

  // Handle main app routes
  const isAuth = isAuthenticated(request);

  // Protected routes - redirect to login if not authenticated
  if (matchesRoute(pathname, PROTECTED_ROUTES) && !isAuth) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Auth routes - redirect to dashboard if already authenticated
  if (matchesRoute(pathname, AUTH_ROUTES) && isAuth) {
    // Check if there's a "from" parameter to redirect back to
    const from = request.nextUrl.searchParams.get("from");
    const redirectUrl = from && from !== "/login" ? from : "/dashboard";
    return NextResponse.redirect(new URL(redirectUrl, request.url));
  }

  return NextResponse.next();
}

/**
 * Configure which routes the middleware should run on
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|public/).*)",
  ],
};
