"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  addTransactionSchema,
  deleteTransactionSchema,
  recordSettlementSchema,
} from "@/lib/validation";
import type { ActionResult } from "./groups";
import type { Transaction, TransactionType, CollectedSource } from "@/lib/types";

export interface TransactionWithSplits extends Transaction {
  splits: { user_id: string; share_minor: number }[];
}

export interface TransactionFilter {
  groupId: string;
  paidBy?: string;
  category?: string;
  type?: TransactionType;
}

export async function listTransactions(
  filter: TransactionFilter,
): Promise<TransactionWithSplits[]> {
  const supabase = createClient();

  let q = supabase
    .from("transactions")
    .select(`
      id, group_id, type, amount_minor, paid_by, paid_to, source,
      description, category, occurred_on, created_by, created_at,
      splits:transaction_splits ( user_id, share_minor )
    `)
    .eq("group_id", filter.groupId)
    .order("occurred_on", { ascending: false })
    .order("created_at", { ascending: false });

  if (filter.paidBy) q = q.eq("paid_by", filter.paidBy);
  if (filter.category) q = q.eq("category", filter.category);
  if (filter.type) q = q.eq("type", filter.type);

  const { data, error } = await q;
  if (error || !data) return [];

  return data.map((row: any) => ({
    id: row.id,
    group_id: row.group_id,
    type: row.type as TransactionType,
    amount_minor: Number(row.amount_minor),
    paid_by: row.paid_by,
    paid_to: row.paid_to,
    source: (row.source ?? null) as CollectedSource | null,
    description: row.description ?? "",
    category: row.category ?? null,
    occurred_on: row.occurred_on,
    created_by: row.created_by,
    created_at: row.created_at,
    splits: (row.splits ?? []).map((s: any) => ({
      user_id: s.user_id,
      share_minor: Number(s.share_minor),
    })),
  }));
}

export async function listCategoriesInUse(groupId: string): Promise<string[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("transactions")
    .select("category")
    .eq("group_id", groupId)
    .not("category", "is", null);
  const set = new Set<string>();
  for (const row of data ?? []) if (row.category) set.add(row.category);
  return Array.from(set).sort();
}

export async function addTransaction(_prev: unknown, formData: FormData): Promise<ActionResult> {
  const rawType = formData.get("type");

  const baseFields = {
    groupId: formData.get("groupId"),
    amount: formData.get("amount"),
    description: formData.get("description") ?? "",
    category: formData.get("category"),
    occurred_on: formData.get("occurred_on"),
    splitsJson: formData.get("splitsJson") ?? "",
  };

  const candidate =
    rawType === "spent"
      ? { type: "spent", paid_by: formData.get("paid_by"), ...baseFields }
      : {
          type: "collected",
          source: formData.get("source"),
          paid_by: formData.get("paid_by") || undefined,
          ...baseFields,
        };

  const parsed = addTransactionSchema.safeParse(candidate);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join(".");
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { ok: false, error: "Please fix the errors below.", fieldErrors };
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const v = parsed.data;
  const insertPayload: {
    group_id: string;
    type: TransactionType;
    amount_minor: number;
    paid_by: string | null;
    paid_to: string | null;
    source: CollectedSource | null;
    description: string;
    category: string | null;
    occurred_on: string;
    created_by: string;
  } =
    v.type === "spent"
      ? {
          group_id: v.groupId,
          type: "spent",
          amount_minor: v.amount,
          paid_by: v.paid_by,
          paid_to: null,
          source: null,
          description: v.description ?? "",
          category: v.category ?? null,
          occurred_on: v.occurred_on,
          created_by: user.id,
        }
      : {
          group_id: v.groupId,
          type: "collected",
          amount_minor: v.amount,
          paid_by: v.source === "member" ? v.paid_by ?? null : null,
          paid_to: null,
          source: v.source,
          description: v.description ?? "",
          category: v.category ?? null,
          occurred_on: v.occurred_on,
          created_by: user.id,
        };

  const { data: txn, error } = await supabase
    .from("transactions")
    .insert(insertPayload)
    .select("id")
    .single();

  if (error || !txn) {
    return { ok: false, error: error?.message ?? "Failed to save transaction." };
  }

  if (v.splitsJson.length > 0) {
    const rows = v.splitsJson.map((s) => ({
      transaction_id: txn.id,
      user_id: s.user_id,
      share_minor: s.share_minor,
    }));
    const { error: splitsErr } = await supabase.from("transaction_splits").insert(rows);
    if (splitsErr) {
      // Roll back the transaction row to avoid orphaned data.
      await supabase.from("transactions").delete().eq("id", txn.id);
      return { ok: false, error: `Could not save splits: ${splitsErr.message}` };
    }
  }

  revalidatePath(`/groups/${v.groupId}`);
  revalidatePath(`/groups/${v.groupId}/transactions`);
  return { ok: true, data: undefined };
}

export async function recordSettlement(_prev: unknown, formData: FormData): Promise<ActionResult> {
  const parsed = recordSettlementSchema.safeParse({
    groupId: formData.get("groupId"),
    fromUserId: formData.get("fromUserId"),
    toUserId: formData.get("toUserId"),
    amount: formData.get("amount"),
    occurred_on: formData.get("occurred_on"),
    description: formData.get("description") ?? "",
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join(".");
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { ok: false, error: "Please fix the errors below.", fieldErrors };
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const { error } = await supabase.from("transactions").insert({
    group_id: parsed.data.groupId,
    type: "settlement",
    amount_minor: parsed.data.amount,
    paid_by: parsed.data.fromUserId,
    paid_to: parsed.data.toUserId,
    source: null,
    description: parsed.data.description ?? "",
    category: null,
    occurred_on: parsed.data.occurred_on,
    created_by: user.id,
  });

  if (error) return { ok: false, error: error.message };

  revalidatePath(`/groups/${parsed.data.groupId}`);
  revalidatePath(`/groups/${parsed.data.groupId}/transactions`);
  return { ok: true, data: undefined };
}

export async function deleteTransaction(_prev: unknown, formData: FormData): Promise<ActionResult> {
  const parsed = deleteTransactionSchema.safeParse({
    transactionId: formData.get("transactionId"),
    groupId: formData.get("groupId"),
  });
  if (!parsed.success) return { ok: false, error: "Invalid request." };

  const supabase = createClient();
  const { error } = await supabase
    .from("transactions")
    .delete()
    .eq("id", parsed.data.transactionId);

  if (error) return { ok: false, error: error.message };

  revalidatePath(`/groups/${parsed.data.groupId}`);
  revalidatePath(`/groups/${parsed.data.groupId}/transactions`);
  return { ok: true, data: undefined };
}
