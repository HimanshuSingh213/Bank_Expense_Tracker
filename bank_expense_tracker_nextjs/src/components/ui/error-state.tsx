import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function ErrorState({
  title = "Something went wrong",
  reason,
  action,
  className,
}: {
  title?: string;
  reason: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-start gap-2 px-5 py-6",
        "border-l-2 border-debit bg-debit-surface",
        className,
      )}
    >
      <p className="text-[13px] font-medium text-fg">{title}</p>
      <p className="max-w-[70ch] text-[12.5px] leading-5 text-fg-2">{reason}</p>
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
