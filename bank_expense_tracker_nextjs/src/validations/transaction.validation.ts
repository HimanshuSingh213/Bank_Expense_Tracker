import { z } from "zod";

/**
 * Shared money/date rules. Amount arrives in rupees (what a person types) and
 * becomes integer paise server-side; the direction decides, not the sign.
 */
const amount = z
  .string()
  .trim()
  .min(1, "Enter an amount.")
  .regex(/^-?\d+(\.\d{1,2})?$/, "Use rupees with at most 2 decimals. e.g. 1234.56");

const title = z.string().trim().min(1, "Give the row a title.").max(120);

const category = z.enum([
  "Food",
  "Travel",
  "Shopping",
  "Bills",
  "Investments",
  "Salary",
  "Transfer",
  "Cash",
  "Fees & Charges",
  "Interest",
  "Others",
]);

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a valid date.");

const direction = z.enum(["debit", "credit"]);

/** Body of POST /api/transactions (add one manually). */
export const createTransactionSchema = z.object({
  title,
  date: isoDate,
  direction,
  amount,
  category,
  narration: z.string().trim().max(400).optional(),
  referenceNumber: z.string().trim().max(40).optional(),
  reviewed: z.boolean().default(false),
});

/** Body of PATCH /api/transactions/[id] (edit, or mark reviewed). */
export const updateTransactionSchema = createTransactionSchema.partial().extend({
  reviewed: z.boolean().optional(),
});

/**
 * The sidebar edit form. Every field starts filled from the existing row, so
 * the form schema wants each one present — the all-optional server variant
 * above stays the API contract. An empty reference here means "leave
 * unchanged".
 */
export const editTransactionFormSchema = z.object({
  title,
  date: isoDate,
  direction,
  amount,
  category,
  narration: z.string().trim().max(400, "Keep the narration short."),
  referenceNumber: z.string().trim().max(40),
});

export const reviewTransactionSchema = z.object({
  reviewed: z.boolean(),
});

const bulkIds = z.array(z.string().min(1)).min(1).max(500);

/**
 * Body of POST /api/transactions/bulk — the multiselect delete in the table
 * and the calculator's "mark reviewed" button. A discriminated union, so a
 * review body must carry the new value and a delete body cannot sneak one in.
 */
export const bulkTransactionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("review"), ids: bulkIds, reviewed: z.boolean() }),
  z.object({ action: z.literal("delete"), ids: bulkIds }),
]);

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;
export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>;
export type ReviewTransactionInput = z.infer<typeof reviewTransactionSchema>;
export type EditTransactionFormInput = z.infer<typeof editTransactionFormSchema>;
export type BulkTransactionInput = z.infer<typeof bulkTransactionSchema>;
