export type ImportStatus = "draft" | "committed" | "failed" | "discarded";

/** What the imports page and dashboard need to know about one import. */
export type ImportSummary = {
  id: string;
  status: ImportStatus;
  fileName: string;
  format: string;
  createdAt: string;
  periodFrom: string | null;
  periodTo: string | null;
  rowsParsed: number;
  inserted: number;
  skipped: number;
  invalid: number;
};
