"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function VerifyTwoFAPage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [challengeId, setChallengeId] = useState<string | null>(null);

  useEffect(() => {
    async function startChallenge() {
      const supabase = createClient();
      const { data } = await supabase.auth.mfa.listFactors();
      const totpFactor = data?.totp?.[0];
      if (!totpFactor) return;
      setFactorId(totpFactor.id);
      const { data: challenge } = await supabase.auth.mfa.challenge({
        factorId: totpFactor.id,
      });
      if (challenge) setChallengeId(challenge.id);
    }
    startChallenge();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!factorId || !challengeId) return;
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

    router.push("/");
    router.refresh();
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-950">
      <div className="w-full max-w-sm bg-gray-900 border border-gray-800 rounded-2xl shadow-xl p-8">
        <div className="w-12 h-12 bg-blue-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-6 h-6 text-blue-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
        </div>
        <h1 className="text-2xl font-semibold text-white mb-1 text-center">
          İki Faktörlü Doğrulama
        </h1>
        <p className="text-gray-500 text-sm text-center mb-7">
          Authenticator uygulamanızdaki 6 haneli kodu girin
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
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
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium py-2.5 rounded-lg transition-colors"
          >
            {loading ? "Doğrulanıyor..." : "Doğrula"}
          </button>
        </form>
      </div>
    </main>
  );
}
