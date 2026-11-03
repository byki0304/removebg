import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  PROTECTED_PATH_PREFIXES,
  SUPABASE_ANON_KEY,
  SUPABASE_URL,
  cloudDelegateUrl,
  isSupabaseConfigured,
  isUiPreview,
} from "./lib/env";

function isProtected(pathname: string): boolean {
  return PROTECTED_PATH_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (isUiPreview) return NextResponse.next();

  const delegate = cloudDelegateUrl();
  if (delegate && pathname.startsWith("/api/auth/")) {
    return NextResponse.rewrite(new URL(`${pathname}${request.nextUrl.search}`, delegate));
  }

  if (!isSupabaseConfigured) {
    if (isProtected(pathname)) return NextResponse.redirect(new URL("/auth/login", request.url));
    return NextResponse.next();
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (toSet: { name: string; value: string; options: CookieOptions }[]) => {
        toSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        toSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && isProtected(pathname)) {
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|icons/|intro/|api/remove-bg|api/cron/|.*\\.(?:png|jpg|jpeg|gif|webp|svg|mp4|webm)$).*)"],
};
