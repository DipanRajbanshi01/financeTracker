import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function Landing() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  redirect(user ? "/dashboard" : "/login");
}
