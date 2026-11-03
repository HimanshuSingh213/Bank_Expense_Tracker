import { addDays, fromISODate } from "@/lib/dates";
import {
  CATEGORIES,
  type Direction,
  type TransactionCategory,
  type TransactionFilters,
} from "@/types/transaction";

/**
 * URL query state for /transactions.
 *
 * Filters live in the URL so a filtered view is linkable, bookmarkable and
 * survives refresh. Nothing here trusts the input: unknown categories and
 * impossible dates are ignored rather than passed to the database.
 */

export const PAGE_SIZE = 20;
const MAX_QUERY_LENGTH = 80;

export type TransactionSearch = {
  q: string;
  category: "" | TransactionCategory;
  direction: "" | Direction;
  reviewed: "" | "reviewed" | "unreviewed";
  from: string;
  to: string;
  page: number;
};

type RawParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

function isCategory(value: string): value is TransactionCategory {
  return (CATEGORIES as string[]).includes(value);
}

function isDirection(value: string): value is Direction {
  return value === "debit" || value === "credit";
}

/** A valid calendar date in `YYYY-MM-DD`, or an empty string. */
function dateOrEmpty(value: string): string {
  return fromISODate(value) ? value : "";
}

export function readTransactionSearch(params: RawParams): TransactionSearch {
  const category = first(params.category);
  const direction = first(params.direction);
  const reviewed = first(params.reviewed);

  const page = Number.parseInt(first(params.page), 10);

  return {
    q: first(params.q).trim().slice(0, MAX_QUERY_LENGTH),
    category: isCategory(category) ? category : "",
    direction: isDirection(direction) ? direction : "",
    reviewed:
      reviewed === "reviewed" || reviewed === "unreviewed" ? reviewed : "",
    from: dateOrEmpty(first(params.from)),
    to: dateOrEmpty(first(params.to)),
    page: Number.isFinite(page) && page > 0 ? page : 1,
  };
}

/**
 * Converts the URL state into database filters.
 * The end date is inclusive to the person using the form, so it becomes the
 * half-open bound "before the next day" for the query.
 */
export function toTransactionFilters(search: TransactionSearch): TransactionFilters {
  const from = search.from ? fromISODate(search.from) : null;
  const toDate = search.to ? fromISODate(search.to) : null;

  return {
    q: search.q || undefined,
    category: search.category || undefined,
    direction: search.direction || undefined,
    reviewed:
      search.reviewed === "reviewed"
        ? true
        : search.reviewed === "unreviewed"
          ? false
          : undefined,
    from: from ?? undefined,
    to: toDate ? addDays(toDate, 1) : undefined,
    page: search.page,
    limit: PAGE_SIZE,
  };
}

/** Builds a link that keeps every active filter and changes only the page. */
export function transactionHref(search: TransactionSearch, page: number): string {
  const params = new URLSearchParams();

  if (search.q) params.set("q", search.q);
  if (search.category) params.set("category", search.category);
  if (search.direction) params.set("direction", search.direction);
  if (search.reviewed) params.set("reviewed", search.reviewed);
  if (search.from) params.set("from", search.from);
  if (search.to) params.set("to", search.to);
  if (page > 1) params.set("page", String(page));

  const query = params.toString();
  return query ? `/transactions?${query}` : "/transactions";
}

/** The same idea for the analytics date range. */
export function analyticsHref(from: string, to: string): string {
  const params = new URLSearchParams();
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  const query = params.toString();
  return query ? `/analytics?${query}` : "/analytics";
}
