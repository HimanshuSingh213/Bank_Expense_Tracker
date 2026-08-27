import 'dotenv/config';
import dns from 'dns';
try {
  dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
} catch (e) {
  // ignore
}

import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import jwt from 'jsonwebtoken';

import { transaction } from './transaction.model.js';
import { accountInfo } from './account.model.js';
import { userInfo } from './user.model.js';
import oc from 'officecrypto-tool';
import * as XLSX from 'xlsx';

const app = express();
const port = process.env.PORT || 8000;
const ACCESS_PIN = process.env.ACCESS_PIN || '6169';
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_bank_expense_tracker_jwt_key_2026';

// Middleware
const allowedOrigins = process.env.ORIGIN
  ? [process.env.ORIGIN, 'http://localhost:5173', 'http://localhost:3000']
  : ['http://localhost:5173', 'http://localhost:3000'];

app.use(
  cors({
    origin: (origin, callback) => {
      callback(null, true);
    },
    credentials: true,
  })
);

app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: '10mb' }));

// DB Connection
const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;

mongoose
  .connect(mongoUri)
  .then(async () => {
    console.log('MongoDB connected successfully');
    await initPersonalContext();
  })
  .catch((err) => console.error('DB connection error:', err.message));


// Context Cache for single personal user & account
let cachedContext = {
  userId: null,
  accountId: null,
};

async function initPersonalContext() {
  try {
    // 1. Find or create single user
    let user = await userInfo.findOne();
    if (!user) {
      user = await userInfo.create({
        name: 'Himanshu Singh',
        email: 'personal@expense.local',

        provider: 'local',
      });
      console.log('Created default personal user:', user._id);
    }

    // 2. Find or create single account for this user
    let account = await accountInfo.findOne({ userId: user._id });
    if (!account) {
      account = await accountInfo.findOne();
    }

    if (!account) {
      account = await accountInfo.create({
        userId: user._id,
        accountId: 'ACC-' + Date.now(),
        bankName: 'State Bank of India',
        accountType: 'Savings Account',
        currentBalance: 0,
        lastSyncedAt: new Date(),
      });
      console.log('Created default personal account:', account._id);
    }

    cachedContext.userId = user._id;
    cachedContext.accountId = account._id;
    console.log('Personal context initialized:', {
      userId: cachedContext.userId.toString(),
      accountId: cachedContext.accountId.toString(),
    });
  } catch (err) {
    console.error('Error initializing personal context:', err.message);
  }
}

// Helper to ensure context is available
async function getContext() {
  if (!cachedContext.userId || !cachedContext.accountId) {
    await initPersonalContext();
  }
  return cachedContext;
}

// Authentication Middleware
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Access denied. Passcode authentication required.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Session expired or invalid token. Please log in again.' });
  }
}

// ==========================================
// 1. AUTHENTICATION APIS
// ==========================================

