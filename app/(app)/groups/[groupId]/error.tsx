"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function GroupError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Group route error:", error);
  }, [error]);

  return (
    <div className="panel grid place-items-center px-6 py-16 text-center">
      <div className="space-y-3">
        <div className="font-mono text-xs uppercase tracking-[0.3em] text-red-400/80">
          orbit malfunction
        </div>
        <h2 className="text-xl font-medium text-orbit-text">Something went wrong</h2>
        <p className="max-w-md text-sm text-orbit-muted">
          We couldn't load this group. The DB might be unreachable, or you no longer
          have access to it.
        </p>
        <div className="flex justify-center gap-3 pt-2">
          <button onClick={() => reset()} className="neon-button">
            Try again
          </button>
          <Link href="/dashboard" className="ghost-button">
            Back to dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
