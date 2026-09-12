// statementCore.js
// Server-side duplicate detection for transaction imports.
// Mirrors the frontend's isDuplicateTransaction heuristics (frontend/src/utils/statementParser.js)
// so bulk CSV imports and any future ingestion can't double-insert.

import crypto from 'crypto';

export function normalizeDateKey(rawDate) {
  if (!rawDate) return '';
  const d = new Date(rawDate);
  if (isNaN(d.getTime())) return String(rawDate).slice(0, 10);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function extractReferenceNumber(desc = '') {
  if (!desc || typeof desc !== 'string') return null;
  const s = desc.trim();

  // 1. UPI / IMPS Reference Number (e.g. UPI/DR/423871928374 or UPI/423871928374/Payment)
  const upiMatch = s.match(/(?:UPI|IMPS)\/(?:DR|CR|P2A|P2P|NET)?\/([0-9]{10,16})/i) ||
                   s.match(/(?:UPI|IMPS)\/([0-9]{10,16})/i) ||
                   s.match(/\b(UPI\d{10,16})\b/i);
  if (upiMatch) return upiMatch[1].toUpperCase();

  // 2. NEFT / RTGS UTR (e.g. NEFT/UTIB123456789 or UTR: N123456789012)
  const neftMatch = s.match(/(?:NEFT|RTGS)[\s/\-_:]+(?:CR|DR)?[\s/\-_:]*([a-zA-Z0-9]{12,22})/i);
  if (neftMatch) return neftMatch[1].toUpperCase();

  // 3. Explicit RRN / UTR / Cheque keywords
  const kwMatch = s.match(/(?:RRN|UTR)[\s/:\-_#]+([a-zA-Z0-9]{10,20})/i);
  if (kwMatch) return kwMatch[1].toUpperCase();

  const chqMatch = s.match(/(?:Chq(?:\s*No)?|Cheque(?:\s*No)?)[\s/:\-_#]+(\d{6})/i);
  if (chqMatch) return `CHQ:${chqMatch[1]}`;

  return null;
}

export function isDuplicateTransaction(candidate, existing) {
  const candAmt = Number(candidate.amount || 0);
  const existAmt = Number(existing.amount || 0);
  if (Math.abs(candAmt - existAmt) >= 0.01) return false;

  const candType = Boolean(candidate.isExpense);
  const existType = Boolean(existing.isExpense);
  if (candType !== existType) return false;

  const candRef = extractReferenceNumber(candidate.description || candidate.title || '');
  const existRef = extractReferenceNumber(existing.description || existing.title || '');

  // 1. If both have an exact matching genuine reference (UPI RRN / UTR / Cheque)
  if (candRef && existRef) {
    if (candRef === existRef) return true;
    return false;
  }

  // 2. Different dates are NEVER duplicates
  const candDate = normalizeDateKey(candidate.date);
  const existDate = normalizeDateKey(existing.date || existing.createdAt);
  if (candDate && existDate && candDate !== existDate) {
    return false;
  }

  // 3. Same date: check running account balance
  const candBal = candidate.balance !== undefined && !isNaN(Number(candidate.balance)) ? Number(candidate.balance) : null;
  const existBal = existing.balance !== undefined && !isNaN(Number(existing.balance)) ? Number(existing.balance) : null;

  if (candBal !== null && existBal !== null) {
    if (Math.abs(candBal - existBal) < 0.01) return true;
    return false;
  }

  // 4. Exact raw description + same date + same amount
  const candDesc = String(candidate.description || candidate.title || '').trim().toLowerCase();
  const existDesc = String(existing.description || existing.title || '').trim().toLowerCase();
  if (candDesc && existDesc && candDesc === existDesc) {
    return true;
  }

  return false;
}

export function fingerprintOf(txn) {
  const dateKey = normalizeDateKey(txn.date);
  const amountKey = Number(txn.amount || 0).toFixed(2);
  const ref = extractReferenceNumber(txn.description || txn.title || '');
  const desc = String(txn.description || txn.title || '').trim().toLowerCase();
  return crypto
    .createHash('md5')
    .update(`${dateKey}|${amountKey}|${ref || ''}|${desc}`)
    .digest('hex');
}

// Returns the first doc in `candidates` that `candidate` duplicates, or null.
export function findDuplicateIn(candidate, candidates) {
  for (const ex of candidates) {
    if (isDuplicateTransaction(candidate, ex)) return ex;
  }
  return null;
}
