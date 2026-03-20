import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { simulateSpin } from "@/app/game/slotLogic";

export async function POST(_req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  // Read session
  const { data: session, error: sessErr } = await supabase
    .from("free_spin_sessions")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (sessErr || !session)
    return NextResponse.json({ error: "no active free spin session" }, { status: 400 });
  if (session.remaining <= 0)
    return NextResponse.json({ error: "no remaining free spins" }, { status: 400 });

  const result = simulateSpin(session.bet, true);
  const isLast = session.remaining === 1;

  const { data: rows, error: settleErr } = await supabase.rpc("settle_free_spin", {
    p_win: result.totalWin,
    p_is_last: isLast,
  });

  if (settleErr) return NextResponse.json({ error: settleErr.message }, { status: 400 });

  const { remaining, accumulated, new_balance } = rows[0];

  return NextResponse.json({ ...result, remaining, accumulated, newBalance: new_balance, isLast });
}
