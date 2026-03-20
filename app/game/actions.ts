"use server";

import { createClient } from "@/lib/supabase/server";

/** Returns how many coins the current user owns. */
export async function getCoinBalance(): Promise<number> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return 0;

  const { count } = await supabase
    .from("coins")
    .select("*", { count: "exact", head: true })
    .eq("owner_id", user.id);

  return count ?? 0;
}

/**
 * Add `amount` coin rows for the current user.
 * Uses a server-side RPC (generate_series) — no N+1 inserts.
 */
export async function earnCoins(amount: number): Promise<void> {
  if (amount <= 0) return;
  const supabase = await createClient();
  await supabase.rpc("earn_coins", { p_amount: Math.floor(amount) });
}

/**
 * Delete `amount` coin rows from the current user's holdings.
 * Deletes the oldest coins first.
 */
export async function spendCoins(amount: number): Promise<void> {
  if (amount <= 0) return;
  const supabase = await createClient();
  await supabase.rpc("spend_coins", { p_amount: Math.floor(amount) });
}
