"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { getDeviceId } from "@/lib/device";

const BG_SYMBOLS = [
  { emoji: "🍒", top: "8%",  left: "5%",  dur: "7s",  delay: "0s"   },
  { emoji: "💎", top: "15%", left: "88%", dur: "9s",  delay: "1.5s" },
  { emoji: "⭐", top: "72%", left: "12%", dur: "8s",  delay: "0.8s" },
  { emoji: "7️⃣", top: "80%", left: "82%", dur: "11s", delay: "2s"   },
  { emoji: "🍋", top: "40%", left: "92%", dur: "6s",  delay: "0.3s" },
  { emoji: "🍇", top: "55%", left: "3%",  dur: "10s", delay: "1.2s" },
  { emoji: "🍊", top: "25%", left: "50%", dur: "13s", delay: "3s"   },
];

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const deviceId = getDeviceId();

    const { data: userRow } = await supabase
      .from("users")
      .select("email, device_id, is_logged_in")
      .eq("username", username)
      .maybeSingle();

    if (!userRow) {
      setError("Kullanıcı adı veya şifre hatalı.");
      setLoading(false);
      return;
    }

    if (userRow.device_id && userRow.device_id !== deviceId) {
      setError("Bu hesap farklı bir cihaza kayıtlı. Giriş yapılamaz.");
      setLoading(false);
      return;
    }

    if (userRow.is_logged_in && userRow.device_id !== deviceId) {
      setError("Bu hesap şu an başka bir cihazda oturum açık durumda.");
      setLoading(false);
      return;
    }

    const { data: loginData, error } = await supabase.auth.signInWithPassword({
      email: userRow.email,
      password,
    });

    if (error) {
      setError("Kullanıcı adı veya şifre hatalı.");
      setLoading(false);
      return;
    }

    if (loginData.user) {
      await supabase
        .from("users")
        .update({
          is_logged_in: true,
          ...(userRow.device_id ? {} : { device_id: deviceId }),
        })
        .eq("id", loginData.user.id);
    }

    router.push("/");
    router.refresh();
  }

  return (
    <main className="auth-bg min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Floating background symbols */}
      {BG_SYMBOLS.map((s, i) => (
        <span
          key={i}
          className="float-sym"
          style={{
            top: s.top,
            left: s.left,
            animationDuration: s.dur,
            animationDelay: s.delay,
          }}
        >
          {s.emoji}
        </span>
      ))}

      {/* Radial glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 60% 55% at 50% 50%, rgba(250,189,0,0.07) 0%, transparent 70%)",
        }}
      />

      <div className="auth-card relative w-full max-w-sm mx-4 rounded-3xl p-8">
        {/* Logo / Icon */}
        <div className="flex flex-col items-center mb-8">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 text-3xl"
            style={{
              background:
                "linear-gradient(135deg, rgba(250,189,0,0.20), rgba(250,189,0,0.08))",
              border: "1px solid rgba(250,189,0,0.30)",
              boxShadow: "0 0 24px rgba(250,189,0,0.18)",
            }}
          >
            🎰
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Tekrar Hoş Geldin
          </h1>
          <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.40)" }}>
            Hesabına giriş yap ve şansını dene
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Username */}
          <div>
            <label
              htmlFor="username"
              className="block text-xs font-semibold mb-1.5 uppercase tracking-widest"
              style={{ color: "rgba(255,255,255,0.45)" }}
            >
              Kullanıcı Adı
            </label>
            <div className="relative">
              <span
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-base pointer-events-none"
                style={{ color: "rgba(255,255,255,0.30)" }}
              >
                👤
              </span>
              <input
                id="username"
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="auth-input w-full pl-10 pr-4 py-3 rounded-xl text-sm"
                placeholder="kullanici_adi"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label
              htmlFor="password"
              className="block text-xs font-semibold mb-1.5 uppercase tracking-widest"
              style={{ color: "rgba(255,255,255,0.45)" }}
            >
              Şifre
            </label>
            <div className="relative">
              <span
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-base pointer-events-none"
                style={{ color: "rgba(255,255,255,0.30)" }}
              >
                🔒
              </span>
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="auth-input w-full pl-10 pr-11 py-3 rounded-xl text-sm"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sm transition-opacity"
                style={{ color: "rgba(255,255,255,0.35)" }}
                tabIndex={-1}
              >
                {showPassword ? "🙈" : "👁️"}
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div
              className="flex items-start gap-2.5 px-3.5 py-3 rounded-xl text-sm"
              style={{
                background: "rgba(239,68,68,0.10)",
                border: "1px solid rgba(239,68,68,0.30)",
                color: "#fca5a5",
              }}
            >
              <span className="text-base shrink-0">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="auth-btn w-full py-3.5 rounded-xl text-sm mt-2"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg
                  className="animate-spin w-4 h-4"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v8H4z"
                  />
                </svg>
                Giriş yapılıyor…
              </span>
            ) : (
              "Giriş Yap"
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-3 my-6">
          <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.08)" }} />
          <span className="text-xs" style={{ color: "rgba(255,255,255,0.25)" }}>
            veya
          </span>
          <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.08)" }} />
        </div>

        <p className="text-center text-sm" style={{ color: "rgba(255,255,255,0.35)" }}>
          Hesabın yok mu?{" "}
          <Link
            href="/register"
            className="font-semibold transition-colors"
            style={{ color: "#fabd00" }}
          >
            Kayıt Ol
          </Link>
        </p>
      </div>
    </main>
  );
}
