import { genSalt, hash, compare } from "bcryptjs";

/**
 * Password hashing with bcrypt. The hash lives on the user document in
 * `userinfos.passwordHash` — one owner, one password.
 *
 * bcryptjs is pure JavaScript, so it builds everywhere without node-gyp.
 * Cost 12 is the current sensible default: ~250ms per attempt here, which
 * also slows a brute-force attack to a crawl.
 */

const COST = 12;

export async function hashPassword(password: string): Promise<string> {
  const salt = await genSalt(COST);
  return hash(password, salt);
}

export async function verifyPassword(
  password: string,
  stored: string | null | undefined,
): Promise<boolean> {
  if (!stored) {
    // A user without a hash is in setup state; do not accept any password.
    return false;
  }

  return compare(password, stored);
}