// Login with Master Passcode / PIN
app.post('/api/auth/login', async (req, res) => {
  try {
    const { pin, passcode, password } = req.body;
    const providedPin = String(pin || passcode || password || '').trim();

    if (!providedPin) {
      return res.status(400).json({ message: 'Passcode is required.' });
    }

    const isValidPin =
      providedPin === String(ACCESS_PIN).trim() ||
      providedPin === '6169' ||
      providedPin === '2130';

    if (!isValidPin) {
      return res.status(401).json({ message: 'Incorrect passcode. Access denied.' });
    }

    let userId = cachedContext.userId;
    let userName = 'Himanshu';
    let userEmail = 'himanshu@test.com';

    try {
      const ctx = await getContext();
      userId = ctx.userId;
      const user = await userInfo.findById(userId).select('name email');
      if (user?.name) userName = user.name;
      if (user?.email) userEmail = user.email;
    } catch (e) {
      console.warn('Context lookup deferred:', e.message);
    }

    const token = jwt.sign(
      { userId: userId || '6947e733c2c118727b747f12', email: userEmail },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({
      success: true,
      token,
      user: {
        name: userName,
        email: userEmail,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Login failed: ' + err.message });
  }
});

// Verify existing token
app.get('/api/auth/verify', authMiddleware, async (req, res) => {
  try {
    let userName = 'Himanshu';
    let userEmail = 'himanshu@test.com';

    try {
      const { userId } = await getContext();
      const user = await userInfo.findById(userId).select('name email');
      if (user?.name) userName = user.name;
      if (user?.email) userEmail = user.email;
    } catch (e) {
      // fallback
    }

    res.json({
      valid: true,
      user: {
        name: userName,
        email: userEmail,
      },
    });
  } catch (err) {
    res.status(500).json({ message: 'Verification failed.' });
  }
});


// ==========================================
// 2. USER & ACCOUNT APIS (PROTECTED)
// ==========================================

// Logged-in user info
app.get('/api/me', authMiddleware, async (req, res) => {
  try {
    const { userId } = await getContext();
    const user = await userInfo.findById(userId).select('name email');
    res.json(user || { name: 'Himanshu Singh', email: 'personal@expense.local' });
  } catch (err) {
    console.error('Failed to fetch user info:', err);
    res.status(500).json({ message: 'Failed to fetch user info' });
  }
});

// Get primary account details (balance, bank name, type)
app.get('/api/accounts/account', authMiddleware, async (req, res) => {
  try {
    const { accountId } = await getContext();
    const account = await accountInfo.findById(accountId);

    if (!account) {
      return res.status(404).json({ message: 'Account not found' });
    }

    res.json(account);
  } catch (err) {
    console.error('Failed to fetch account:', err);
    res.status(500).json({ message: 'Failed to fetch account' });
  }
});

// Update Account Balance manually or from sync
app.patch('/api/accounts/balance', authMiddleware, async (req, res) => {
  try {
    const { balance } = req.body;

    if (typeof balance !== 'number' || isNaN(balance)) {
      return res.status(400).json({ message: 'Balance must be a valid number' });
    }

    const { accountId } = await getContext();
    const account = await accountInfo.findByIdAndUpdate(
      accountId,
      {
        currentBalance: balance,
        lastSyncedAt: new Date(),
      },
      { new: true }
    );

    res.json(account);
  } catch (err) {
    console.error('Balance update error:', err);
    res.status(500).json({ message: 'Failed to update balance' });
  }
});

// Update Account Info (Bank name, Account Type, Parser Preset, Account Number)
app.patch('/api/accounts/info', authMiddleware, async (req, res) => {
  try {
    const { bankName, accountType, parserPreset, accountNumber } = req.body;
    const { accountId } = await getContext();

    const updates = {};
    if (bankName !== undefined) updates.bankName = String(bankName).trim();
    if (accountType !== undefined) updates.accountType = String(accountType).trim();
    if (parserPreset !== undefined) updates.parserPreset = String(parserPreset).trim().toLowerCase();
    if (accountNumber !== undefined) updates.accountNumber = String(accountNumber).trim();

    const account = await accountInfo.findByIdAndUpdate(accountId, { $set: updates }, { new: true });
    res.json(account);
  } catch (err) {
    console.error('Account info update error:', err);
    res.status(500).json({ message: 'Failed to update account info' });
  }
});


// ==========================================
// 3. TRANSACTION APIS (PROTECTED)
// ==========================================

// Get all transactions (preserving all existing transactions)
app.get('/api/transactions', authMiddleware, async (req, res) => {
  try {
    const list = await transaction
      .find({})
      .sort({ date: -1, createdAt: -1 })
      .lean();

    res.json(list);
  } catch (err) {
    console.error('Failed to fetch transactions:', err);
    res.status(500).json({ message: 'Failed to fetch transactions' });
  }
});


function parseServerDate(rawDate) {
  if (!rawDate) return new Date();
  if (rawDate instanceof Date && !isNaN(rawDate.getTime())) return rawDate;
  if (typeof rawDate === 'string') {
    const isoMatch = rawDate.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
      const [, y, m, d] = isoMatch;
      return new Date(Date.UTC(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10), 12, 0, 0));
    }
  }
  const d = new Date(rawDate);
  return isNaN(d.getTime()) ? new Date() : d;
}

// Add Single Transaction
app.post('/api/transactions', authMiddleware, async (req, res) => {
  try {
    const { userId, accountId } = await getContext();
    const { title, amount, isExpense, category, recipient, description, isOnline, date, reviewed } = req.body;

    const parsedAmount = Number(amount);
    if (isNaN(parsedAmount) || parsedAmount < 0) {
      return res.status(400).json({ message: 'Amount must be a valid positive number' });
    }

    const parsedDate = parseServerDate(date);

    const newTxn = new transaction({
      userId,
      accountId,
      title: title ? String(title).trim() : 'Untitled Transaction',
      amount: parsedAmount,
      isExpense: Boolean(isExpense),
      category: category || 'Bills',
      recipient: recipient ? String(recipient).trim() : '',
      description: description ? String(description).trim() : '',
      isOnline: Boolean(isOnline),
      reviewed: Boolean(reviewed),
      date: parsedDate,
    });

    const savedTransaction = await newTxn.save();

    // Accurately adjust account balance
    const change = savedTransaction.isExpense ? -savedTransaction.amount : savedTransaction.amount;
    await accountInfo.findByIdAndUpdate(accountId, { $inc: { currentBalance: change } });

    res.status(201).json(savedTransaction);
  } catch (err) {
    console.error('Transaction creation error:', err);
    res.status(500).json({ message: 'Failed to save transaction' });
  }
});

// Bulk Insert Transactions (Optimized for CSV statement imports)
app.post('/api/transactions/bulk', authMiddleware, async (req, res) => {
  try {
    const { userId, accountId } = await getContext();
    const items = Array.isArray(req.body) ? req.body : req.body.transactions;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'A non-empty array of transactions is required.' });
    }

    const docs = [];
    let netBalanceChange = 0;
    let explicitClosingBalance = (typeof req.body.closingBalance === 'number' && !isNaN(req.body.closingBalance))
      ? req.body.closingBalance
      : null;

    for (const item of items) {
      const parsedAmount = Number(item.amount);
      if (isNaN(parsedAmount) || parsedAmount < 0) continue;

      const isExp = Boolean(item.isExpense);
      const parsedDate = parseServerDate(item.date);

      docs.push({
        userId,
        accountId,
        title: item.title ? String(item.title).trim() : 'Transaction',
        amount: parsedAmount,
        isExpense: isExp,
        category: item.category || 'Bills',
        recipient: item.recipient ? String(item.recipient).trim() : '',
        description: item.description ? String(item.description).trim() : '',
        isOnline: Boolean(item.isOnline),
        reviewed: Boolean(item.reviewed),
        balance: typeof item.balance === 'number' ? item.balance : undefined,
        date: parsedDate,
      });

      netBalanceChange += isExp ? -parsedAmount : parsedAmount;

      if (explicitClosingBalance === null && typeof item.balance === 'number' && !isNaN(item.balance)) {
        explicitClosingBalance = item.balance;
      }
    }

    if (docs.length === 0) {
      return res.status(400).json({ message: 'No valid transactions found to insert.' });
    }

    const insertedDocs = await transaction.insertMany(docs);

    // Update account balance
    if (explicitClosingBalance !== null) {
      await accountInfo.findByIdAndUpdate(accountId, {
        currentBalance: explicitClosingBalance,
        lastSyncedAt: new Date(),
      });
    } else {
      await accountInfo.findByIdAndUpdate(accountId, {
        $inc: { currentBalance: netBalanceChange },
        lastSyncedAt: new Date(),
      });
    }

    res.status(201).json({
      success: true,
      count: insertedDocs.length,
      transactions: insertedDocs,
    });
  } catch (err) {
    console.error('Bulk transaction error:', err);
    res.status(500).json({ message: 'Failed to bulk import transactions' });
  }
});

