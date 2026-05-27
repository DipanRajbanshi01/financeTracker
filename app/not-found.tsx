import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="panel max-w-md p-8 text-center">
        <div className="font-mono text-xs uppercase tracking-[0.3em] text-orbit-cyan/80">
          404
        </div>
        <h1 className="mt-2 text-2xl font-semibold text-orbit-text">
          Lost in orbit
        </h1>
        <p className="mt-1 text-sm text-orbit-muted">
          That page isn't here. Try the dashboard.
        </p>
        <div className="mt-4">
          <Link href="/dashboard" className="neon-button">
            Back to dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
