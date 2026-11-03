import { cn } from "@/lib/utils";

/**
 * The mark: a white rule block with black ledger lines. Pure geometry, no
 * colour, no serif — it is the product drawn as a statement page.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      aria-hidden="true"
      className={cn("h-5 w-5 shrink-0", className)}
    >
      <rect width="20" height="20" fill="var(--fg)" />
      {/* Ledger rules on the page */}
      <path d="M4.5 6.75h11" stroke="var(--fg-inverse)" strokeWidth="1.5" />
      <path d="M4.5 10h7" stroke="var(--fg-inverse)" strokeWidth="1.5" />
      <path d="M4.5 13.25h9" stroke="var(--fg-inverse)" strokeWidth="1.5" />
      {/* A figure column swings free of the rules */}
      <path d="M14.75 8.5v6.25" stroke="var(--fg-inverse)" strokeWidth="1.5" />
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-baseline gap-2.5", className)}>
      <LogoMark className="translate-y-[2px]" />
      <span className="font-mono text-[11px] font-semibold tracking-[0.3em] text-fg">
        LEDGER
      </span>
    </span>
  );
}
