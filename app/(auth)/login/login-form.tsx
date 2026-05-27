"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function LoginForm({ next }: { next?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState<null | "password" | "google">(null);
  const [error, setError] = useState<string | null>(null);

  const callbackUrl = (() => {
    const site = process.env.NEXT_PUBLIC_SITE_URL ?? (typeof window !== "undefined" ? window.location.origin : "");
    const url = new URL("/callback", site || "http://localhost:3000");
    if (next) url.searchParams.set("next", next);
    return url.toString();
  })();

  async function signInWithPassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending("password");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setPending(null);
    if (error) {
      setError(error.message);
      return;
    }
    router.replace(next || "/dashboard");
    router.refresh();
  }

  async function signInGoogle() {
    setError(null);
    setPending("google");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: callbackUrl },
    });
    if (error) {
      setPending(null);
      setError(error.message);
    }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={signInWithPassword} className="space-y-3">
        <label className="block">
          <span className="mb-1 block text-xs uppercase tracking-wider text-orbit-muted">
            Email
          </span>
          <input
            type="email"
            required
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input"
            autoComplete="email"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs uppercase tracking-wider text-orbit-muted">
            Password
          </span>
          <input
            type="password"
            required
            placeholder="••••••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input"
            autoComplete="current-password"
          />
        </label>
        <button type="submit" className="neon-button w-full" disabled={pending !== null}>
          {pending === "password" ? "Signing in..." : "Sign in"}
        </button>
        <p className="text-center text-[10px] uppercase tracking-wider text-orbit-muted">
          Accounts are created by group owners — ask whoever invited you for credentials.
        </p>
      </form>

      <div className="flex items-center gap-3 text-xs text-orbit-muted">
        <div className="h-px flex-1 bg-orbit-border" />
        <span>or</span>
        <div className="h-px flex-1 bg-orbit-border" />
      </div>

      <button
        type="button"
        onClick={signInGoogle}
        className="ghost-button w-full"
        disabled={pending !== null}
      >
        {pending === "google" ? "Redirecting..." : "Continue with Google"}
      </button>

      {error ? (
        <p className="rounded-md border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">
          {error}
        </p>
      ) : null}
    </div>
  );
}
