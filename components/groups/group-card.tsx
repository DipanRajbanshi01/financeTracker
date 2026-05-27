import Link from "next/link";
import type { GroupSummary } from "@/actions/groups";

const modeLabel: Record<GroupSummary["mode"], string> = {
  splitwise: "Splitwise",
  pool: "Shared pool",
};

const modeAccent: Record<GroupSummary["mode"], string> = {
  splitwise: "text-orbit-cyan border-orbit-cyan/40 bg-orbit-cyan/10",
  pool: "text-orbit-magenta border-orbit-magenta/40 bg-orbit-magenta/10",
};

export function GroupCard({ group }: { group: GroupSummary }) {
  return (
    <Link
      href={`/groups/${group.id}`}
      className="panel block p-5 transition hover:border-orbit-cyan/50 hover:shadow-neon"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-lg font-semibold text-orbit-text">{group.name}</h3>
          <p className="mt-1 text-xs text-orbit-muted">
            {group.member_count} {group.member_count === 1 ? "member" : "members"}
            {" · "}
            {group.currency}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider ${modeAccent[group.mode]}`}
        >
          {modeLabel[group.mode]}
        </span>
      </div>
      {group.my_role === "owner" ? (
        <p className="mt-3 text-[10px] font-mono uppercase tracking-wider text-orbit-muted">
          owner
        </p>
      ) : null}
    </Link>
  );
}
