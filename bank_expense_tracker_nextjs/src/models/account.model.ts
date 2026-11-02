import { Schema, model, models, type Model, type Types } from "mongoose";

/**
 * Collection: `accountinfos` (legacy).
 *
 * Two different "account id" fields exist and must not be confused:
 *  - `accountId` (string, e.g. "ACC-1759…") is a legacy human-readable label.
 *  - `_id` (ObjectId) is the foreign key used by `transactions.accountId`.
 * New code always joins on `_id` and never on the string.
 */

export type BalanceAnchor = {
  balancePaise: number;
  asOfDate: Date;
  source: "statement" | "manual" | "opening";
  importId?: Types.ObjectId | null;
  note?: string | null;
  setAt: Date;
};

export type AccountDoc = {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  accountId: string;
  bankName: string;
  accountType: string;
  /** Last four digits only. */
  accountNumber: string;
  /** Deprecated: parser presets are cosmetic in the legacy app. Never read. */
  parserPreset?: string;
  /** Cached projection of the anchored-ledger formula, in rupees. */
  currentBalance: number;
  lastSyncedAt: Date;
  currency: "INR";
  balanceAnchor?: BalanceAnchor | null;
  createdAt?: Date;
  updatedAt?: Date;
};

const anchorSchema = new Schema<BalanceAnchor>(
  {
    balancePaise: { type: Number, required: true },
    asOfDate: { type: Date, required: true },
    source: {
      type: String,
      enum: ["statement", "manual", "opening"],
      required: true,
    },
    importId: { type: Schema.Types.ObjectId, ref: "statementImport", default: null },
    note: { type: String, default: null, trim: true },
    setAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const accountSchema = new Schema<AccountDoc>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "userInfo",
      required: true,
      index: true,
    },
    accountId: { type: String, required: true, unique: true },
    bankName: { type: String, default: "State Bank of India", trim: true },
    accountType: { type: String, default: "Savings Account", trim: true },
    accountNumber: { type: String, default: "", trim: true },
    parserPreset: { type: String, default: "sbi", trim: true },
    currentBalance: { type: Number, default: 0 },
    lastSyncedAt: { type: Date, default: Date.now },
    currency: { type: String, default: "INR" },
    balanceAnchor: { type: anchorSchema, default: null },
  },
  { timestamps: true, collection: "accountinfos" },
);

accountSchema.index({ userId: 1, createdAt: 1 });

export const Account =
  (models.accountInfo as Model<AccountDoc>) ??
  model<AccountDoc>("accountInfo", accountSchema);
