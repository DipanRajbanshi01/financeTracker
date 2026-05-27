// Tiny shared placeholder used while subsequent phases are unimplemented.
export function PhasePlaceholder({ phase, title }: { phase: number; title: string }) {
  return (
    <div className="panel grid place-items-center px-6 py-16 text-center">
      <div className="space-y-2">
        <div className="font-mono text-xs uppercase tracking-[0.3em] text-orbit-cyan/80">
          Phase {phase}
        </div>
        <h2 className="text-xl font-medium text-orbit-text">{title}</h2>
        <p className="text-sm text-orbit-muted">Coming in a later phase.</p>
      </div>
    </div>
  );
}
