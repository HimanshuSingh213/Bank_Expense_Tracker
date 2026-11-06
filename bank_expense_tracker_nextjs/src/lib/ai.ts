import { z } from "zod";
import { CATEGORIES, type TransactionCategory } from "@/types/transaction";

/** Sanity ceiling — embeddings cost ~2 ms a row, but no process classifies all day. */
export const AI_MAX_ROWS_PER_PREVIEW = 500;

export const CATEGORY_SUGGEST_DISABLE =
  process.env.AI_CATEGORY_SUGGESTIONS?.toLowerCase() === "off";

/** What the product accepts as a suggestion. */
export const categorySuggestionSchema = z.object({
  category: z.enum(CATEGORIES as unknown as [string, ...string[]]),
  confidence: z.number().min(0).max(1),
});

export type SuggestedRow = {
  index: number;
  suggestion: {
    category: TransactionCategory;
    confidence: number;
    engine: "transformers";
  };
};

export type CategoryProviderInput = {
  narration: string;
  categories: readonly TransactionCategory[];
};

export type CategoryProviderResult =
  | {
      category: TransactionCategory;
      confidence: number;
      engine: "transformers";
    }
  | null;

// ---------------------------------------------------------------------------
// Tier 1 — MiniLM embeddings vs category centroids
// ---------------------------------------------------------------------------

const MODEL_ID = "Xenova/all-MiniLM-L6-v2";

export const CONFIDENCE_MIN = 0.35;

const SEED_PHRASES: Partial<Record<TransactionCategory, string[]>> = {
  Food: ["food", "restaurant", "grocery", "swiggy", "zomato", "dominos", "cafe", "biryani", "lunch dinner snack", "sweet shop"],
  Travel: ["travel", "transport", "uber ride", "ola cabs", "fuel", "petrol diesel", "metro card", "irctc railway", "bus ticket", "indigo airlines parking toll"],
  Shopping: ["shopping", "online shop", "amazon", "flipkart", "myntra", "retail store clothing", "supermarket dmart", "electronics store", "trends clothing", "pvr inox movie tickets", "cinema film theatre entertainment show"],
  Bills: ["bill", "utility", "electricity", "water", "gas", "mobile recharge jio airtel", "broadband", "rent", "insurance premium", "loan emi", "maintenance society"],
  Investments: ["invest", "zerodha broking", "groww", "mutual fund sip", "shares equity", "provident fund ppf", "fixed deposit rd installments", "dividend"],
  Salary: ["salary", "monthly pay credit", "employer pay", "stipend"],
  Transfer: ["own account transfer", "movements between accounts"],
  Cash: ["atm cash withdrawal machine", "cash deposit cdm branch", "atm wdl"],
  "Fees & Charges": ["bank charges", "sms charges", "card fee", "penalty charge", "govt charges", "portal charges"],
  Interest: ["interest credit", "fd interest", "savings interest"],
};

const ABBREVIATIONS: Array<[RegExp, string]> = [
  [/\b(atm\s*wdl|cash\s*wdl)\b/g, "cash withdrawal"],
  [/\b(dep|depst)\b/g, "deposit"],
  [/\b(wdl\s*tfr|tfr\s*wdl|tfr)\b/g, ""],
  [/\b(wdl|wthr)\b/g, ""],
  [/\b(chg|chrg|invp)\b/g, "charge"],
  [/\b(chrgs)\b/g, "charges"],
  [/\b(sal)\b/g, "salary"],
  [/\b(pos)\b/g, "card purchase at"],
  [/\b(ecom)\b/g, "online card purchase at"],
  [/\b(neft|imps|mmid)\b/g, "bank transfer"],
  [/\b(upi|p2a|p2p|inb|dr|cr)\b/g, ""],
];

type EmbedFn = (
  text: string,
  options?: { pooling: "mean"; normalize: boolean },
) => Promise<{ data: Float32Array }>;

let embedMemo: Promise<EmbedFn> | null = null;
let centroidsMemo: Promise<Array<[TransactionCategory, Float32Array]>> | null = null;

