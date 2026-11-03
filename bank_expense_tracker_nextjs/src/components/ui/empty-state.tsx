import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center px-6 py-12 text-center",
        className,
      )}
    >
      {icon ? (
        <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-[2px] bg-surface-2 text-fg-2">
          {icon}
        </div>
      ) : null}
      <h3 className="text-[14px] font-medium text-fg">{title}</h3>
      <p className="mt-1.5 max-w-[42ch] text-[12.5px] leading-5 text-fg-3">
        {description}
      </p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
