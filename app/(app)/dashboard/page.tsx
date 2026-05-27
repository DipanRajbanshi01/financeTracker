import Link from "next/link";
import { listMyGroups } from "@/actions/groups";
import { GroupCard } from "@/components/groups/group-card";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const groups = await listMyGroups();

  return (
    <div className="space-y-8">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Your groups</h1>
          <p className="mt-1 text-sm text-orbit-muted">
            Track shared spending or pool a fund. Pick what fits each crew.
          </p>
        </div>
        <Link href="/groups/new" className="neon-button">
          + New group
        </Link>
      </header>

      {groups.length === 0 ? (
        <section className="panel grid place-items-center px-6 py-16 text-center">
          <div className="space-y-3">
            <div className="font-mono text-xs uppercase tracking-[0.3em] text-orbit-cyan/80">
              empty orbit
            </div>
            <h2 className="text-xl font-medium text-orbit-text">No groups yet</h2>
            <p className="max-w-md text-sm text-orbit-muted">
              Create your first group to start tracking expenses with friends, flatmates,
              or trip-mates. You can choose Splitwise-style or a shared pool per group.
            </p>
            <div className="pt-2">
              <Link href="/groups/new" className="neon-button">
                Create a group
              </Link>
            </div>
          </div>
        </section>
      ) : (
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {groups.map((g) => (
            <GroupCard key={g.id} group={g} />
          ))}
        </section>
      )}
    </div>
  );
}
