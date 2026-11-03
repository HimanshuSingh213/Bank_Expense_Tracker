import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Panel({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return <div className={cn("panel", className)}>{children}</div>;
}

export function PanelHeader({
  title,
  meta,
  action,
  className,
}: {
  title: ReactNode;
  meta?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-start justify-between gap-4 border-b border-line px-5 py-3.5",
        className,
      )}
    >
      <div className="min-w-0">
        <div className="text-[13px] leading-5 font-medium text-fg">{title}</div>
        {meta ? (
          <div className="mt-0.5 font-mono text-[10.5px] tracking-[0.06em] text-fg-3">
            {meta}
          </div>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
