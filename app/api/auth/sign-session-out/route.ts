import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      await supabase
        .from("users")
        .update({ is_logged_in: false })
        .eq("id", user.id);
    }
  } catch {
    // best-effort — tarayıcı kapanırken hata önemsiz
  }

  return new NextResponse(null, { status: 204 });
}