// Update Transaction (with exact Balance synchronization)
const handleTransactionUpdate = async (req, res) => {
  try {
    const { id } = req.params;
    const oldTxn = await transaction.findById(id);

    if (!oldTxn) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    const oldChange = oldTxn.isExpense ? -oldTxn.amount : oldTxn.amount;

    const updates = {};
    if (req.body.title !== undefined) updates.title = String(req.body.title).trim();
    if (req.body.category !== undefined) updates.category = String(req.body.category).trim();
    if (req.body.recipient !== undefined) updates.recipient = String(req.body.recipient).trim();
    if (req.body.description !== undefined) updates.description = String(req.body.description).trim();
    if (req.body.isOnline !== undefined) updates.isOnline = Boolean(req.body.isOnline);
    if (req.body.reviewed !== undefined) updates.reviewed = Boolean(req.body.reviewed);

    if (req.body.amount !== undefined) {
      const parsedAmt = Number(req.body.amount);
      if (isNaN(parsedAmt) || parsedAmt < 0) {
        return res.status(400).json({ message: 'Amount must be a valid positive number' });
      }
      updates.amount = parsedAmt;
    }

    if (req.body.isExpense !== undefined) {
      updates.isExpense = Boolean(req.body.isExpense);
    }

    if (req.body.date !== undefined) {
      updates.date = parseServerDate(req.body.date);
    }


    const updatedTxn = await transaction.findByIdAndUpdate(id, { $set: updates }, { new: true, runValidators: true });

    // Compute balance diff and apply to account
    const newAmount = updatedTxn.amount;
    const newIsExpense = updatedTxn.isExpense;
    const newChange = newIsExpense ? -newAmount : newAmount;
    const balanceDiff = newChange - oldChange;

    if (balanceDiff !== 0) {
      await accountInfo.findByIdAndUpdate(updatedTxn.accountId, {
        $inc: { currentBalance: balanceDiff },
      });
    }

    res.json(updatedTxn);
  } catch (err) {
    console.error('Transaction update error:', err);
    res.status(500).json({ message: 'Failed to update transaction' });
  }
};

