import { Schema, model, models, type Model, type Types } from "mongoose";

/**
 * Collection: `transactions` (legacy, extended in place).
 *
 * Money: `amountPaise` is authoritative. `amount` (rupees) is kept in sync only
 * so the legacy application keeps showing the right number; no new code does
 * arithmetic on it.
 *
 * Direction: `direction` must always agree with `isExpense`
 * (debit ⇔ isExpense true).
 */

export type TransactionDoc = {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  accountId: Types.ObjectId;

  // Legacy display fields, still written.
  title: string;
  amount: number;
  isExpense: boolean;
  category: string;
  recipient?: string;
  description?: string;
  isOnline?: boolean;
  reviewed: boolean;
  reviewedAt?: Date | null;
  /** Statement running balance in rupees, kept for legacy readers. */
  balance?: number | null;
  /** Informational only since the anchored ledger; not a uniqueness key. */
  fingerprint?: string | null;
  source: "manual" | "statement-import";
  /** Legacy mixed date. New code reads `txnDate` and falls back to this. */
  date?: Date | string | null;

  // New, authoritative fields.
  amountPaise: number;
  txnDate: Date;
  valueDate?: Date | null;
  direction: "debit" | "credit";
  referenceNumber?: string | null;
  balanceAfterPaise?: number | null;
  /** Unique + sparse: only set when the bank gave us a strong reference. */
  dedupeKey?: string | null;
  importId?: Types.ObjectId | null;
  importRowNumber?: number | null;
  rawRow?: string[] | null;
  deletedAt?: Date | null;

  createdAt?: Date;
  updatedAt?: Date;
};

const transactionSchema = new Schema<TransactionDoc>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "userInfo",
      required: true,
      index: true,
    },
    accountId: {
      type: Schema.Types.ObjectId,
      ref: "accountInfo",
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
    isExpense: { type: Boolean, required: true, default: true },
    category: { type: String, required: true, default: "Others" },
    recipient: { type: String, default: "", trim: true },
    description: { type: String, default: "" },
    isOnline: { type: Boolean, default: false },
    reviewed: { type: Boolean, default: false },
    reviewedAt: { type: Date, default: null },
    balance: { type: Number, default: null },
    fingerprint: { type: String, default: null },
    source: {
      type: String,
      enum: ["manual", "statement-import"],
      default: "manual",
    },
    date: { type: Schema.Types.Mixed, default: null },

    amountPaise: { type: Number, required: true },
    txnDate: { type: Date, required: true, index: true },
    valueDate: { type: Date, default: null },
    direction: {
      type: String,
      enum: ["debit", "credit"],
      required: true,
    },
    referenceNumber: { type: String, default: null },
    balanceAfterPaise: { type: Number, default: null },
    dedupeKey: { type: String, default: null },
    importId: { type: Schema.Types.ObjectId, ref: "statementImport", default: null },
    importRowNumber: { type: Number, default: null },
    rawRow: { type: [String], default: null },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true, collection: "transactions" },
);

transactionSchema.index({ userId: 1, txnDate: -1 });
transactionSchema.index({ userId: 1, accountId: 1, txnDate: -1 });
transactionSchema.index({ userId: 1, category: 1, txnDate: -1 });
transactionSchema.index({ userId: 1, reviewed: 1 });
transactionSchema.index({ importId: 1 });
transactionSchema.index({ dedupeKey: 1 }, { unique: true, sparse: true });
// Legacy queries ordered by these; keep them working.
transactionSchema.index({ date: -1 });
transactionSchema.index({ createdAt: -1 });

export const Transaction =
  (models.transaction as Model<TransactionDoc>) ??
  model<TransactionDoc>("transaction", transactionSchema);
