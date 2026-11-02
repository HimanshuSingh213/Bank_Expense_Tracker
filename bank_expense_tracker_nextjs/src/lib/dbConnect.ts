import mongoose from "mongoose";

/**
 * One connection per process. Next.js reloads modules on every edit in dev,
 * so the promise is cached on globalThis rather than in module scope —
 * otherwise each hot reload opens another pool.
 */

type Cache = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

const globalCache = globalThis as typeof globalThis & { _mongoose?: Cache };

const cache: Cache = (globalCache._mongoose ??= {
  conn: null,
  promise: null,
});

export async function dbConnect(): Promise<typeof mongoose> {
  if (cache.conn) return cache.conn;

  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error(
      "MONGODB_URI is not set. Copy .env.example to .env.local and fill it in.",
    );
  }

  cache.promise ??= mongoose.connect(uri, {
    serverSelectionTimeoutMS: 8000,
    // Never create indexes implicitly in production. The deployment decides
    // when schema changes are applied.
    autoIndex: process.env.NODE_ENV !== "production",
  });

  try {
    cache.conn = await cache.promise;
  } catch (error) {
    // Let the next call try again instead of caching a permanent failure.
    cache.promise = null;
    throw error;
  }

  return cache.conn;
}

/**
 * Whether the deployment is a replica set, which decides if import commits can
 * use a transaction. Detected from the server, never guessed, and asked once.
 */
let transactionSupport: boolean | null = null;

export async function supportsTransactions(): Promise<boolean> {
  if (transactionSupport !== null) return transactionSupport;

  try {
    const client = mongoose.connection.getClient();
    const hello = await client.db("admin").command({ hello: 1 });
    transactionSupport = typeof hello.setName === "string" && hello.setName !== "";
  } catch {
    transactionSupport = false;
  }

  return transactionSupport;
}
