import { Schema, model, models, type Model } from "mongoose";

/**
 * Collection: `userinfos` (legacy). Exactly one document is expected — this is
 * a personal application, not a tenant system. The login flow refuses to sign a
 * session when zero or several documents exist rather than guess.
 */
export type UserDoc = {
  _id: string;
  name: string;
  email: string;
  provider: string;
  /**
   * New, optional — additive only. Set by the one-time /setup flow with a
   * bcrypt hash. Legacy documents (or the legacy Express app) simply ignore
   * this field, so nothing old breaks.
   */
  passwordHash?: string | null;
  /**
   * New, optional — the current login token (random hex). `startSession`
   * writes it, `getSession` matches it, `endSession` clears it. There is no
   * signing secret anywhere: possession of the token is the whole proof, so
   * it only ever travels in one httpOnly cookie.
   */
  sessionToken?: string | null;
  sessionExpiresAt?: Date | null;
  settings?: {
    locale?: string;
    dateFormat?: string;
  };
  createdAt?: Date;
  updatedAt?: Date;
};

const userSchema = new Schema<UserDoc>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true },
    provider: { type: String, default: "local", trim: true },
    // Additive: the bcrypt hash written by the one-time /setup flow.
    passwordHash: { type: String, default: null },
    sessionToken: { type: String, default: null },
    sessionExpiresAt: { type: Date, default: null },
    settings: {
      locale: { type: String, default: "en-IN" },
      dateFormat: { type: String, default: "dd MMM yyyy" },
    },
  },
  { timestamps: true, collection: "userinfos" },
);

export const User =
  (models.userInfo as Model<UserDoc>) ?? model<UserDoc>("userInfo", userSchema);
