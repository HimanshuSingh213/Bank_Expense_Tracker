import Papa from 'papaparse';
import * as XLSX from 'xlsx';

export const BANK_PRESETS = [
  {
    id: 'sbi',
    name: 'State Bank of India',
    shortName: 'SBI',
    badgeColor: 'text-sky-400 bg-sky-950/40 border-sky-800/60',
    accountType: 'Savings Account',
    dateFormats: ['DD/MM/YYYY', 'DD-MM-YYYY', 'DD-MMM-YYYY'],
    headers: ['Txn Date', 'Value Date', 'Description', 'Ref No./Cheque No.', 'Debit', 'Credit', 'Balance'],
    description: 'SBI Statement (CSV / Excel format from YONO / OnlineSBI)',
  },
  {
    id: 'hdfc',
    name: 'HDFC Bank',
    shortName: 'HDFC',
    badgeColor: 'text-blue-400 bg-blue-950/40 border-blue-800/60',
    accountType: 'Savings / Salary Account',
    dateFormats: ['DD/MM/YYYY', 'DD-MM-YYYY'],
    headers: ['Date', 'Narration', 'Chq/Ref Number', 'Value Dt', 'Withdrawal Amt.', 'Deposit Amt.', 'Closing Balance'],
    description: 'HDFC NetBanking Statement (CSV / Excel)',
  },
  {
    id: 'icici',
    name: 'ICICI Bank',
    shortName: 'ICICI',
    badgeColor: 'text-amber-400 bg-amber-950/40 border-amber-800/60',
    accountType: 'Savings Account',
    dateFormats: ['DD/MM/YYYY', 'YYYY-MM-DD'],
    headers: ['Transaction Date', 'Value Date', 'Description', 'Cheque No', 'Debit Amount', 'Credit Amount', 'Balance (INR)'],
    description: 'ICICI iMobile / Infinity Statement (CSV / Excel)',
  },
  {
    id: 'axis',
    name: 'Axis Bank',
    shortName: 'Axis',
    badgeColor: 'text-rose-400 bg-rose-950/40 border-rose-800/60',
    accountType: 'Savings Account',
    dateFormats: ['DD-MM-YYYY', 'DD/MM/YYYY'],
    headers: ['Tran Date', 'CHQNO', 'PARTICULARS', 'DR', 'CR', 'BAL'],
    description: 'Axis Bank Statement Export (CSV / Excel)',
  },
  {
    id: 'kotak',
    name: 'Kotak Mahindra Bank',
    shortName: 'Kotak',
    badgeColor: 'text-red-400 bg-red-950/40 border-red-800/60',
    accountType: 'Savings Account (811)',
    dateFormats: ['DD-MM-YYYY', 'DD/MM/YYYY'],
    headers: ['Sl. No.', 'Transaction Date', 'Value Date', 'Description', 'Chq / Ref No.', 'Amount', 'Dr / Cr', 'Balance'],
    description: 'Kotak NetBanking / 811 Export',
  },
  {
    id: 'paytm',
    name: 'Paytm Payments Bank',
    shortName: 'Paytm',
    badgeColor: 'text-cyan-400 bg-cyan-950/40 border-cyan-800/60',
    accountType: 'Wallet / Savings Account',
    dateFormats: ['DD/MM/YYYY', 'YYYY-MM-DD'],
    headers: ['Date', 'Time', 'Transaction Details', 'Amount', 'Debit/Credit', 'Balance'],
    description: 'Paytm Passbook Statement Export',
  },
  {
    id: 'phonepe',
    name: 'PhonePe Export',
    shortName: 'PhonePe',
    badgeColor: 'text-purple-400 bg-purple-950/40 border-purple-800/60',
    accountType: 'UPI Statement',
    dateFormats: ['DD-MM-YYYY', 'DD/MM/YYYY'],
    headers: ['Date', 'Transaction ID', 'Merchant/Sender', 'Type', 'Amount', 'Payment Method'],
    description: 'PhonePe Transaction History Statement',
  },
  {
    id: 'generic',
    name: 'Auto-Detect / Generic Bank',
    shortName: 'Generic',
    badgeColor: 'text-slate-300 bg-slate-900/60 border-slate-700/60',
    accountType: 'Bank Account',
    dateFormats: ['Any Standard Date'],
    headers: ['Date', 'Description/Narration', 'Debit/Withdrawal', 'Credit/Deposit', 'Balance'],
    description: 'Universal Smart Header Detection for any bank',
  },
];

