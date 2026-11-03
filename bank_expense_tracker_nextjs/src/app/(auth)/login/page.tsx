import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/login-form";
import { Wordmark } from "@/components/common/logo";
import { ErrorState } from "@/components/ui/error-state";
import { getSession } from "@/lib/auth/session";
import { setupNeeded } from "@/lib/data/users";
import { publicErrorMessage } from "@/lib/errors";

export const metadata: Metadata = {
  title: "Sign in",
};

/** Only allow a same-site path, so `?next=` cannot become an open redirect. */
function safeNext(value: string | string[] | undefined): string {
  const candidate = Array.isArray(value) ? value[0] : value;

  if (
    !candidate ||
    !candidate.startsWith("/") ||
    candidate.startsWith("//") ||
    candidate.startsWith("/login")
  ) {
    return "/dashboard";
  }

  return candidate;
}

export default async function LoginPage(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const searchParams = await props.searchParams;
  const next = safeNext(searchParams.next);

  const session = await getSession();
  if (session) redirect("/dashboard");

  let needsSetup: boolean;
  let dbFailure: string | null = null;

  try {
    needsSetup = await setupNeeded();
  } catch (error) {
    // Login answers a database question, so an unreachable database must be
    // named here instead of pretending the password was wrong.
    needsSetup = false;
    dbFailure = publicErrorMessage(error);
  }

  if (needsSetup) redirect("/setup");

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
          <p className="label text-fg-3">A statement, not a dashboard</p>
          <h1 className="mt-6 max-w-[16ch] text-[40px] leading-[1.05] font-semibold tracking-[-0.035em] text-fg">
            Every debit, every credit, accounted for.
          </h1>
          <p className="mt-6 max-w-[46ch] text-[13.5px] leading-6 text-fg-2">
            Import a State Bank of India statement, review each row before it is
            saved, and keep one balance that never drifts.
          </p>
        </div>

        <dl className="grid max-w-[440px] grid-cols-2 gap-px overflow-hidden bg-line">
          <div className="bg-surface px-4 py-3">
            <dt className="label text-fg-3">Figures</dt>
            <dd className="figure mt-2 text-[11.5px] text-fg">
              Integer paise
            </dd>
          </div>
          <div className="bg-surface px-4 py-3">
            <dt className="label text-fg-3">Balance</dt>
            <dd className="figure mt-2 text-[11.5px] text-fg">
              Anchored ledger
            </dd>
          </div>
        </dl>
      </section>

      <section className="flex items-center justify-center px-5 py-14 sm:px-10">
        <div className="w-full max-w-[360px]">
          <div className="lg:hidden">
            <Wordmark />
          </div>

          {dbFailure ? (
            <>
              <h2 className="mt-10 text-[26px] leading-tight font-semibold tracking-[-0.02em] text-fg lg:mt-0">
                Sign in unavailable
              </h2>
              <ErrorState
                title="The account database could not be reached"
                reason={dbFailure}
                className="mt-5"
              />
            </>
          ) : (
            <>
              <h2 className="mt-10 text-[26px] leading-tight font-semibold tracking-[-0.02em] text-fg lg:mt-0">
                Sign in
              </h2>
              <p className="mt-2 text-[13px] leading-6 text-fg-2">
                Enter the password you set when you created this account.
              </p>

              <LoginForm next={next} />
            </>
          )}
        </div>
      </section>
    </main>
  );
}
