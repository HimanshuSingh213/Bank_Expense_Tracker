import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SetupForm } from "@/components/auth/setup-form";
import { Wordmark } from "@/components/common/logo";
import { ErrorState } from "@/components/ui/error-state";
import { setupNeeded } from "@/lib/data/users";
import { getSession } from "@/lib/auth/session";
import { publicErrorMessage } from "@/lib/errors";

export const metadata: Metadata = {
  title: "Create account",
  robots: {
    index: false,
    follow: false,
  },
};

/**
 * One-time setup. This is the only screen that can create the owner, and only
 * while no account owns a password.
 */
export default async function SetupPage() {
  const session = await getSession();
  if (session) redirect("/dashboard");

  let needsSetup: boolean;

  try {
    needsSetup = await setupNeeded();
  } catch (error) {
    return (
      <main id="main" className="flex min-h-dvh items-center justify-center px-5 py-16">
        <div className="w-full max-w-[420px]">
          <ErrorState
            title="The database could not be reached"
            reason={publicErrorMessage(error)}
          />
        </div>
      </main>
    );
  }

  if (!needsSetup) redirect("/login");

  return (
    <main id="main" className="grid min-h-dvh lg:grid-cols-[1fr_1fr]">
      <section className="hidden flex-col justify-between border-r border-line bg-surface p-12 lg:flex">
        <div>
          <Wordmark />
          <p className="mt-1.5 pl-7 font-mono text-[10px] tracking-[0.12em] text-fg-3 uppercase">
            SBI · Personal statement
          </p>
        </div>

        <div>
          <p className="label text-fg-3">One-time setup</p>
          <h1 className="mt-6 max-w-[16ch] text-[40px] leading-[1.05] font-semibold tracking-[-0.035em] text-fg">
            Give this ledger its owner.
          </h1>
          <p className="mt-6 max-w-[46ch] text-[13.5px] leading-6 text-fg-2">
            The password is bcrypt-hashed on the server and stored on the
            existing user document. Nothing is renamed, moved or rewritten.
          </p>
        </div>

        <p className="font-mono text-[10.5px] leading-5 tracking-[0.04em] text-fg-3">
          SETUP RUNS EXACTLY ONCE · LATER VISITS USE SIGN IN
        </p>
      </section>

      <section className="flex items-center justify-center px-5 py-14 sm:px-10">
        <div className="w-full max-w-[360px]">
          <div className="lg:hidden">
            <Wordmark />
          </div>

          <h2 className="mt-10 text-[26px] leading-tight font-semibold tracking-[-0.02em] text-fg lg:mt-0">
            Create account
          </h2>
          <p className="mt-2 text-[13px] leading-6 text-fg-2">
            Name the owner and set one password. You will be signed in straight
            after.
          </p>

          <SetupForm />
        </div>
      </section>
    </main>
  );
}
