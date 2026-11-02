export type Direction = "debit" | "credit";

export type TransactionCategory =
  | "Food"
  | "Travel"
  | "Shopping"
  | "Bills"
  | "Investments"
  | "Salary"
  | "Transfer"
  | "Cash"
  | "Fees & Charges"
  | "Interest"
  | "Others";

export const CATEGORIES: TransactionCategory[] = [
  "Food",
  "Travel",
  "Shopping",
  "Bills",
  "Investments",
  "Salary",
  "Transfer",
  "Cash",
  "Fees & Charges",
  "Interest",
  "Others",
];

export type TransactionSource = "manual" | "statement-import";

/** What the API and pages hand to the browser. Never a raw Mongoose document. */
export type TransactionDto = {
  id: string;
  txnDate: string | null;
  valueDate: string | null;
  title: string;
  narration: string;
  referenceNumber: string | null;
  category: TransactionCategory;
  direction: Direction;
  amountPaise: number;
  balanceAfterPaise: number | null;
  reviewed: boolean;
  reviewedAt: string | null;
  source: TransactionSource;
  importId: string | null;
  importRowNumber: number | null;
};

export type TransactionListResult = {
  items: TransactionDto[];
  page: number;
  limit: number;
  total: number;
  totals: { creditPaise: number; debitPaise: number; netPaise: number };
};

export type TransactionFilters = {
  q?: string;
  from?: Date;
  to?: Date;
  category?: TransactionCategory;
  direction?: Direction;
  reviewed?: boolean;
  page: number;
  limit: number;
};
