import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              // maxAge / expires kaldırılıyor → session cookie (tarayıcı kapanınca silinir)
              const { maxAge: _m, expires: _e, ...sessionOpts } = options ?? {};
              cookieStore.set(name, value, sessionOpts);
            });
          } catch {
            // Server Component'ten çağrıldığında cookie yazmak mümkün olmaz.
            // Middleware bu durumu session yenileme ile halleder.
          }
        },
      },
    }
  );
}