const CATEGORY_RULES = [
  {
    category: 'Food',
    keywords: [
      'swiggy', 'zomato', 'blinkit', 'zepto', 'instamart', 'domino', 'pizza', 'mcdonald', 'burger',
      'kfc', 'starbucks', 'chai', 'coffee', 'cafe', 'restaurant', 'bakery', 'dhaba', 'barbeque',
      'haldiram', 'bikanervala', 'subway', 'faasos', 'eatfit', 'behrouz', 'sweet', 'food', 'kitchen',
      'dining', 'canteen', 'hotel food', 'caterer', 'baker'
    ]
  },
  {
    category: 'Travel',
    keywords: [
      'uber', 'ola', 'rapido', 'dmrc', 'delhi metro', 'metro', 'irctc', 'railway', 'makemytrip',
      'goibibo', 'yatra', 'indigo', 'air india', 'spicejet', 'akasa', 'vistara', 'fuel', 'petrol',
      'diesel', 'hpcl', 'bpcl', 'iocl', 'indian oil', 'bharat petroleum', 'hindustan petroleum',
      'shell', 'fastag', 'toll', 'parking', 'auto fare', 'cab fare', 'bus ticket', 'redbus', 'abhibus'
    ]
  },
  {
    category: 'Shopping',
    keywords: [
      'amazon', 'flipkart', 'myntra', 'ajio', 'meesho', 'nykaa', 'zara', 'h&m', 'decathlon',
      'tata cliq', 'croma', 'reliance digital', 'vijay sales', 'apple store', 'd-mart', 'dmart',
      'smart bazaar', 'spencer', 'supermarket', 'retail', 'clothing', 'apparel', 'fashion',
      'footwear', 'opticals', 'lenskart', 'electronics', 'shopping', 'mall', 'bazaar'
    ]
  },
  {
    category: 'Bills',
    keywords: [
      'airtel', 'jio', 'vodafone', 'vi prepaid', 'bsnl', 'recharge', 'bescom', 'tata power',
      'torrent', 'adani electricity', 'mseb', 'uppcl', 'electricity', 'water bill', 'piped gas',
      'igl', 'mgl', 'indane', 'hp gas', 'bharat gas', 'broadband', 'act fibernet', 'hathaway',
      'netflix', 'spotify', 'prime video', 'hotstar', 'youtube premium', 'apple.com/bill',
      'google play', 'gym', 'cult.fit', 'fitness', 'maintenance', 'society', 'rent', 'insurance',
      'lic', 'hdfc ergo', 'star health', 'credit card payment', 'billdesk', 'cred', 'loan emi'
    ]
  },
  {
    category: 'Investments',
    keywords: [
      'zerodha', 'groww', 'upstox', 'angel one', 'kuvera', 'coin', 'mutual fund', 'sip',
      'uti mf', 'sbi mf', 'hdfc mf', 'icici prudential', 'dividend', 'interest credit', 'fd interest'
    ]
  }
];

export function categorizeTransaction(partyName = '', description = '') {
  const combined = `${partyName} ${description}`.toLowerCase();
  for (const rule of CATEGORY_RULES) {
    if (rule.keywords.some((kw) => combined.includes(kw))) {
      return rule.category;
    }
  }
  return 'Bills';
}


export function toTitleCase(str = '') {
  if (!str || typeof str !== 'string') return '';
  return str
    .toLowerCase()
    .split(' ')
    .map((word) => (word ? word.charAt(0).toUpperCase() + word.slice(1) : ''))
    .join(' ');
}

