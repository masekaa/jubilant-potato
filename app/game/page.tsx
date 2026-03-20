import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import GameClient from "./GameClient";

export default async function GamePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { count } = await supabase
    .from("coins")
    .select("*", { count: "exact", head: true })
    .eq("owner_id", user.id);

  return <GameClient initialBalance={count ?? 0} />;
}
