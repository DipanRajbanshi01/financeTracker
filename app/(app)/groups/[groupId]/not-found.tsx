import Link from "next/link";

export default function GroupNotFound() {
  return (
    <div className="panel grid place-items-center px-6 py-16 text-center">
      <div className="space-y-3">
        <div className="font-mono text-xs uppercase tracking-[0.3em] text-orbit-magenta/80">
          group not found
        </div>
        <h2 className="text-xl font-medium text-orbit-text">
          This group doesn't exist — or you can't access it
        </h2>
        <p className="max-w-md text-sm text-orbit-muted">
          Groups are private to their members. Ask whoever created it to invite you,
          or head back to your dashboard.
        </p>
        <div className="pt-2">
          <Link href="/dashboard" className="neon-button">
            Back to dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