export function extractPartyAndTitle(description = '', bankPreset = 'generic') {
  if (!description) return { title: 'Bank Transaction', recipient: '' };


  const clean = description.replace(/\u00A0/g, ' ').replace(/\s+/g, ' ').trim();
  const upper = clean.toUpperCase();

  if (upper.includes('INTEREST CREDIT') || upper.includes('INT.PD')) {
    return { title: 'Bank Interest Credit', recipient: 'Bank' };
  }
  if (upper.includes('CHQ WDL') || upper.includes('CHEQUE')) {
    return { title: 'Cheque Withdrawal', recipient: 'Cheque' };
  }
  if (upper.includes('ATM WDL') || upper.includes('CASH WDL')) {
    return { title: 'ATM Cash Withdrawal', recipient: 'Self / ATM' };
  }
  if (upper.includes('SALARY') || upper.includes('ACH/SAL')) {
    return { title: 'Monthly Salary Credit', recipient: 'Employer' };
  }

  if (upper.includes('UPI/') || upper.includes('UPI-')) {
    const delimiter = upper.includes('UPI/') ? '/' : '-';
    const parts = clean.split(delimiter);
    if (parts.length >= 3) {
      let rawName = parts[parts.length >= 4 ? 3 : 1].trim();
      rawName = rawName.replace(/[@#].*$/, '').replace(/[0-9]{5,}/g, '').trim();
      if (rawName.length >= 2) {
        const formatted = toTitleCase(rawName);
        return { title: formatted, recipient: formatted };
      }
    }
  }

  if (upper.startsWith('POS ') || upper.startsWith('ECOM ')) {
    const words = clean.split(' ').slice(2);
    if (words.length > 0) {
      const name = toTitleCase(words.slice(0, 3).join(' '));
      return { title: name, recipient: name };
    }
  }

  for (const rule of CATEGORY_RULES) {
    for (const kw of rule.keywords) {
      if (upper.includes(kw.toUpperCase())) {
        const name = toTitleCase(kw);
        return { title: name, recipient: name };
      }
    }
  }

  const firstChunk = clean.split(/[-–—/,\n]/)[0].trim();
  const fallbackTitle = firstChunk.length > 25 ? firstChunk.substring(0, 25) + '...' : firstChunk;
  return { title: fallbackTitle || 'Bank Transaction', recipient: '' };
}

export function parseDateSafely(dateVal) {
  if (!dateVal) return null;

  // Handle SheetJS Date objects
  if (dateVal instanceof Date && !isNaN(dateVal.getTime())) {
    const y = dateVal.getUTCFullYear();
    const m = dateVal.getUTCMonth();
    const d = dateVal.getUTCDate();
    const h = dateVal.getUTCHours();
    const min = dateVal.getUTCMinutes();
    const s = dateVal.getUTCSeconds();
    if (h === 0 && min === 0 && s === 0) {
      return new Date(Date.UTC(y, m, d, 12, 0, 0));
    }
    return dateVal;
  }

  // Handle Excel Serial Dates (e.g. 45123)
  if (typeof dateVal === 'number' && dateVal > 20000 && dateVal < 80000) {
    const wholeDays = Math.floor(dateVal);
    const fraction = dateVal - wholeDays;
    const epochDays = wholeDays - 25569;
    const ms = epochDays * 86400000 + Math.round(fraction * 86400000);
    const d = new Date(ms);
    if (fraction === 0) {
      return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 12, 0, 0));
    }
    return d;
  }

  const dateStr = String(dateVal).replace(/\u00A0/g, ' ').trim();
  if (!dateStr || dateStr.length < 4) return null;

  const lower = dateStr.toLowerCase();
  if (
    lower.includes('total') ||
    lower.includes('grand') ||
    lower.includes('sum') ||
    lower.includes('page') ||
    lower.includes('balance') ||
    lower.includes('statement') ||
    lower.includes('period') ||
    lower.includes('generated') ||
    lower.includes('note') ||
    lower.includes('disclaimer') ||
    lower.includes('count')
  ) {
    return null;
  }

  const parts = dateStr.split(/[-/.\s]+/);
  if (parts.length >= 3) {
    let [d, m, y] = parts;
    if (y && y.length === 2) y = '20' + y;

    const months = {
      jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
      jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
    };

    let monthIndex = parseInt(m, 10) - 1;
    if (isNaN(monthIndex) && m) {
      monthIndex = months[m.toLowerCase().slice(0, 3)] ?? -1;
    }

    let day = parseInt(d, 10);
    let year = parseInt(y, 10);

    // If format is YYYY-MM-DD
    if (d && d.length === 4) {
      year = parseInt(d, 10);
      day = parseInt(y, 10) || 1;
    }

    if (!isNaN(day) && day >= 1 && day <= 31 && monthIndex >= 0 && monthIndex <= 11 && !isNaN(year) && year >= 1990 && year <= 2099) {
      // Timezone-safe UTC midday anchor so date never rolls over across timezones
      return new Date(Date.UTC(year, monthIndex, day, 12, 0, 0));
    }
  }

  const nativeParsed = new Date(dateVal);
  if (!isNaN(nativeParsed.getTime()) && nativeParsed.getFullYear() >= 1990 && nativeParsed.getFullYear() <= 2099) {
    return new Date(Date.UTC(nativeParsed.getFullYear(), nativeParsed.getMonth(), nativeParsed.getDate(), 12, 0, 0));
  }

  return null;
}

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

