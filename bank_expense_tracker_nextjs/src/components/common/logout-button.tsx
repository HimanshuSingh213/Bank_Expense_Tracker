"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";

/**
 * Signing out clears the httpOnly cookie on the server, then navigates with a
 * refresh so no cached server component keeps showing the previous session.
 */
export function LogoutButton({ className }: { className?: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function signOut() {
    setPending(true);

    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      router.replace("/login");
      router.refresh();
    }
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={signOut}
      disabled={pending}
      aria-busy={pending}
      className={className}
    >
      {pending ? "Signing out…" : "Sign out"}
    </Button>
  );
}
