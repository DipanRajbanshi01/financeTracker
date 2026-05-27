// Shared TypeScript types for Orbit Ledger.
// Mirrors the Postgres schema in supabase/migrations.

export type GroupMode = "splitwise" | "pool";

export type TransactionType = "spent" | "collected" | "settlement";

// `collected` source: from inside the group (member top-up) or outside (refund, prize, ...)
export type CollectedSource = "member" | "outside";

export type MemberRole = "owner" | "member";

export interface Profile {
  id: string;
  email: string;
  display_name: string | null;
  created_at: string;
}

export interface Group {
  id: string;
  name: string;
  mode: GroupMode;
  currency: string; // ISO 4217, default "NPR"
  created_by: string;
  created_at: string;
}

export interface GroupMember {
  group_id: string;
  user_id: string | null;       // null while invite is pending
  invite_email: string | null;  // set while pending
  display_name: string | null;  // override label inside the group
  role: MemberRole;
  joined_at: string;
}

export interface Transaction {
  id: string;
  group_id: string;
  type: TransactionType;
  amount_minor: number;        // integer paisa (1 NPR = 100)
  paid_by: string | null;       // group_members.user_id for spent/settlement
  paid_to: string | null;       // settlements: who received it
  source: CollectedSource | null; // only for `collected`
  description: string;
  category: string | null;
  occurred_on: string;          // ISO date
  created_by: string;
  created_at: string;
}

export interface TransactionSplit {
  transaction_id: string;
  user_id: string;              // group member
  share_minor: number;          // integer paisa owed by this member for this txn
}