export function getTransactionFingerprint(txn, index = 0) {
  const dateKey = normalizeDateKey(txn.date || txn.createdAt);
  const amountKey = Number(txn.amount || 0).toFixed(2);
  const typeKey = txn.isExpense ? 'DR' : 'CR';
  const refKey = extractReferenceNumber(txn.description || txn.title || '');
  const balKey = txn.balance !== undefined && !isNaN(Number(txn.balance)) ? Number(txn.balance).toFixed(2) : '';
  const descKey = String(txn.description || txn.title || '').trim().toLowerCase();

  if (refKey) {
    return {
      type: 'REF',
      key: `REF:${refKey}|AMT:${amountKey}|TYPE:${typeKey}`,
    };
  }

  if (balKey) {
    return {
      type: 'BAL',
      key: `DT:${dateKey}|AMT:${amountKey}|TYPE:${typeKey}|BAL:${balKey}|DESC:${descKey}`,
    };
  }

  return {
    type: 'COMPOSITE',
    key: `DT:${dateKey}|AMT:${amountKey}|TYPE:${typeKey}|DESC:${descKey}|ROW:${index}`,
  };
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


function extractClosingBalanceFromSummaryRow(row, rowJoined, balanceCol) {
  if (!Array.isArray(row)) return null;

  // 1. Regex search across all cells in the row for labelled balance
  for (const cell of row) {
    const cellStr = String(cell || '').trim();
    if (!cellStr) continue;

    const match = cellStr.match(/(?:closing\s*balance|available\s*balance|balance\s*as\s*on|total\s*balance|ending\s*balance|net\s*balance|balance)[\s:]*(?:rs\.?|inr)?\s*([0-9,]+(?:\.[0-9]{1,2})?)/i);
    if (match && match[1]) {
      const num = parseFloat(match[1].replace(/,/g, ''));
      if (!isNaN(num) && num >= 0) return num;
    }
  }

  // 2. If row mentions closing/available/balance/summary/total, check balance column or numeric cells
  if (
    rowJoined.includes('closing') ||
    rowJoined.includes('available') ||
    rowJoined.includes('balance') ||
    rowJoined.includes('summary') ||
    rowJoined.includes('total')
  ) {
    if (balanceCol !== -1 && row[balanceCol] !== undefined) {
      const rawVal = String(row[balanceCol]).replace(/,/g, '').replace(/cr|dr/gi, '').trim();
      const parsed = parseFloat(rawVal);
      if (!isNaN(parsed) && parsed >= 0) {
        return parsed;
      }
    }

    for (let i = row.length - 1; i >= 0; i--) {
      const cellStr = String(row[i] || '').replace(/,/g, '').replace(/^(?:rs\.?|inr)\s*/i, '').replace(/\s*(?:cr|dr)$/i, '').trim();
      const num = parseFloat(cellStr);
      if (!isNaN(num) && num > 0 && /^[0-9]+(?:\.[0-9]+)?$/.test(cellStr)) {
        return num;
      }
    }
  }

  return null;
}

export function parseTableRows(rows, bankPreset = 'generic') {
  if (!Array.isArray(rows) || rows.length === 0) return { transactions: [], closingBalance: null };

  let headerIndex = -1;
  let dateCol = 0;
  let descCol = 1;
  let debitCol = -1;
  let creditCol = -1;
  let balanceCol = -1;
  let singleAmountCol = -1;
  let typeCol = -1;

  // Search up to 100 rows for header row
  for (let i = 0; i < Math.min(rows.length, 100); i++) {
    const row = rows[i];
    if (!Array.isArray(row)) continue;

    const rowStr = row.map((cell) => String(cell || '').toLowerCase()).join(' ');

    const hasDateHeader = rowStr.includes('date') || rowStr.includes('tran date') || rowStr.includes('txn date') || rowStr.includes('posting date') || rowStr.includes('value date');
    const hasDescHeader = rowStr.includes('narration') || rowStr.includes('description') || rowStr.includes('particular') || rowStr.includes('details') || rowStr.includes('remarks') || rowStr.includes('merchant');

    if (hasDateHeader && (hasDescHeader || rowStr.includes('debit') || rowStr.includes('credit') || rowStr.includes('withdrawal') || rowStr.includes('amount'))) {
      headerIndex = i;

      row.forEach((cell, idx) => {
        const c = String(cell || '').toLowerCase().trim();
        if ((c.includes('date') || c.includes('txn') || c.includes('tran') || c.includes('posting')) && !c.includes('value') && dateCol === 0) dateCol = idx;
        if (c.includes('value date') && dateCol === 0) dateCol = idx;
        if (c.includes('narration') || c.includes('description') || c.includes('particular') || c.includes('details') || c.includes('remarks') || c.includes('merchant')) descCol = idx;
        if (c.includes('debit') || c.includes('withdrawal') || c === 'dr' || c.includes('dr.') || c.includes('dr amt') || c.includes('withdrawal amt')) debitCol = idx;
        if (c.includes('credit') || c.includes('deposit') || c === 'cr' || c.includes('cr.') || c.includes('cr amt') || c.includes('deposit amt')) creditCol = idx;
        if (c.includes('balance') || c.includes('closing') || c === 'bal' || c.includes('bal.') || c.includes('available bal')) balanceCol = idx;
        if (c === 'amount' || c === 'txn amount' || c === 'transaction amount' || c === 'net amount') singleAmountCol = idx;
        if (c.includes('type') || c.includes('dr / cr') || c.includes('dr/cr') || c.includes('cr/dr')) typeCol = idx;
      });
      break;
    }
  }

  // Fallback defaults if specific debit/credit headers weren't found
  if (debitCol === -1 && creditCol === -1 && singleAmountCol === -1) {
    debitCol = 3;
    creditCol = 4;
    balanceCol = 5;
  }

  const startIndex = headerIndex !== -1 ? headerIndex + 1 : 0;
  const transactions = [];
  let closingBalance = null;

  for (let i = startIndex; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length < 2) continue;

    const rowJoined = row.map((c) => String(c || '').toLowerCase()).join(' ');

    // 1. Skip ALL footer, summary, and total calculation rows while extracting the final summary balance
    if (
      rowJoined.includes('total') ||
      rowJoined.includes('grand total') ||
      rowJoined.includes('opening balance') ||
      rowJoined.includes('closing balance') ||
      rowJoined.includes('available balance') ||
      rowJoined.includes('total transactions') ||
      rowJoined.includes('total withdrawal') ||
      rowJoined.includes('total deposit') ||
      rowJoined.includes('total debit') ||
      rowJoined.includes('total credit') ||
      rowJoined.includes('statement summary') ||
      rowJoined.includes('account summary') ||
      rowJoined.includes('brought forward') ||
      rowJoined.includes('carried forward') ||
      rowJoined.includes('computer generated') ||
      rowJoined.includes('generated on') ||
      rowJoined.includes('generated at') ||
      rowJoined.includes('page ') ||
      rowJoined.includes('page no') ||
      rowJoined.includes('statement period') ||
      rowJoined.includes('end of statement') ||
      rowJoined.includes('end of report') ||
      rowJoined.includes('disclaimer') ||
      rowJoined.includes('important notice') ||
      rowJoined.includes('count of') ||
      rowJoined.includes('b/f') ||
      rowJoined.includes('c/f')
    ) {
      const summaryBal = extractClosingBalanceFromSummaryRow(row, rowJoined, balanceCol);
      if (summaryBal !== null) {
        closingBalance = summaryBal;
      }
      continue;
    }


    const dateVal = row[dateCol];
    const descVal = String(row[descCol] || '').trim();

    // 2. Validate transaction date strictly - must be a valid real date
    const dateObj = parseDateSafely(dateVal);
    if (!dateObj) {
      continue;
    }

    // 3. Skip rows with empty description or header keywords
    const descLower = descVal.toLowerCase();
    if (
      !descVal ||
      descLower === 'narration' ||
      descLower === 'particulars' ||
      descLower === 'description' ||
      descLower === 'details' ||
      descLower === 'remarks' ||
      descLower.startsWith('total')
    ) {
      continue;
    }

    let debit = 0;
    let credit = 0;

    if (debitCol !== -1 || creditCol !== -1) {
      const debitRaw = debitCol !== -1 ? String(row[debitCol] || '').replace(/,/g, '').trim() : '';
      const creditRaw = creditCol !== -1 ? String(row[creditCol] || '').replace(/,/g, '').trim() : '';
      debit = parseFloat(debitRaw) || 0;
      credit = parseFloat(creditRaw) || 0;
    }

    if (debit === 0 && credit === 0 && singleAmountCol !== -1) {
      const amtRaw = String(row[singleAmountCol] || '').replace(/,/g, '').trim();
      const num = parseFloat(amtRaw) || 0;
      const typeVal = typeCol !== -1 ? String(row[typeCol] || '').toLowerCase() : '';

      if (typeVal.includes('cr') || typeVal.includes('credit') || typeVal.includes('received') || typeVal.includes('refund')) {
        credit = Math.abs(num);
      } else {
        debit = Math.abs(num);
      }
    }

    if (debit === 0 && credit === 0) continue;

    const isExpense = debit > 0;
    const amount = isExpense ? debit : credit;
    if (isNaN(amount) || amount <= 0) continue;

    const { title, recipient } = extractPartyAndTitle(descVal, bankPreset);
    const category = categorizeTransaction(title, descVal);

    const balanceRaw = balanceCol !== -1 ? String(row[balanceCol] || '').replace(/,/g, '').trim() : '';
    const runningBal = balanceRaw ? parseFloat(balanceRaw) : undefined;

    if (runningBal !== undefined && !isNaN(runningBal)) {
      closingBalance = runningBal;
    }

    transactions.push({
      title,
      amount,
      isExpense,
      recipient,
      category,
      description: descVal,
      isOnline: descVal.toUpperCase().includes('UPI'),
      date: dateObj,
      balance: runningBal,
      reviewed: false,
    });
  }

  return { transactions, closingBalance };
}

