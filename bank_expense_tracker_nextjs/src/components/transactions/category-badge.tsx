import { cn } from "@/lib/utils";

/**
 * Category colours — redesigned for high contrast on OLED black (#000000).
 * Each category gets a distinct hue with:
 *   - Text: bright, saturated (WCAG AA on black)
 *   - Background: 20% opacity for clear chip visibility
 *   - Border: 40% opacity for crisp edges
 * This is the ONE place in the product with non-money colours.
 */
const CATEGORY_COLORS: Record<string, string> = {
  // Green family — income/money in
  Food: "text-[#22ff88] bg-[#22ff8833] border border-[#22ff8866]",
  Salary: "text-[#00e676] bg-[#00e67633] border border-[#00e67666]",

  // Orange family — travel/transport
  Travel: "text-[#ff8822] bg-[#ff882233] border border-[#ff882266]",

  // Purple family — shopping/retail
  Shopping: "text-[#cc66ff] bg-[#cc66ff33] border border-[#cc66ff66]",

  // Blue family — bills/utilities
  Bills: "text-[#44aaff] bg-[#44aaff33] border border-[#44aaff66]",

  // Cyan family — investments/growth
  Investments: "text-[#22efff] bg-[#22efff33] border border-[#22efff66]",

  // Amber family — cash/fees
  Cash: "text-[#ffcc22] bg-[#ffcc2233] border border-[#ffcc2266]",
  "Fees & Charges": "text-[#ffaa00] bg-[#ffaa0033] border border-[#ffaa0066]",

  // Slate family — transfers/neutral
  Transfer: "text-[#94a3b8] bg-[#47556933] border border-[#47556966]",

  // Muted fallback
  Others: "text-[#a0aec0] bg-[#2d374833] border border-[#2d374866]",
};

export function CategoryBadge({
  category,
  className,
}: {
  category: string;
  className?: string;
}) {
  const color = CATEGORY_COLORS[category] ?? CATEGORY_COLORS.Others;

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-[2px] px-1.5 py-0.5 font-mono text-[10.5px] leading-4 font-medium tracking-[0.04em] whitespace-nowrap uppercase",
        color,
        className,
      )}
    >
      {category}
    </span>
  );
}