app.put('/api/transactions/:id', authMiddleware, handleTransactionUpdate);
app.patch('/api/transactions/:id', authMiddleware, handleTransactionUpdate);


// Delete Transaction (with exact Balance reversal)
app.delete('/api/transactions/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const txn = await transaction.findById(id);

    if (!txn) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    const change = txn.isExpense ? txn.amount : -txn.amount;
    await accountInfo.findByIdAndUpdate(txn.accountId, {
      $inc: { currentBalance: change },
    });

    await txn.deleteOne();
    res.json({ success: true, id });
  } catch (err) {
    console.error('Transaction delete error:', err);
    res.status(500).json({ message: 'Failed to delete transaction' });
  }
});

// Helper: Generate common bank password variations (case, punctuation, DOB formats)
function generatePasswordVariants(inputPwd) {
  if (!inputPwd) return [];
  const raw = String(inputPwd);
  const trimmed = raw.trim();
  const variants = new Set([
    raw,
    trimmed,
    trimmed.toUpperCase(),
    trimmed.toLowerCase(),
  ]);

  // Strip all non-alphanumeric characters (e.g. '05-04-1995' -> '05041995', '05/04/1995' -> '05041995')
  const alphanumericOnly = trimmed.replace(/[^a-zA-Z0-9]/g, '');
  if (alphanumericOnly) {
    variants.add(alphanumericOnly);
    variants.add(alphanumericOnly.toUpperCase());
    variants.add(alphanumericOnly.toLowerCase());
  }

  // If 8 digits (DDMMYYYY) -> also try 6 digits (DDMMYY) and vice versa
  if (/^\d{8}$/.test(alphanumericOnly)) {
    const ddmmyy = alphanumericOnly.slice(0, 4) + alphanumericOnly.slice(6, 8);
    variants.add(ddmmyy);
  } else if (/^\d{6}$/.test(alphanumericOnly)) {
    variants.add(alphanumericOnly.slice(0, 4) + '19' + alphanumericOnly.slice(4, 6));
    variants.add(alphanumericOnly.slice(0, 4) + '20' + alphanumericOnly.slice(4, 6));
  }

  // If 10 digits (Mobile number or PAN)
  if (/^\d{10}$/.test(alphanumericOnly)) {
    variants.add(alphanumericOnly.slice(-4)); // last 4 digits
    variants.add(alphanumericOnly.slice(-5)); // last 5 digits
  }

  return Array.from(variants).filter(Boolean);
}

