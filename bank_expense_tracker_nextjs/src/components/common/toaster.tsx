"use client";

import { Toaster as Sonner } from "sonner";

/**
 * Sonner, themed to the design system: bottom-right, dark, 2px corners, one
 * hairline. No gradients, no coloured accents — the design law applies to
 * toasts like everything else.
 */
export function Toaster() {
  return (
    <Sonner
      position="bottom-right"
      theme="dark"
      offset={16}
      gap={10}
      toastOptions={{
        classNames: {
          toast:
            "rounded-[2px] border border-line bg-surface-2 text-fg font-sans text-[12.5px]",
          title: "text-fg",
          description: "text-fg-3 font-mono text-[11px]",
          actionButton:
            "rounded-[2px] border border-line-control bg-fg text-fg-inverse",
          cancelButton: "rounded-[2px] border border-line text-fg-3",
        },
      }}
    />
  );
}
