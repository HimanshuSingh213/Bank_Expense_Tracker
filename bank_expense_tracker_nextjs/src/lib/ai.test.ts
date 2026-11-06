import { describe, expect, it } from "vitest";
import { categorySuggestionSchema } from "@/lib/ai";
import { categorizeWithConfidence } from "@/helpers/statement-parser/table-parser";

/**
 * The model itself is never called in tests — the boundary being tested is
 * that model output is validated before the product reads it, and
 * that the keyword rules flag exactly the rows the AI tier may suggest for.
 */

describe("categorySuggestionSchema (model output is untrusted)", () => {
  it("accepts a real category with a probability", () => {
    expect(
      categorySuggestionSchema.safeParse({ category: "Travel", confidence: 0.87 }).success,
    ).toBe(true);
  });

  it("rejects a category that is not in the product", () => {
    // The model may hallucinate a label — it must not survive validation.
    expect(
      categorySuggestionSchema.safeParse({ category: "Crypto", confidence: 0.99 }).success,
    ).toBe(false);
    expect(
      categorySuggestionSchema.safeParse({ category: "UPI/DR/X", confidence: 0.5 }).success,
    ).toBe(false);
  });

  it("rejects impossible confidences", () => {
    expect(
      categorySuggestionSchema.safeParse({ category: "Food", confidence: 1.4 }).success,
    ).toBe(false);
    expect(
      categorySuggestionSchema.safeParse({ category: "Food", confidence: -0.1 }).success,
    ).toBe(false);
  });
});

describe("categorizeWithConfidence (which rows reach the model)", () => {
  it("marks keyword-ruled rows as confident", () => {
    expect(categorizeWithConfidence("Swiggy", "UPI/SWIGGY")).toEqual({
      category: "Food",
      confident: true,
    });
    expect(categorizeWithConfidence("Zerodha SIP", "")).toEqual({
      category: "Investments",
      confident: true,
    });
  });

  it("marks the fallback rows as unsure — these are the model's job", () => {
    expect(categorizeWithConfidence("Unknown vendor", "random turnover")).toEqual({
      category: "Bills",
      confident: false,
    });
    expect(categorizeWithConfidence("UPI/DR/412345678901/JANE DOE")).toEqual({
      category: "Bills",
      confident: false,
    });
  });
});