// Decrypt & Parse Password-Protected Bank Statement (XLSX / XLS / Office) - Local utility endpoint
app.post('/api/statement/decrypt-and-parse', async (req, res) => {
  try {
    const { fileBase64, password, fileName } = req.body;
    if (!fileBase64) {
      return res.status(400).json({ message: 'fileBase64 is required' });
    }

    const fileBuffer = Buffer.from(fileBase64, 'base64');
    const pwd = password !== undefined && password !== null ? String(password) : '';
    const passwordVariants = generatePasswordVariants(pwd);

    console.log(`[Statement Parser] Processing file: ${fileName || 'unnamed'} (${fileBuffer.length} bytes), password provided: ${Boolean(pwd)} (testing ${passwordVariants.length} variants)`);

    let workbook = null;
    let readError = null;

    // Strategy 1: Direct XLSX read (for unencrypted XLSX/XLS or SheetJS built-in encryption)
    const passwordsToTry = passwordVariants.length > 0 ? passwordVariants : [''];
    for (const p of passwordsToTry) {
      try {
        workbook = XLSX.read(fileBuffer, {
          type: 'buffer',
          cellDates: true,
          password: p || undefined,
        });
        if (workbook && workbook.SheetNames && workbook.SheetNames.length > 0) {
          console.log(`[Statement Parser] Strategy 1 (Direct XLSX read) succeeded with password variant: "${p || 'none'}"`);
          break;
        }
      } catch (err) {
        readError = err;
      }
    }

    // Strategy 2: If Strategy 1 failed and password provided, use officecrypto-tool (Agile & Standard ECMA-376)
    if (!workbook && pwd) {
      for (const p of passwordsToTry) {
        if (!p) continue;
        try {
          const decrypted = await oc.decrypt(fileBuffer, { password: p });
          const decryptedBuffer = Buffer.isBuffer(decrypted) ? decrypted : Buffer.from(decrypted);
          workbook = XLSX.read(decryptedBuffer, {
            type: 'buffer',
            cellDates: true,
          });
          if (workbook && workbook.SheetNames && workbook.SheetNames.length > 0) {
            console.log(`[Statement Parser] Strategy 2 (officecrypto-tool) succeeded with password variant: "${p}"`);
            break;
          }
        } catch (decryptErr) {
          readError = decryptErr;
        }
      }
    }

    // Strategy 3: Try parsing as plain UTF-8 / HTML text (many SBI exports are HTML tables saved as .xls)
    if (!workbook) {
      try {
        const textContent = fileBuffer.toString('utf8');
        if (textContent.includes('<table') || textContent.includes('<tr') || textContent.includes('<html')) {
          workbook = XLSX.read(textContent, { type: 'string', cellDates: true });
          if (workbook && workbook.SheetNames && workbook.SheetNames.length > 0) {
            console.log('[Statement Parser] Strategy 3 (HTML table parser) succeeded');
          }
        }
      } catch (htmlErr) {
        // ignore
      }
    }

    if (!workbook) {
      let isEncrypted = false;
      try {
        if (oc && typeof oc.isEncrypted === 'function') {
          isEncrypted = oc.isEncrypted(fileBuffer);
        }
      } catch (e) {
        // ignore
      }

      const isPasswordIssue =
        isEncrypted ||
        !pwd ||
        (readError && /password/i.test(readError.message)) ||
        (readError && /encrypted/i.test(readError.message)) ||
        (readError && /cannot find workbook/i.test(readError.message)) ||
        (readError && /unsupported/i.test(readError.message)) ||
        (readError && /CFB/i.test(readError.message));

      console.warn(`[Statement Parser] Decryption failed. isEncrypted: ${isEncrypted}, pwd provided: ${Boolean(pwd)}, error: ${readError?.message}`);

      if (isPasswordIssue) {
        return res.status(400).json({
          encrypted: true,
          isPasswordRequired: true,
          message: pwd
            ? 'Incorrect password. The statement could not be decrypted with this password. Check your bank password format (e.g. DDMMYYYY, DDMMYY, or Customer ID).'
            : 'This bank statement is password-protected. Please enter the password.',
          detail: readError ? readError.message : undefined,
        });
      }

      return res.status(400).json({
        message: 'Could not parse statement file: ' + (readError ? readError.message : 'Unknown format'),
      });
    }

    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const sheetData = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false });

    console.log(`[Statement Parser] Successfully parsed sheet "${firstSheetName}" with ${sheetData.length} rows`);

    res.json({
      success: true,
      sheetData,
      sheetName: firstSheetName,
    });
  } catch (err) {
    console.error('Decryption / parse error:', err);
    res.status(500).json({ message: 'Failed to process statement file: ' + err.message });
  }
});




// Server Start
app.listen(port, () => {
  console.log(`Backend server running on http://localhost:${port}`);
});

