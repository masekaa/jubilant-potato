"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { getDeviceId } from "@/lib/device";

const BG_SYMBOLS = [
  { emoji: "🍒", top: "10%", left: "7%",  dur: "7s",  delay: "0s"   },
  { emoji: "💎", top: "20%", left: "85%", dur: "9s",  delay: "1.5s" },
  { emoji: "⭐", top: "68%", left: "10%", dur: "8s",  delay: "0.8s" },
  { emoji: "7️⃣", top: "78%", left: "80%", dur: "11s", delay: "2s"   },
  { emoji: "🍋", top: "45%", left: "90%", dur: "6s",  delay: "0.3s" },
  { emoji: "🍇", top: "60%", left: "5%",  dur: "10s", delay: "1.2s" },
  { emoji: "🍊", top: "30%", left: "48%", dur: "13s", delay: "3s"   },
];

export default function RegisterPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const deviceId = getDeviceId();

    const { data: deviceRow } = await supabase
      .from("users")
      .select("id")
      .eq("device_id", deviceId)
      .maybeSingle();

    if (deviceRow) {
      setError("Bu cihaz zaten bir hesaba kayıtlı. Yeni hesap oluşturulamaz.");
      setLoading(false);
      return;
    }

    const { data: existing } = await supabase
      .from("users")
      .select("id")
      .eq("username", username)
      .maybeSingle();

    if (existing) {
      setError("Bu kullanıcı adı zaten alınmış.");
      setLoading(false);
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    if (data.session && data.user) {
      await supabase
        .from("users")
        .update({ device_id: deviceId })
        .eq("id", data.user.id);

      router.push("/");
      router.refresh();
      return;
    }

    setSuccess(true);
    setLoading(false);
  }

  if (success) {
    return (
      <main className="auth-bg min-h-screen flex items-center justify-center relative overflow-hidden">
        {BG_SYMBOLS.map((s, i) => (
          <span
            key={i}
            className="float-sym"
            style={{ top: s.top, left: s.left, animationDuration: s.dur, animationDelay: s.delay }}
          >
            {s.emoji}
          </span>
        ))}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 60% 55% at 50% 50%, rgba(250,189,0,0.07) 0%, transparent 70%)",
          }}
        />
        <div className="auth-card relative w-full max-w-sm mx-4 rounded-3xl p-10 text-center">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5 text-3xl"
            style={{
              background: "linear-gradient(135deg, rgba(34,197,94,0.20), rgba(34,197,94,0.08))",
              border: "1px solid rgba(34,197,94,0.30)",
              boxShadow: "0 0 24px rgba(34,197,94,0.18)",
            }}
          >
            ✉️
          </div>
          <h2 className="text-xl font-bold text-white mb-2">E-postanı kontrol et</h2>
          <p className="text-sm mb-8" style={{ color: "rgba(255,255,255,0.40)" }}>
            <span className="text-white font-medium">{email}</span> adresine onay bağlantısı gönderdik.
          </p>
          <Link
            href="/login"
            className="auth-btn inline-block px-6 py-2.5 rounded-xl text-sm"
          >
            Giriş Sayfasına Dön
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="auth-bg min-h-screen flex items-center justify-center relative overflow-hidden">
      {BG_SYMBOLS.map((s, i) => (
        <span
          key={i}
          className="float-sym"
          style={{ top: s.top, left: s.left, animationDuration: s.dur, animationDelay: s.delay }}
        >
          {s.emoji}
        </span>
      ))}
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
              background: "linear-gradient(135deg, rgba(250,189,0,0.20), rgba(250,189,0,0.08))",
              border: "1px solid rgba(250,189,0,0.30)",
              boxShadow: "0 0 24px rgba(250,189,0,0.18)",
            }}
          >
            🎰
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Hesap Oluştur</h1>
          <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.40)" }}>
            Katıl ve 1000 coin kazan
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

          {/* Email */}
          <div>
            <label
              htmlFor="email"
              className="block text-xs font-semibold mb-1.5 uppercase tracking-widest"
              style={{ color: "rgba(255,255,255,0.45)" }}
            >
              E-posta
            </label>
            <div className="relative">
              <span
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-base pointer-events-none"
                style={{ color: "rgba(255,255,255,0.30)" }}
              >
                ✉️
              </span>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="auth-input w-full pl-10 pr-4 py-3 rounded-xl text-sm"
                placeholder="ornek@mail.com"
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
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="auth-input w-full pl-10 pr-11 py-3 rounded-xl text-sm"
                placeholder="En az 6 karakter"
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
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Kayıt yapılıyor…
              </span>
            ) : (
              "Kayıt Ol"
            )}
          </button>
        </form>

        <div className="flex items-center gap-3 my-6">
          <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.08)" }} />
          <span className="text-xs" style={{ color: "rgba(255,255,255,0.25)" }}>veya</span>
          <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.08)" }} />
        </div>

        <p className="text-center text-sm" style={{ color: "rgba(255,255,255,0.35)" }}>
          Zaten hesabın var mı?{" "}
          <Link
            href="/login"
            className="font-semibold transition-colors"
            style={{ color: "#fabd00" }}
          >
            Giriş Yap
          </Link>
        </p>
      </div>
    </main>
  );
}
