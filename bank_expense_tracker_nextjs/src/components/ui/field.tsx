import type { ComponentPropsWithRef, ReactNode } from "react";
import { ChevronDownIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

const control =
  "w-full rounded-[2px] border border-line-control bg-surface-2 px-3 text-[13px] text-fg transition-[background-color,border-color,color] placeholder:text-fg-3 hover:border-fg-2 focus:border-fg aria-[invalid=true]:border-debit aria-[invalid=true]:hover:border-debit";

export function Field({
  label,
  htmlFor,
  hint,
  error,
  children,
  className,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  error?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <label
        htmlFor={htmlFor}
        className="label mb-2 block text-fg-3"
      >
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${htmlFor}-error`} className="mt-1.5 text-[12px] text-debit">
          {error}
        </p>
      ) : hint ? (
        <p id={`${htmlFor}-hint`} className="mt-1.5 text-[12px] text-fg-3">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function Input({
  className,
  ...props
}: ComponentPropsWithRef<"input">) {
  return <input className={cn(control, "h-9", className)} {...props} />;
}

export function Select({
  className,
  children,
  ...props
}: ComponentPropsWithRef<"select">) {
  return (
    <div className="relative">
      <select
        className={cn(control, "h-9 appearance-none pr-9", className)}
        {...props}
      >
        {children}
      </select>
      <ChevronDownIcon className="pointer-events-none absolute top-1/2 right-3 h-3.5 w-3.5 -translate-y-1/2 text-fg-3" />
    </div>
  );
}

export function Checkbox({
  className,
  ...props
}: ComponentPropsWithRef<"input">) {
  return <input type="checkbox" className={cn("check", className)} {...props} />;
}
