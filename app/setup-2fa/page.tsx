"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Step = "loading" | "verifying" | "done";

export default function SetupTwoFAPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("loading");
  const [qrCode, setQrCode] = useState("");
  const [secret, setSecret] = useState("");
  const [factorId, setFactorId] = useState("");
  const [challengeId, setChallengeId] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function startEnrollment() {
      const supabase = createClient();
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        issuer: "claude5",
        friendlyName: "Authenticator",
      });

      if (error || !data) {
        setError(error?.message ?? "Kayıt başlatılamadı.");
        return;
      }

      setQrCode(data.totp.qr_code);
      setSecret(data.totp.secret);
      setFactorId(data.id);

      const { data: challenge } = await supabase.auth.mfa.challenge({
        factorId: data.id,
      });
      if (challenge) setChallengeId(challenge.id);

      setStep("verifying");
    }
    startEnrollment();
  }, []);

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.mfa.verify({
      factorId,
      challengeId,
      code,
    });

    if (error) {
      setError("Hatalı kod. Tekrar deneyin.");
      setLoading(false);
      return;
    }

    setStep("done");
    router.push("/");
    router.refresh();
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-950">
      <div className="w-full max-w-sm bg-gray-900 border border-gray-800 rounded-2xl shadow-xl p-8">
        {step === "loading" && (
          <p className="text-gray-500 text-sm text-center">Hazırlanıyor...</p>
        )}

        {step === "verifying" && (
          <>
            <h1 className="text-xl font-semibold text-white mb-1 text-center">
              2FA Kurulumu Gerekli
            </h1>
            <p className="text-gray-500 text-xs text-center mb-5">
              Hesabınıza erişmek için Google Authenticator veya Authy ile QR
              kodu tarayın
            </p>

            {qrCode && (
              <div className="flex justify-center mb-4">
                <img
                  src={qrCode}
                  alt="2FA QR Code"
                  className="w-44 h-44 bg-white p-2 rounded-lg"
                />
              </div>
            )}

            <p className="text-gray-600 text-xs text-center mb-1">
              Manuel giriş kodu:
            </p>
            <p className="text-gray-400 text-xs text-center font-mono break-all mb-5 select-all">
              {secret}
            </p>

            <form onSubmit={handleVerify} className="space-y-3">
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                required
                autoFocus
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                className="w-full px-3.5 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white text-center tracking-[0.5em] placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                placeholder="000000"
              />

              {error && (
                <p className="text-sm text-red-400 bg-red-950/50 border border-red-900 px-3.5 py-2.5 rounded-lg">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading || code.length !== 6}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium py-2.5 rounded-lg transition-colors"
              >
                {loading ? "Doğrulanıyor..." : "Doğrula ve Devam Et"}
              </button>
            </form>
          </>
        )}

        {step === "done" && (
          <p className="text-gray-500 text-sm text-center">
            Yönlendiriliyor...
          </p>
        )}
      </div>
    </main>
  );
}
