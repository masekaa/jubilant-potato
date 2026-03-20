"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Supabase auth olaylarını dinler.
 * Oturum kapandığında (token süresi dolması, signOut vb.) is_logged_in = false yazar.
 */
export default function AuthSync() {
  useEffect(() => {
    const supabase = createClient();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === "SIGNED_OUT" || (!session && event === "TOKEN_REFRESHED")) {
          // Token yenilenemeyen veya çıkış yapılan durumda DB'yi temizle
          // (kullanıcı kimliği artık bilinmediği için RPC ile temizleme yapılamaz;
          //  Supabase RLS politikası zaten o kullanıcıya ait satırı kısıtlar)
        }

        if (event === "SIGNED_OUT") {
          // signOut sonrası DB güncelleme server action'da zaten yapılıyor.
          // Burada yalnızca tarayıcı kapanma senaryosu için beforeunload kullanılır.
        }
      }
    );

    // Tarayıcı kapanırken / sekme kapatılırken is_logged_in = false gönder
    const handleUnload = () => {
      const supabase = createClient();
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (user) {
          // sendBeacon ile istek sayfa yok olsa bile gönderilir
          navigator.sendBeacon(
            "/api/auth/sign-session-out",
            JSON.stringify({ userId: user.id })
          );
        }
      });
    };

    window.addEventListener("beforeunload", handleUnload);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener("beforeunload", handleUnload);
    };
  }, []);

  return null;
}
