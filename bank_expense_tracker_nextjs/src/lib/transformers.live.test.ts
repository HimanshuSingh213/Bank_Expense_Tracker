import { describe, expect, it } from "vitest";
import { categoryViaTransformers, suggestCategories, transformersEnabled } from "@/lib/ai";

/**
 * The live engine check. Downloads the ~30 MB model on first run and then
 * uses the local cache, so it needs network only once per machine:
 *
 *   AI_LIVE=1 npx vitest run src/lib/ai/transformers.live.test.ts
 *
 * Skipped entirely without AI_LIVE=1, so the normal test run never
 * downloads or runs a model.
 */

const LIVE = process.env.AI_LIVE === "1";

describe.skipIf(!LIVE)("live embedding engine (AI_LIVE=1)", () => {
  it("names a cafe as Food through the full service path", async () => {
    expect(transformersEnabled()).toBe(true);

    const results = await suggestCategories([
      "UPI/DR/412345678901/ROWDY CAFE/HDFC",
      "ATM WDL MUMBAI 2026",
      "UPI/DR/602345678901/RAJESH KUMAR/HDFC",
    ]);

    const byIndex = new Map(results.map((row) => [row.index, row.suggestion]));
    expect(byIndex.get(0)?.category).toBe("Food");
    // Person names get no suggestion — the engine abstains below 0.35.
    expect(byIndex.get(2)).toBeUndefined();
  });

  it("abstains on narrations the model cannot read", async () => {
    const result = await categoryViaTransformers({
      narration: "",
      categories: ["Food", "Travel"],
    });
    expect(result).toBeNull();
  });
});
