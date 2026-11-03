import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ANDROID_APP_REFERRER, STORE_APP_COOKIE, fromStoreApp } from "@/lib/store-app";

const PUBLIC_PATHS = ["/demo", "/login", "/onboarding", "/auth", "/terms", "/privacy", "/support", "/reset-password", "/share/", "/pay/", "/co/", "/delete-account", "/.well-known/", "/opengraph-image", "/sitemap", "/robots"];

export async function proxy(request: NextRequest) {
  const response = await route(request);
  // The Play Store app's launch request carries its package as the referrer, on that one
  // request only. Remember it so later pages (and the client, via isStoreApp) still know.
  if ((request.headers.get("referer") ?? "").startsWith(ANDROID_APP_REFERRER)) {
    response.cookies.set(STORE_APP_COOKIE, "android", { path: "/", maxAge: 31_536_000, sameSite: "lax", secure: true });
  }
  return response;
}

async function route(request: NextRequest): Promise<NextResponse> {
  // The store apps must never show the marketing page: it carries pricing, and App Review
  // (guideline 3.1.1) and Google Play's payments policy reject pointing users to buy a digital
  // subscription outside the store's billing. Signed-out users land on /login from here via the
  // normal guard below.
  if (request.nextUrl.pathname === "/" && fromStoreApp(request)) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  // Allow through if Supabase isn't configured (local dev without env vars).
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return NextResponse.next();
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Refresh the session so tokens don't expire mid-session.
  // IMPORTANT: must use getUser() not getSession() in proxy — getSession() is not safe here.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  // API routes check auth themselves (and webhooks/cron/public pay must stay reachable);
  // "/" is the landing page only — a prefix match on it would make every path public.
  const isPublic = path === "/" || path.startsWith("/api/") || PUBLIC_PATHS.some((p) => path.startsWith(p));

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Redirect authenticated users away from login (onboarding is still allowed — dashboard layout handles that redirect)
  if (user && path === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|sw\\.js|manifest\\.json|robots\\.txt|sitemap\\.xml|icon-192\\.png|icon-512\\.png|\\.well-known|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|webm|mp4|woff2?|txt|pdf)$).*)",
  ],
};
