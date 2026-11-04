import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { genSalt, hash, compare } from "bcryptjs";
import { codedError } from "@/lib/api";
import { dbConnect } from "@/lib/dbConnect";
import { User, type UserDoc } from "@/models/user.model";

/**
 * The one owner and their browser session, in one file:
 *
 * - bcrypt password hashing (the hash lives on the user document)
 * - the session: a random token stored ON the user document itself, and the
 *   cookie carries `<userId>.<token>`. Verifying a session is one `findOne`.
 * No JWT, no signing secret, no rate limiter — that's edge/infra work (e.g.
 * Vercel), not application code.
 */

export const SESSION_COOKIE = "expense_session";
export const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;

export type Session = { userId: string };

/** A login: mint a token, store it on the user, put `<userId>.<token>` in the cookie. */
export async function startSession(userId: string): Promise<void> {
  const token = randomBytes(32).toString("hex");
  await dbConnect();
  await User.findByIdAndUpdate(userId, {
    $set: { sessionToken: token, sessionExpiresAt: new Date(Date.now() + SESSION_TTL_SECONDS * 1000) },
  });

  const jar = await cookies();
  jar.set(SESSION_COOKIE, `${userId}.${token}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

/** The session, or null. One cookie read plus one `findOne` — nothing else. */
export async function getSession(): Promise<Session | null> {
  const jar = await cookies();
  const value = jar.get(SESSION_COOKIE)?.value;
  if (!value) return null;

  const dot = value.indexOf(".");
  const userId = dot > 0 ? value.slice(0, dot) : "";
  const token = dot > 0 ? value.slice(dot + 1) : "";
  if (!/^[0-9a-f]{24}$/i.test(userId) || !token) return null;

  await dbConnect();
  const user = await User.findOne({
    _id: userId,
    sessionToken: token,
    sessionExpiresAt: { $gt: new Date() },
  }).lean();
  if (!user) return null;

  return { userId: String(user._id) };
}

/** Logout: clear the cookie and kill the stored token. */
export async function endSession(): Promise<void> {
  const jar = await cookies();
  const value = jar.get(SESSION_COOKIE)?.value;
  jar.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });

  if (!value) return;
  const userId = value.slice(0, value.indexOf("."));
  if (/^[0-9a-f]{24}$/i.test(userId)) {
    await User.findByIdAndUpdate(userId, { $unset: { sessionToken: 1, sessionExpiresAt: 1 } });
  }
}

// ---------------------------------------------------------------------------
// Passwords — bcrypt, cost 12: ~250 ms per attempt, which also slows a
// brute-force attack to a crawl. The hash lives on the user document.
// ---------------------------------------------------------------------------

const COST = 12;

export async function hashPassword(password: string): Promise<string> {
  const salt = await genSalt(COST);
  return hash(password, salt);
}

export async function verifyPassword(
  password: string,
  stored: string | null | undefined,
): Promise<boolean> {
  if (!stored) return false; // setup state: no password accepts
  return compare(password, stored);
}

// ---------------------------------------------------------------------------
// The user in `userinfos` — a personal application, exactly one owner.
// All reads are scoped reads; the legacy collection is never renamed or
// rewritten — `passwordHash`, `sessionToken` are additive new fields.
// ---------------------------------------------------------------------------

export async function getUserById(userId: string): Promise<UserDoc | null> {
  await dbConnect();
  return (await User.findById(userId).lean()) as unknown as UserDoc | null;
}

/** The user that can sign in: the document carrying the bcrypt hash. */
export async function findPasswordUser(): Promise<UserDoc | null> {
  await dbConnect();
  const users = (await User.find().sort({ createdAt: 1 }).limit(2).lean()) as unknown as UserDoc[];

  if (users.length > 1 && users.every((user) => user.passwordHash)) {
    throw codedError("CONFLICT", "More than one account owns a password. This build expects exactly one.");
  }

  return users.find((user) => Boolean(user.passwordHash)) ?? null;
}

/** True while the ledger still awaits its one-time setup. */
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

/** The one-time owner creation: adopt the legacy document, or create one. */
export async function completeSetup(input: SetupInput): Promise<UserDoc> {
  await dbConnect();
  const users = (await User.find().sort({ createdAt: 1 }).limit(2).lean()) as unknown as UserDoc[];

  for (const user of users) {
    if (user.passwordHash) {
      throw codedError("CONFLICT", "An account already exists. Sign in instead of creating another.");
    }
  }

  if (users.length > 1) {
    throw codedError("CONFLICT", "More than one user document exists; refusing to choose an owner.");
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
