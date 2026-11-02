export type AnchorSource = "statement" | "manual" | "opening";

export type BalanceAnchorDto = {
  balancePaise: number;
  asOfDate: string;
  source: AnchorSource;
  note: string | null;
};

export type AccountDto = {
  id: string;
  bankName: string;
  accountType: string;
  /** Last four digits only. The full number is never stored or displayed. */
  accountNumberLast4: string;
  currency: "INR";
  /** Cached projection of the anchored-ledger formula. */
  currentBalancePaise: number;
  anchor: BalanceAnchorDto | null;
  lastSyncedAt: string | null;
};
