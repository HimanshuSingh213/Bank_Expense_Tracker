/**
 * Turns a thrown error into something safe to show a person.
 * The detail is logged server-side; the browser never sees a connection string,
 * a stack trace, or a MongoDB host.
 */
export function publicErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);

  if (message.includes("MONGODB_URI")) {
    return "The database is not configured. Copy .env.example to .env.local and set MONGODB_URI.";
  }

  if (
    message.includes("Could not connect") ||
    message.includes("Server selection") ||
    message.includes("timed out")
  ) {
    return "The database could not be reached. Check that MongoDB is running and that MONGODB_URI is correct.";
  }

  return "The server could not complete this request. The details were logged.";
}
