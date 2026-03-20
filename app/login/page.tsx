"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { getDeviceId } from "@/lib/device";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const deviceId = getDeviceId();

    // Kullanıcı adından email, device_id ve oturum durumunu bul
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

    // Farklı cihazdan giriş denemesi (kalıcı cihaz bağlaması)
    if (userRow.device_id && userRow.device_id !== deviceId) {
      setError("Bu hesap farklı bir cihaza kayıtlı. Giriş yapılamaz.");
      setLoading(false);
      return;
    }

    // Başka bir cihazda aktif oturum var
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
    <main className="min-h-screen flex items-center justify-center bg-gray-950">
      <div className="w-full max-w-sm bg-gray-900 border border-gray-800 rounded-2xl shadow-xl p-8">
        <h1 className="text-2xl font-semibold text-white mb-1 text-center">
          Giriş Yap
        </h1>
        <p className="text-gray-500 text-sm text-center mb-7">
          Hesabına erişmek için bilgilerini gir
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
            <label htmlFor="password" className="block text-sm font-medium text-gray-400 mb-1.5">
              Şifre
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              placeholder="••••••••"
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
            {loading ? "Giriş yapılıyor..." : "Giriş Yap"}
          </button>
        </form>

        <p className="text-center text-sm text-gray-600 mt-6">
          Hesabın yok mu?{" "}
          <Link href="/register" className="text-blue-400 hover:text-blue-300 transition-colors">
            Kayıt ol
          </Link>
        </p>
      </div>
    </main>
  );
}
