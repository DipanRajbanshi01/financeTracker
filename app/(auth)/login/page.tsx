import { LoginForm } from "./login-form";

export default function LoginPage({
  searchParams,
}: {
  searchParams: { next?: string; message?: string; error?: string };
}) {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="panel w-full max-w-md p-8">
        <div className="mb-8 text-center">
          <h1 className="font-mono text-2xl font-semibold tracking-tight text-orbit-text">
            <span className="text-orbit-cyan">orbit</span>
            <span className="text-orbit-muted">/</span>
            <span className="text-orbit-magenta">ledger</span>
          </h1>
          <p className="mt-2 text-sm text-orbit-muted">
            Shared group finances. Sign in to continue.
          </p>
        </div>

        <LoginForm next={searchParams.next} />

        {searchParams.message ? (
          <p className="mt-4 rounded-md border border-orbit-cyan/40 bg-orbit-cyan/10 p-3 text-sm text-orbit-cyan">
            {searchParams.message}
          </p>
        ) : null}
        {searchParams.error ? (
          <p className="mt-4 rounded-md border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">
            {searchParams.error}
          </p>
        ) : null}
      </div>
    </main>
  );
}
