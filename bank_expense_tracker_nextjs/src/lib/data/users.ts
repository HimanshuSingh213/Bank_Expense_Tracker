import { dbConnect } from "@/lib/dbConnect";
import { User, type UserDoc } from "@/models/user.model";

/**
 * This is a personal application: exactly one owner is expected. All reads
 * below are scoped reads of `userinfos`; the legacy collection is never
 * renamed or rewritten — `passwordHash` is an optional new field.
 */
export class SetupError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SetupError";
  }
}

/** Raised when /setup is attempted after a password already exists. */
export class SetupDoneError extends Error {
  constructor() {
    super("An account already exists. Sign in instead of creating another.");
    this.name = "SetupDoneError";
  }
}

export async function getUserById(userId: string): Promise<UserDoc | null> {
  await dbConnect();

  return (await User.findById(userId).lean()) as unknown as UserDoc | null;
}

/**
 * The user that can sign in: the document carrying the bcrypt hash.
 * Returns null while the ledger still awaits its one-time setup.
 */
export async function findPasswordUser(): Promise<UserDoc | null> {
  await dbConnect();

  const users = (await User.find().sort({ createdAt: 1 }).limit(2).lean()) as
    unknown as UserDoc[];

  if (users.length > 1 && users.every((user) => user.passwordHash)) {
    throw new SetupError("More than one account owns a password. This build expects exactly one.");
  }

  return users.find((user) => Boolean(user.passwordHash)) ?? null;
}

/** True while no account owns a password — the /setup page's whole job. */
export async function setupNeeded(): Promise<boolean> {
  await dbConnect();

  const count = await User.countDocuments({
    passwordHash: { $exists: true, $nin: [null, ""] },
  });

  return count === 0;
}

export type SetupInput = {
  name: string;
  email: string;
  passwordHash: string;
};

/**
 * One-time account creation. Two acceptable worlds:
 *  - no documents exist → create the owner;
 *  - documents exist but none has a password (the legacy DB) → adopt the
 *    oldest one in place: its `_id` and linked data survive untouched.
 * Never creates a second owner, never deletes anything.
 */
export async function completeSetup(input: SetupInput): Promise<UserDoc> {
  await dbConnect();

  const users = (await User.find().sort({ createdAt: 1 }).limit(2).lean()) as
    unknown as UserDoc[];

  for (const user of users) {
    if (user.passwordHash) throw new SetupDoneError();
  }

  if (users.length > 1) {
    throw new SetupError(
      "More than one user document exists in `userinfos`; refusing to choose an owner for you.",
    );
  }

  if (users.length === 1) {
    const adopted = await User.findByIdAndUpdate(
      users[0]._id,
      {
        $set: {
          name: input.name,
          email: input.email,
          passwordHash: input.passwordHash,
          provider: "local",
        },
      },
      { new: true, runValidators: false },
    ).lean();

    return adopted as unknown as UserDoc;
  }

  const created = await User.create({
    name: input.name,
    email: input.email,
    provider: "local",
    passwordHash: input.passwordHash,
  });

  return created.toObject() as unknown as UserDoc;
}
