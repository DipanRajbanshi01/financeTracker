import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { listMembers } from "@/actions/members";
import { MemberList } from "@/components/groups/member-list";

export const dynamic = "force-dynamic";

export default async function MembersPage({ params }: { params: { groupId: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const members = await listMembers(params.groupId);
  const me = members.find((m) => m.user_id === user.id);
  const canManage = me?.role === "owner";

  return (
    <div className="space-y-4">
      <header>
        <h2 className="text-lg font-semibold text-orbit-text">Members</h2>
        <p className="text-xs text-orbit-muted">
          {canManage
            ? "You're the owner. Invite people by email — pending invites activate when they sign in."
            : "Only the owner can add or remove members."}
        </p>
      </header>
      <MemberList
        groupId={params.groupId}
        members={members}
        canManage={canManage}
        currentUserId={user.id}
      />
    </div>
  );
}
