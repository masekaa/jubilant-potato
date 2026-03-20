import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
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
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const publicPaths = ["/login", "/register"];

  if (!user && !publicPaths.includes(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && publicPaths.includes(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  const mfaPaths = ["/setup-2fa", "/verify-2fa"];

  // MFA kontrolü: giriş yapmış ama MFA sayfasında değilse kontrol et
  if (user && !mfaPaths.includes(pathname)) {
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

    if (aal?.nextLevel === "aal2" && aal?.currentLevel !== "aal2") {
      // TOTP kayıtlı ama doğrulanmamış → doğrulama sayfası
      const url = request.nextUrl.clone();
      url.pathname = "/verify-2fa";
      return NextResponse.redirect(url);
    }

    if (aal?.currentLevel === "aal1" && aal?.nextLevel === "aal1") {
      // TOTP hiç kurulmamış → zorunlu kurulum
      const url = request.nextUrl.clone();
      url.pathname = "/setup-2fa";
      return NextResponse.redirect(url);
    }
  }

  // Zaten AAL2 iken MFA sayfalarına gitmeye çalışırsa ana sayfaya yönlendir
  if (user && mfaPaths.includes(pathname)) {
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aal?.currentLevel === "aal2") {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|auth/callback).*)",
  ],
};
