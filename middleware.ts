import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
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
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session on every request so the cookie stays alive.
  // IMPORTANT: do not add any logic between createServerClient and getUser().
  const { data: { user } } = await supabase.auth.getUser();

  // Protect dashboard routes — redirect unauthenticated users to /login.
  // Only enforced when Supabase is configured (anon key present).
  const isConfigured = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (isConfigured && !user) {
    const { pathname } = request.nextUrl;
    const isDashboard = pathname.startsWith("/dashboard") ||
      (pathname.startsWith("/") && ![
        "/", "/login", "/onboarding", "/reset-password",
        "/terms", "/privacy", "/auth", "/api",
      ].some((prefix) => pathname === prefix || pathname.startsWith(prefix + "/")) &&
      !pathname.match(/\.(svg|png|jpg|jpeg|ico|webp|gif|woff2?)$/));

    if (isDashboard) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|icon-192\\.png|icon-512\\.png|sw\\.js|manifest\\.json|robots\\.txt|sitemap\\.xml).*)",
  ],
};
