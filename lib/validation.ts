// Zod schemas for Server Action input validation.

import { z } from "zod";

export const emailSchema = z.string().trim().toLowerCase().email();

export const groupModeSchema = z.enum(["splitwise", "pool"]);

export const currencySchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z]{3}$/, "Currency must be a 3-letter ISO code");

export const createGroupSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(80),
  mode: groupModeSchema,
  currency: currencySchema.default("NPR"),
  ownerDisplayName: z.string().trim().max(80).optional().or(z.literal("")).transform((v) => (v ? v : undefined)),
});
export type CreateGroupInput = z.infer<typeof createGroupSchema>;

export const inviteMemberSchema = z.object({
  groupId: z.string().uuid(),
  email: emailSchema,
  displayName: z
    .string()
    .trim()
    .max(80)
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : undefined)),
});
export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;

export const removeMemberSchema = z.object({
  groupId: z.string().uuid(),
  // Either user_id (joined) or invite_email (pending)
  userId: z.string().uuid().optional(),
  inviteEmail: emailSchema.optional(),
}).refine((v) => Boolean(v.userId) !== Boolean(v.inviteEmail), {
  message: "Specify exactly one of userId or inviteEmail",
});
export type RemoveMemberInput = z.infer<typeof removeMemberSchema>;

// ============================================================================
// Transactions
// ============================================================================

// Amount comes from the form as a string in major units (e.g. "1234.56").
const amountMinorSchema = z
  .string()
  .trim()
  .regex(/^\d+(\.\d{1,2})?$/, "Amount must be a positive number with up to 2 decimals")
  .transform((s) => {
    const [whole, frac = ""] = s.split(".");
    const paddedFrac = (frac + "00").slice(0, 2);
    return parseInt(whole, 10) * 100 + parseInt(paddedFrac, 10);
  })
  .refine((n) => n > 0, "Amount must be greater than zero");

const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date");

const splitRowSchema = z.object({
  user_id: z.string().uuid(),
  share_minor: z.number().int().nonnegative(),
});

const baseTxn = {
  groupId: z.string().uuid(),
  amount: amountMinorSchema,
  description: z.string().trim().max(200).default(""),
  category: z
    .string()
    .trim()
    .max(40)
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : undefined)),
  occurred_on: isoDateSchema,
  // JSON-encoded array of { user_id, share_minor }. Empty/absent means no splits.
  splitsJson: z
    .string()
    .optional()
    .transform((s, ctx) => {
      if (!s || s.trim() === "") return [] as { user_id: string; share_minor: number }[];
      try {
        const parsed = JSON.parse(s);
        const result = z.array(splitRowSchema).safeParse(parsed);
        if (!result.success) {
          ctx.addIssue({ code: "custom", message: "Invalid splits payload" });
          return z.NEVER;
        }
        return result.data;
      } catch {
        ctx.addIssue({ code: "custom", message: "Splits must be valid JSON" });
        return z.NEVER;
      }
    }),
};

export const addTransactionSchema = z
  .discriminatedUnion("type", [
    z.object({
      type: z.literal("spent"),
      paid_by: z.string().uuid(),
      source: z.undefined(),
      ...baseTxn,
    }),
    z.object({
      type: z.literal("collected"),
      source: z.enum(["member", "outside"]),
      paid_by: z.string().uuid().optional(),
      ...baseTxn,
    }),
  ])
  .superRefine((v, ctx) => {
    if (v.type === "collected" && v.source === "member" && !v.paid_by) {
      ctx.addIssue({
        code: "custom",
        path: ["paid_by"],
        message: "Pick which member contributed.",
      });
    }
    if (v.splitsJson.length > 0) {
      const sum = v.splitsJson.reduce((a, b) => a + b.share_minor, 0);
      if (sum !== v.amount) {
        ctx.addIssue({
          code: "custom",
          path: ["splitsJson"],
          message: `Splits must sum to the amount (got ${sum}, expected ${v.amount}).`,
        });
      }
      const seen = new Set<string>();
      for (const s of v.splitsJson) {
        if (seen.has(s.user_id)) {
          ctx.addIssue({
            code: "custom",
            path: ["splitsJson"],
            message: "Duplicate member in splits.",
          });
          break;
        }
        seen.add(s.user_id);
      }
    }
  });

export type AddTransactionInput = z.infer<typeof addTransactionSchema>;

export const deleteTransactionSchema = z.object({
  transactionId: z.string().uuid(),
  groupId: z.string().uuid(),
});

export const recordSettlementSchema = z
  .object({
    groupId: z.string().uuid(),
    fromUserId: z.string().uuid(),
    toUserId: z.string().uuid(),
    amount: amountMinorSchema,
    occurred_on: isoDateSchema,
    description: z.string().trim().max(200).default(""),
  })
  .refine((v) => v.fromUserId !== v.toUserId, {
    path: ["toUserId"],
    message: "Payer and receiver must differ.",
  });
export type RecordSettlementInput = z.infer<typeof recordSettlementSchema>;
