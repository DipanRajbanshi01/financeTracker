import Link from "next/link";
import { notFound } from "next/navigation";
import { getGroup } from "@/actions/groups";
import { GroupTabs } from "./group-tabs";

export default async function GroupLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { groupId: string };
}) {
  const group = await getGroup(params.groupId);
  if (!group) notFound();

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between gap-4">
        <div className="min-w-0">
          <Link
            href="/dashboard"
            className="text-xs font-mono uppercase tracking-wider text-orbit-muted hover:text-orbit-cyan"
          >
            ← dashboard
          </Link>
          <h1 className="mt-1 truncate text-2xl font-semibold tracking-tight">{group.name}</h1>
          <p className="text-xs text-orbit-muted">
            <span
              className={
                group.mode === "splitwise" ? "text-orbit-cyan" : "text-orbit-magenta"
              }
            >
              {group.mode === "splitwise" ? "Splitwise" : "Shared pool"}
            </span>
            {" · "}
            {group.currency}
          </p>
        </div>
      </header>

      <GroupTabs groupId={group.id} />

      <div>{children}</div>
    </div>
  );
}
