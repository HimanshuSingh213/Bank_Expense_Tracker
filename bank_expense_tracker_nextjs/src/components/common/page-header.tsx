import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Every page starts here: a title, one mono meta line, at most one primary
 * action. The rule underneath is structural, not a card outline.
 */
export function PageHeader({
  title,
  meta,
  description,
  action,
  className,
}: {
  title: string;
  meta?: ReactNode;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("mb-8 border-b border-line pb-6", className)}>
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-4">
        <div className="min-w-0">
          <h1 className="text-[26px] leading-tight font-semibold tracking-[-0.02em] text-fg sm:text-[30px]">
            {title}
          </h1>
          {meta ? (
            <p className="figure mt-2.5 text-[10.5px] tracking-[0.1em] text-fg-3 uppercase">
              {meta}
            </p>
          ) : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>

      {description ? (
        <p className="mt-4 max-w-[72ch] text-[13px] leading-6 text-fg-2">
          {description}
        </p>
      ) : null}
    </header>
  );
}
