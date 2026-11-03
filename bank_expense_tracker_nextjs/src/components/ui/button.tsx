import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

const base =
  "inline-flex shrink-0 select-none items-center justify-center gap-2 rounded-[2px] font-medium whitespace-nowrap transition-[background-color,border-color,color] duration-100 disabled:pointer-events-none";

const variants: Record<ButtonVariant, string> = {
  /* The only filled control in the product: white on black. */
  primary:
    "bg-fg text-fg-inverse hover:bg-fg-2 disabled:bg-surface-2 disabled:text-line-control",
  secondary:
    "border border-line-control text-fg hover:border-fg hover:bg-surface-2 disabled:border-line disabled:text-line-control",
  ghost:
    "text-fg-3 hover:bg-surface-2 hover:text-fg disabled:text-line-control",
  danger:
    "border border-debit-border text-debit hover:border-debit hover:bg-debit-surface disabled:border-line disabled:text-line-control",
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-8 px-2.5 text-[12px]",
  md: "h-9 px-3.5 text-[13px]",
  lg: "h-10 px-4 text-[13.5px]",
};

/** Shared so a link can look like a button without becoming one. */
export function buttonClass(
  variant: ButtonVariant = "secondary",
  size: ButtonSize = "md",
  className?: string,
): string {
  return cn(base, variants[variant], sizes[size], className);
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: ReactNode;
}

export function Button({
  variant = "secondary",
  size = "md",
  className,
  type = "button",
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={buttonClass(variant, size, className)}
      {...props}
    >
      {children}
    </button>
  );
}
