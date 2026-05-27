import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/actions/auth";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Middleware already gates this, but belt-and-braces in case it's bypassed.
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, email")
    .eq("id", user.id)
    .maybeSingle();

  const label = profile?.display_name || profile?.email || user.email || "Account";

  return (
    <div className="min-h-screen">
      <header className="border-b border-orbit-border/60 bg-orbit-bg/60 backdrop-blur">
        <nav className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link href="/dashboard" className="font-mono text-lg font-semibold">
            <span className="text-orbit-cyan">orbit</span>
            <span className="text-orbit-muted">/</span>
            <span className="text-orbit-magenta">ledger</span>
          </Link>
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden text-orbit-muted sm:inline">{label}</span>
            <form action={signOut}>
              <button type="submit" className="ghost-button px-3 py-1.5 text-xs">
                Sign out
              </button>
            </form>
          </div>
        </nav>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </div>
  );
}
