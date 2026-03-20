"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { getDeviceId } from "@/lib/device";

export default function RegisterPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const deviceId = getDeviceId();

    // Bu cihaz başka bir hesaba kayıtlı mı?
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

    // Kullanıcı adı alınmış mı?
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

    // Oturum açıldıysa (e-posta onayı kapalı) device_id kaydet
    if (data.session && data.user) {
      await supabase
        .from("users")
        .update({ device_id: deviceId })
        .eq("id", data.user.id);

      router.push("/");
      router.refresh();
      return;
    }

    // E-posta onayı açıksa — device_id ilk girişte kaydedilecek
    setSuccess(true);
    setLoading(false);
  }

  if (success) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="w-full max-w-sm bg-gray-900 border border-gray-800 rounded-2xl shadow-xl p-8 text-center">
          <div className="w-12 h-12 bg-blue-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">E-postanı kontrol et</h2>
          <p className="text-gray-500 text-sm mb-6">
            <span className="text-gray-300">{email}</span> adresine onay bağlantısı gönderdik.
          </p>
          <Link
            href="/login"
            className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
          >
            Giriş sayfasına dön
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-950">
      <div className="w-full max-w-sm bg-gray-900 border border-gray-800 rounded-2xl shadow-xl p-8">
        <h1 className="text-2xl font-semibold text-white mb-1 text-center">
          Kayıt Ol
        </h1>
        <p className="text-gray-500 text-sm text-center mb-7">
          Yeni bir hesap oluştur
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-400 mb-1.5">
              Kullanıcı Adı
            </label>
            <input
              id="username"
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              placeholder="kullanici_adi"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-400 mb-1.5">
              E-posta
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              placeholder="ornek@mail.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-400 mb-1.5">
              Şifre
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              placeholder="En az 6 karakter"
            />
          </div>

          {error && (
            <p className="text-sm text-red-400 bg-red-950/50 border border-red-900 px-3.5 py-2.5 rounded-lg">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium py-2.5 rounded-lg transition-colors mt-1"
          >
            {loading ? "Kayıt yapılıyor..." : "Kayıt Ol"}
          </button>
        </form>

        <p className="text-center text-sm text-gray-600 mt-6">
          Zaten hesabın var mı?{" "}
          <Link href="/login" className="text-blue-400 hover:text-blue-300 transition-colors">
            Giriş yap
          </Link>
        </p>
      </div>
    </main>
  );
}
