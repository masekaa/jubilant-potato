import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { simulateSpin } from "@/app/game/slotLogic";

const VALID_BETS = new Set([10, 25, 50, 100]);

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let bet: number;
  try {
    const body = await req.json();
    bet = Number(body.bet);
    if (!VALID_BETS.has(bet)) throw new Error();
  } catch {
    return NextResponse.json({ error: "invalid bet" }, { status: 400 });
  }

  const result = simulateSpin(bet, false);

  const { data: newBalance, error } = await supabase.rpc("settle_spin", {
    p_bet: bet,
    p_win: result.totalWin,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ...result, newBalance });
}
