import type { ReactNode, ThHTMLAttributes, TdHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Table({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("w-full overflow-x-auto", className)}>
      <table className="w-full border-collapse text-[13px]">{children}</table>
    </div>
  );
}

export function Th({
  className,
  children,
  ...props
}: ThHTMLAttributes<HTMLTableCellElement> & { children?: ReactNode }) {
  return (
    <th
      scope="col"
      className={cn(
        "label border-b border-line px-4 py-2.5 text-left font-medium text-fg-3",
        className,
      )}
      {...props}
    >
      {children}
    </th>
  );
}

export function Td({
  className,
  children,
  ...props
}: TdHTMLAttributes<HTMLTableCellElement> & { children?: ReactNode }) {
  return (
    <td
      className={cn(
        "border-b border-line-soft px-4 py-2.5 align-middle text-fg-2",
        className,
      )}
      {...props}
    >
      {children}
    </td>
  );
}

export function Tr({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <tr className={cn("transition-colors hover:bg-surface-2/60", className)}>
      {children}
    </tr>
  );
}
