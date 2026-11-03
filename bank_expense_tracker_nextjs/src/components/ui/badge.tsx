import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type BadgeTone = "neutral" | "credit" | "debit" | "warning" | "info";

const tones: Record<BadgeTone, string> = {
  neutral: "bg-surface-2 text-fg-2",
  credit: "bg-credit-surface text-credit",
  debit: "bg-debit-surface text-debit",
  warning: "bg-warning-surface text-warning",
  info: "bg-surface-2 text-fg",
};

export function Badge({
  tone = "neutral",
  dot = false,
  className,
  children,
}: {
  tone?: BadgeTone;
  dot?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-[2px] px-1.5 py-0.5 font-mono text-[10.5px] leading-4 font-medium tracking-[0.04em] whitespace-nowrap",
        tones[tone],
        className,
      )}
    >
      {dot ? (
        <span aria-hidden="true" className="h-1 w-1 rounded-full bg-current" />
      ) : null}
      {children}
    </span>
  );
}