function getEmbedded(): Promise<EmbedFn> {
  if (!embedMemo) {
    embedMemo = (async () => {
      const { pipeline } = await import("@huggingface/transformers");
      const extractor = await pipeline("feature-extraction", MODEL_ID, {
        dtype: "q8",
      });
      return ((text: string, options?: { pooling: "mean"; normalize: boolean }) =>
        extractor(text, options)) as unknown as EmbedFn;
    })();
    embedMemo.catch(() => {
      embedMemo = null;
    });
  }
  return embedMemo;
}

function meanNormalized(vectors: Float32Array[]): Float32Array {
  const dim = vectors[0].length;
  const mean = new Float32Array(dim);
  for (const vector of vectors) {
    for (let i = 0; i < dim; i++) mean[i] += vector[i];
  }
  let norm = 0;
  for (let i = 0; i < dim; i++) norm += mean[i] * mean[i];
  norm = Math.sqrt(norm) || 1;
  for (let i = 0; i < dim; i++) mean[i] /= norm;
  return mean;
}

function getCentroids(): Promise<Array<[TransactionCategory, Float32Array]>> {
  if (!centroidsMemo) {
    centroidsMemo = (async () => {
      const embed = await getEmbedded();
      const centres: Array<[TransactionCategory, Float32Array]> = [];
      for (const [category, phrases] of Object.entries(SEED_PHRASES)) {
        const vectors: Float32Array[] = [];
        for (const phrase of phrases) {
          const output = await embed(phrase, { pooling: "mean", normalize: true });
          vectors.push(new Float32Array(output.data));
        }
        centres.push([category as TransactionCategory, meanNormalized(vectors)]);
      }
      return centres;
    })();
    centroidsMemo.catch(() => {
      centroidsMemo = null;
    });
  }
  return centroidsMemo;
}

function cleanNarration(narration: string): string {
  let text = ` ${narration.toLowerCase().slice(0, 200)} `;
  text = text.replace(/[\/:;|_-]/g, " ").replace(/\d{4,}/g, " ");
  for (const [pattern, replacement] of ABBREVIATIONS) {
    text = text.replace(pattern, ` ${replacement} `);
  }
  return text.replace(/\s+/g, " ").trim();
}

export function transformersEnabled(): boolean {
  return !CATEGORY_SUGGEST_DISABLE;
}

export async function categoryViaTransformers(
  input: CategoryProviderInput,
): Promise<CategoryProviderResult> {
  if (!transformersEnabled()) return null;

  const narration = cleanNarration(input.narration);
  if (narration.length < 4) return null;

  const [centroids, embed] = await Promise.all([getCentroids(), getEmbedded()]);
  const output = await embed(narration, { pooling: "mean", normalize: true });
  const vector = new Float32Array(output.data);

  let bestCategory: TransactionCategory | null = null;
  let bestScore = -2;
  for (const [category, centre] of centroids) {
    if (!input.categories.includes(category)) continue;

    let score = 0;
    for (let i = 0; i < centre.length; i++) score += centre[i] * vector[i];

    if (score > bestScore) {
      bestScore = score;
      bestCategory = category;
    }
  }

  if (!bestCategory || bestScore < CONFIDENCE_MIN) return null;

  return {
    category: bestCategory,
    confidence: Math.min(1, bestScore),
    engine: "transformers",
  };
}

// ---------------------------------------------------------------------------
// Category suggestions (Tier 1 offline embedded model)
// ---------------------------------------------------------------------------

let engineBroken = false;

export async function suggestCategories(
  narrations: string[],
): Promise<SuggestedRow[]> {
  if (CATEGORY_SUGGEST_DISABLE || engineBroken || !transformersEnabled()) {
    return [];
  }

  const results: SuggestedRow[] = [];

  for (let index = 0; index < narrations.length; index++) {
    try {
      const candidate = await categoryViaTransformers({
        narration: narrations[index],
        categories: CATEGORIES,
      });

      if (!candidate) continue;

      const validated = categorySuggestionSchema.safeParse(candidate);
      if (!validated.success) continue;

      results.push({
        index,
        suggestion: {
          category: validated.data.category as TransactionCategory,
          confidence: validated.data.confidence,
          engine: "transformers",
        },
      });

      if (results.length >= AI_MAX_ROWS_PER_PREVIEW) break;
    } catch (error) {
      console.error(
        "AI category suggestions stopped early:",
        error instanceof Error ? error.message : error,
      );
      engineBroken = true;
      break;
    }
  }

  return results;
}
