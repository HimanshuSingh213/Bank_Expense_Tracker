#!/usr/bin/env node
/**
 * LEGACY HELPER — the auth flow no longer uses this.
 *
 * The password is now created on the one-time /setup screen and stored as a
 * bcrypt hash on the user document in `userinfos`. This script remains only
 * for generating an env hash if you ever want to keep the password outside
 * the database.
 */
import { randomBytes, scrypt } from "node:crypto";
import { promisify } from "node:util";
import readline from "node:readline/promises";

const scryptAsync = promisify(scrypt);

async function main() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const password = await rl.question("App password: ");
  rl.close();

  if (!password || password.length < 8) {
    console.error("Use at least 8 characters.");
    process.exitCode = 1;
    return;
  }

  const N = 16384;
  const r = 8;
  const p = 1;
  const salt = randomBytes(16);
  const key = await scryptAsync(password, salt, 32, { N, r, p, maxmem: 64 * 1024 * 1024 });

  console.log(
    `\nAUTH_PASSWORD_HASH=scrypt$N=${N},r=${r},p=${p}$${salt.toString("base64")}$${key.toString("base64")}`,
  );
  console.log("\nNOTE: the current auth flow does not read this value. Use /setup instead.");
}

main();
