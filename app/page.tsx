import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

async function signOut() {
  "use server";
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    await supabase.from("users").update({ is_logged_in: false }).eq("id", user.id);
  }
  await supabase.auth.signOut();
  redirect("/login");
}

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <main className="min-h-screen bg-gray-950 flex flex-col items-center justify-center gap-3">
      <p className="text-gray-500 text-sm">
        Hoş geldin,{" "}
        <span className="text-gray-300">{user.email}</span>
      </p>
      <Link
        href="/game"
        className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-base transition-colors shadow-lg"
        style={{ boxShadow: "0 4px 20px rgba(59,130,246,0.35)" }}
      >
        Oyunu Oyna
      </Link>
      <form action={signOut}>
        <button
          type="submit"
          className="text-sm text-red-500 hover:text-red-400 transition-colors underline underline-offset-2"
        >
          Çıkış Yap
        </button>
      </form>
    </main>
  );
}
