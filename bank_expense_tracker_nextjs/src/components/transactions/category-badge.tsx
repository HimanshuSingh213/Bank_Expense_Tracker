import { cn } from "@/lib/utils";

/**
 * Category colours. These were taken from the legacy app
 * (My Bank Expense Tracker/frontend/src/components/TransactionItem.jsx) and
 * only brightened where the figure would sit on the black background.
 *
 * This is the one sanctioned place in the product with colours beyond
 * money direction: a chip either shows a category, or it is not a chip.
 * Dark text colours (shown first in pairs below) were lifted but the hue
 * itself stays the same.
 */
const CATEGORY_COLORS: Record<string, string> = {
  Food: "text-[#00c951] bg-[#00c9511a] border border-[#00c95133]",
  Salary: "text-[#00c951] bg-[#00c9511a] border border-[#00c95133]",
  Travel: "text-[#ff6900] bg-[#ff69001a] border border-[#ff690033]",
  Shopping: "text-[#ad46ff] bg-[#ad46ff1a] border border-[#ad46ff33]",
  Bills: "text-[#2b7fff] bg-[#2b7fff1a] border border-[#2b7fff33]",
  Investments: "text-[#38bdf8] bg-[#38bdf81a] border border-[#38bdf833]",
  Cash: "text-[#f5b841] bg-[#f5b8411a] border border-[#f5b84133]",
  "Fees & Charges": "text-[#f5b841] bg-[#f5b8411a] border border-[#f5b84133]",
  Transfer: "text-[#94a3b8] bg-[#4755691a] border border-[#47556933]",
  Others: "text-[#9ba3af] bg-[#6a72821a] border border-[#6a728233]",
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
