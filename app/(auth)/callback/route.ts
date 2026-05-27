import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Handles both OAuth (Google) and magic-link returns.
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") || "/dashboard";
  const errorParam = url.searchParams.get("error_description") || url.searchParams.get("error");

  if (errorParam) {
    const back = new URL("/login", url.origin);
    back.searchParams.set("error", errorParam);
    return NextResponse.redirect(back);
  }

  if (!code) {
    const back = new URL("/login", url.origin);
    back.searchParams.set("error", "Missing auth code");
    return NextResponse.redirect(back);
  }

  const supabase = createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    const back = new URL("/login", url.origin);
    back.searchParams.set("error", error.message);
    return NextResponse.redirect(back);
  }

  return NextResponse.redirect(new URL(next, url.origin));
}
