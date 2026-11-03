"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { LogoutButton } from "@/components/common/logout-button";
import { Wordmark } from "@/components/common/logo";
import {
  AnalyticsIcon,
  ImportIcon,
  OverviewIcon,
  SettingsIcon,
  TransactionsIcon,
} from "@/components/ui/icons";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard", label: "Overview", Icon: OverviewIcon },
  { href: "/transactions", label: "Transactions", Icon: TransactionsIcon },
  { href: "/imports", label: "Imports", Icon: ImportIcon },
  { href: "/analytics", label: "Analytics", Icon: AnalyticsIcon },
  { href: "/settings", label: "Settings", Icon: SettingsIcon },
];

function useActiveHref(): string {
  const pathname = usePathname();

  const match = NAV.find(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
  );

  return match?.href ?? "";
}

/**
 * The shell: a 212px rail on desktop, a horizontal bar on smaller screens.
 *
 * The only decoration is the active rule — a 2px white mark. There is no
 * accent colour, because colour in this product means money direction.
 */
export function AppShell({
  children,
  accountLabel,
  userName,
}: {
  children: ReactNode;
  accountLabel: string | null;
  userName: string;
}) {
  const activeHref = useActiveHref();

  return (
    <div className="flex min-h-dvh flex-col lg:flex-row">
      <aside className="hidden w-[212px] shrink-0 flex-col border-r border-line bg-surface lg:sticky lg:top-0 lg:flex lg:h-dvh lg:overflow-y-auto">
        <Link
          href="/dashboard"
          className="block px-5 pt-6 pb-5 focus-visible:outline-offset-[-2px]"
        >
          <Wordmark />
          <span className="mt-1.5 block pl-7 font-mono text-[10px] tracking-[0.12em] text-fg-3 uppercase">
            SBI · Personal
          </span>
        </Link>

        <nav aria-label="Primary" className="flex-1 px-2.5">
          <ul className="space-y-0.5">
            {NAV.map(({ href, label, Icon }) => {
              const active = href === activeHref;

              return (
                <li key={href}>
                  <Link
                    href={href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "relative flex h-9 items-center gap-2.5 rounded-[2px] px-2.5 text-[13px] transition-colors",
                      active
                        ? "bg-surface-2 text-fg"
                        : "text-fg-3 hover:bg-surface-2 hover:text-fg",
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        "absolute top-1/2 left-0 h-4 w-[2px] -translate-y-1/2",
                        active ? "bg-fg" : "bg-transparent",
                      )}
                    />
                    <Icon className="h-4 w-4 shrink-0" />
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="border-t border-line px-5 py-4">
          <p className="label text-fg-3">Signed in</p>
          <p className="mt-2 truncate text-[12.5px] text-fg-2">{userName}</p>
          {accountLabel ? (
            <p className="figure mt-1 text-[10.5px] text-fg-3">{accountLabel}</p>
          ) : null}
          <LogoutButton className="mt-3 -ml-2" />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 border-b border-line bg-bg lg:hidden">
          <div className="flex items-center justify-between px-5 pt-3 pb-1">
            <Link href="/dashboard" className="flex items-baseline gap-2">
              <Wordmark className="[&_span:last-child]:text-[10.5px]" />
              <span className="font-mono text-[9.5px] tracking-[0.1em] text-fg-3 uppercase">
                SBI
              </span>
            </Link>
            <LogoutButton />
          </div>

          <nav aria-label="Primary" className="overflow-x-auto px-2">
            <ul className="flex">
              {NAV.map(({ href, label }) => {
                const active = href === activeHref;

                return (
                  <li key={href} className="shrink-0">
                    <Link
                      href={href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "block border-b-2 px-3 py-2.5 font-mono text-[10.5px] tracking-[0.08em] uppercase",
                        active
                          ? "border-fg text-fg"
                          : "border-transparent text-fg-3 hover:text-fg-2",
                      )}
                    >
                      {label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </header>

        <main id="main" className="min-w-0 flex-1">
          <div className="mx-auto w-full max-w-[1180px] px-5 py-8 sm:px-8 lg:px-10 lg:py-12">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
