import Link from "next/link";
import { buttonClass } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Pagination for server-rendered lists. Links, not buttons, so every page is
 * addressable and the back button behaves.
 */
export function Pagination({
  page,
  totalPages,
  hrefFor,
  className,
}: {
  page: number;
  totalPages: number;
  hrefFor: (page: number) => string;
  className?: string;
}) {
  if (totalPages <= 1) return null;

  const windowStart = Math.max(1, Math.min(page - 2, totalPages - 4));
  const windowEnd = Math.min(totalPages, windowStart + 4);
  const pages = Array.from(
    { length: windowEnd - windowStart + 1 },
    (_, index) => windowStart + index,
  );

  return (
    <nav
      aria-label="Pagination"
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3",
        className,
      )}
    >
      <p className="figure text-[10.5px] tracking-[0.08em] text-fg-3 uppercase">
        Page {page} of {totalPages}
      </p>

      <div className="flex items-center gap-1">
        <PageLink
          href={hrefFor(page - 1)}
          disabled={page <= 1}
          label="Previous"
        />

        {pages.map((number) => (
          <Link
            key={number}
            href={hrefFor(number)}
            aria-current={number === page ? "page" : undefined}
            className={cn(
              "figure inline-flex h-8 min-w-8 items-center justify-center rounded-[2px] px-2 text-[12px]",
              number === page
                ? "bg-surface-2 text-fg ring-1 ring-line-strong ring-inset"
                : "text-fg-3 hover:bg-surface-2 hover:text-fg",
            )}
          >
            {number}
          </Link>
        ))}

        <PageLink
          href={hrefFor(page + 1)}
          disabled={page >= totalPages}
          label="Next"
        />
      </div>
    </nav>
  );
}

function PageLink({
  href,
  disabled,
  label,
}: {
  href: string;
  disabled: boolean;
  label: string;
}) {
  if (disabled) {
    return (
      <span
        aria-disabled="true"
        className={buttonClass(
          "secondary",
          "sm",
          "pointer-events-none border-line text-line-control",
        )}
      >
        {label}
      </span>
    );
  }

  return (
    <Link href={href} className={buttonClass("secondary", "sm")}>
      {label}
    </Link>
  );
}
