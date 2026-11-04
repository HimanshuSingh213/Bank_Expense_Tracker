import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { AppShell } from "@/components/common/app-shell";
import { getSession, getUserById } from "@/lib/auth";
import { getPrimaryAccountDoc, last4 } from "@/lib/data/accounts";

/**
 * The security boundary for every page in this group: no verified session, no
 * render. The proxy's cookie check is only a convenience; this is the check
 * that matters.
 */
export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  let userName = "Signed in";
  let accountLabel: string | null = null;
  let userFound = false;
  let loadFailed = false;

  try {
    const user = await getUserById(session.userId);
    userFound = Boolean(user);

    if (user) {
      userName = user.name || user.email || "Signed in";

      const account = await getPrimaryAccountDoc(session.userId);
      if (account) {
        accountLabel = `${account.bankName} ···${last4(account.accountNumber)}`;
      }
    }
  } catch (error) {
    // The page renders its own database error. The shell still appears so the
    // message has a frame and the person can sign out.
    loadFailed = true;
    console.error("Could not load the app shell:", error);
  }

  // A verified cookie pointing at a missing user is a stale session. A failed
  // lookup is different: keep the shell so the page can explain the failure.
  if (!loadFailed && !userFound) redirect("/login");

  return (
    <AppShell userName={userName} accountLabel={accountLabel}>
      {children}
    </AppShell>
  );
}
