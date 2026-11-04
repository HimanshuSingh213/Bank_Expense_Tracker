import { Schema, model, models, type Model, type Types } from "mongoose";

/**
 * Collection: `statementimports` (new, additive — no legacy data is touched).
 *
 * A draft holds the parsed preview for 24 hours. Committing it writes the
 * selected transactions and may advance the account's balance anchor. The
 * `idempotencyKey` is unique, so retrying a confirm cannot insert twice.
 */

export type ImportStatus = "draft" | "committed" | "failed" | "discarded";

export type PreviewRowDoc = {
  rowNumber: number;
  raw: string[];
  /** Party/title from the narration (extractPartyAndTitle rules). */
  title: string;
  recipient: string;
  txnDate: string | null;
  valueDate?: string | null;
  narration: string;
  referenceNumber: string | null;
  direction: "debit" | "credit" | null;
  amountPaise: number | null;
  balanceAfterPaise: number | null;
  verdict: "new" | "duplicate" | "possible" | "invalid";
  reason?: string | null;
  issues: string[];
  selected: boolean;
  category?: string;
  /** False when the category came from the keyword fallback, not a rule. */
  categoryConfident?: boolean;
  /** What the local AI tier would call this row instead, when it has an idea. */
  aiCategory?: string | null;
  aiConfidence?: number | null;
  dedupeKey?: string | null;
};

export type StatementImportDoc = {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  accountId: Types.ObjectId;
  status: ImportStatus;
  originalFileName: string;
  fileSize: number;
  fileSha256: string;
  detectedFormat: string;
  statementPeriod: { from: Date; to: Date } | null;
  statementOpeningBalancePaise: number | null;
  statementClosingBalancePaise: number | null;
  rows: PreviewRowDoc[];
  totals: {
    parsed: number;
    valid: number;
    invalid: number;
    new: number;
    possibleDuplicate: number;
    selected: number;
  };
  result: {
    inserted: number;
    skipped: number;
    invalid: number;
    anchorUpdated: boolean;
  } | null;
  idempotencyKey: string;
  expiresAt?: Date | null;
  committedAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
};

const rowSchema = new Schema<PreviewRowDoc>(
  {
    rowNumber: { type: Number, required: true },
    raw: { type: [String], default: [] },
    title: { type: String, default: "" },
    recipient: { type: String, default: "" },
    txnDate: { type: String, default: null },
    valueDate: { type: String, default: null },
    narration: { type: String, default: "" },
    referenceNumber: { type: String, default: null },
    direction: { type: String, enum: ["debit", "credit", null], default: null },
    amountPaise: { type: Number, default: null },
    balanceAfterPaise: { type: Number, default: null },
    verdict: {
      type: String,
      enum: ["new", "duplicate", "possible", "invalid"],
      required: true,
    },
    reason: { type: String, default: null },
    issues: { type: [String], default: [] },
    selected: { type: Boolean, default: true },
    category: { type: String, default: "Others" },
    categoryConfident: { type: Boolean, default: true },
    aiCategory: { type: String, default: null },
    aiConfidence: { type: Number, default: null },
    dedupeKey: { type: String, default: null },
  },
  { _id: false },
);

const periodSchema = new Schema<NonNullable<StatementImportDoc["statementPeriod"]>>(
  {
    from: { type: Date, default: null },
    to: { type: Date, default: null },
  },
  { _id: false },
);

const resultSchema = new Schema<NonNullable<StatementImportDoc["result"]>>(
  {
    inserted: { type: Number, default: 0 },
    skipped: { type: Number, default: 0 },
    invalid: { type: Number, default: 0 },
    anchorUpdated: { type: Boolean, default: false },
  },
  { _id: false },
);

const importSchema = new Schema<StatementImportDoc>(
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
    status: {
      type: String,
      enum: ["draft", "committed", "failed", "discarded"],
      default: "draft",
      index: true,
    },
    originalFileName: { type: String, required: true },
    fileSize: { type: Number, required: true },
    fileSha256: { type: String, required: true },
    detectedFormat: { type: String, required: true },
    statementPeriod: {
      type: periodSchema,
      default: null,
    },
    statementOpeningBalancePaise: { type: Number, default: null },
    statementClosingBalancePaise: { type: Number, default: null },
    rows: { type: [rowSchema], default: [] },
    totals: {
      parsed: { type: Number, default: 0 },
      valid: { type: Number, default: 0 },
      invalid: { type: Number, default: 0 },
      new: { type: Number, default: 0 },
      possibleDuplicate: { type: Number, default: 0 },
      selected: { type: Number, default: 0 },
    },
    result: {
      type: resultSchema,
      default: null,
    },
    idempotencyKey: { type: String, required: true },
    expiresAt: { type: Date, default: null },
    committedAt: { type: Date, default: null },
  },
  { timestamps: true, collection: "statementimports" },
);

importSchema.index({ idempotencyKey: 1 }, { unique: true });
importSchema.index({ userId: 1, status: 1, createdAt: -1 });
// Drafts disappear on their own; committed imports never expire.
importSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const StatementImport =
  (models.statementImport as Model<StatementImportDoc>) ??
  model<StatementImportDoc>("statementImport", importSchema);