export async function parseFileStatement(file, bankPreset = 'sbi', password = '') {

  const extension = file.name.split('.').pop().toLowerCase();

  if (extension === 'csv' || extension === 'txt' || extension === 'tsv') {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        skipEmptyLines: true,
        complete: (results) => {
          try {
            const parsed = parseTableRows(results.data, bankPreset);
            resolve(parsed);
          } catch (err) {
            const errorObj = new Error('CSV parsing error: ' + err.message);
            errorObj.isPasswordRequired = false;
            reject(errorObj);
          }
        },
        error: (err) => {
          const errorObj = new Error('CSV read error: ' + err.message);
          errorObj.isPasswordRequired = false;
          reject(errorObj);
        },
      });
    });
  }

  if (extension === 'xlsx' || extension === 'xls') {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const arrayBuffer = e.target.result;
        const bytes = new Uint8Array(arrayBuffer);

        // Convert arrayBuffer to Base64 in safe binary chunks
        let binaryStr = '';
        const chunkSize = 8192;
        for (let i = 0; i < bytes.length; i += chunkSize) {
          binaryStr += String.fromCharCode.apply(null, bytes.subarray(i, Math.min(i + chunkSize, bytes.length)));
        }
        const base64 = btoa(binaryStr);

        let sheetData = null;
        let decryptionError = null;

        // Step 1: Try local backend decryption & parsing engine
        try {
          const resp = await fetch('http://localhost:8000/api/statement/decrypt-and-parse', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              fileBase64: base64,
              fileName: file.name,
              password: password ? String(password).trim() : undefined,
              bankPreset,
            }),
          });

          const backendResult = await resp.json();

          if (resp.ok && backendResult.sheetData) {
            sheetData = backendResult.sheetData;
          } else if (backendResult.encrypted || backendResult.isPasswordRequired) {
            decryptionError = new Error(backendResult.message || 'Password required to unlock this bank statement.');
            decryptionError.isPasswordRequired = true;
          } else {
            decryptionError = new Error(backendResult.message || 'Failed to decrypt or read file.');
            decryptionError.isPasswordRequired = false;
          }
        } catch (fetchErr) {
          // Backend unreachable, will try client-side SheetJS fallback
        }

        // Step 2: If backend successfully decrypted and extracted sheetData, parse rows
        if (sheetData) {
          try {
            const parsed = parseTableRows(sheetData, bankPreset);
            return resolve(parsed);
          } catch (parseErr) {
            // Decryption succeeded, this is a table structure / parsing error
            const errorObj = new Error('Decryption succeeded, but error parsing rows: ' + parseErr.message);
            errorObj.isPasswordRequired = false;
            return reject(errorObj);
          }
        }

        // Step 3: If backend explicitly reported a password issue, return password error
        if (decryptionError && decryptionError.isPasswordRequired) {
          return reject(decryptionError);
        }

        // Step 4: Client-side SheetJS fallback for unencrypted / BIFF8 files
        try {
          const workbook = XLSX.read(bytes, {
            type: 'array',
            cellDates: true,
            password: password ? String(password).trim() : undefined,
          });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const rawSheetData = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false });
          const parsed = parseTableRows(rawSheetData, bankPreset);
          return resolve(parsed);
        } catch (clientErr) {
          const isPasswordErr =
            /password/i.test(clientErr.message) ||
            /encrypted/i.test(clientErr.message) ||
            /cannot find workbook/i.test(clientErr.message);

          const errorObj = new Error(
            isPasswordErr
              ? (password ? 'Incorrect password. The statement could not be decrypted with this password.' : 'Password required to unlock this bank statement.')
              : 'Could not read statement file: ' + clientErr.message
          );
          errorObj.isPasswordRequired = isPasswordErr;
          return reject(errorObj);
        }
      };
      reader.onerror = (err) => {
        const errorObj = new Error('File reading error: ' + err.message);
        errorObj.isPasswordRequired = false;
        reject(errorObj);
      };
      reader.readAsArrayBuffer(file);
    });
  }

  throw new Error(`Unsupported file format .${extension}. Please upload a .csv, .xlsx, or .xls file.`);
}




