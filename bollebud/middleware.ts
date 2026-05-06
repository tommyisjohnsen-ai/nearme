import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const PUBLIC_PATHS = new Set([
  "/login",
  "/auth/callback",
  "/manifest.webmanifest",
  "/sw.js",
  "/sw-push.js",
  "/api/health",
]);

function isPublic(pathname: string): boolean {
  if (PUBLIC_PATHS.has(pathname)) return true;
  if (pathname.startsWith("/_next")) return true;
  if (pathname.startsWith("/icons")) return true;
  if (pathname === "/favicon.ico") return true;
  return false;
}

export async function middleware(request: NextRequest) {
  const { response, user, supabase } = await updateSession(request);
  const { pathname } = request.nextUrl;

  if (isPublic(pathname)) return response;

  // API routes: don't redirect; return 401 if unauthenticated.
  if (pathname.startsWith("/api/")) {
    if (!user) {
      return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
    }
    return response;
  }

  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // Pull role from profile to gate role-specific sections.
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  // First-time users: trigger creates a 'customer' row; if for some reason the
  // profile is missing, send them to onboarding.
  if (!profile) {
    if (pathname !== "/onboarding") {
      const url = request.nextUrl.clone();
      url.pathname = "/onboarding";
      return NextResponse.redirect(url);
    }
    return response;
  }

  if (pathname.startsWith("/admin") && profile.role !== "admin") {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  if (pathname.startsWith("/vendor") && profile.role !== "vendor") {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  // Match every path except static assets and the service worker.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icons/|workbox-).*)"],
};
