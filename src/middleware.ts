import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PATHS = new Set(["/login", "/offline"]);

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/icons") ||
    pathname === "/sw.js" ||
    pathname === "/manifest.webmanifest" ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  if (
    pathname === "/login" &&
    (request.nextUrl.searchParams.has("email") || request.nextUrl.searchParams.has("password"))
  ) {
    const url = request.nextUrl.clone();
    url.search = "";
    return NextResponse.redirect(url);
  }

  const hasSession = Boolean(request.cookies.get("viabilidade_session")?.value);
  if (!hasSession && !PUBLIC_PATHS.has(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }
  if (hasSession && pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icons/).*)"],
};
