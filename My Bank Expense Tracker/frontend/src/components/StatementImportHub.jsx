import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAccount } from '../context/ExpenseContext';
import {
  parseFileStatement,
  BANK_PRESETS,
  isDuplicateTransaction,
  getTransactionFingerprint,
  extractReferenceNumber,
  normalizeDateKey,
} from '../utils/statementParser';


export default function StatementImportHub() {
  const {
    bulkAddTransactions,
    transactions: existingTransactions,
    parserPreset,
    isSyncing,
  } = useAccount();

  const [selectedPreset, setSelectedPreset] = useState(parserPreset || 'sbi');
  const [isDragging, setIsDragging] = useState(false);
  const [parsing, setParsing] = useState(false);

  // Password Modal State
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [pendingFile, setPendingFile] = useState(null);
  const [statementPassword, setStatementPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [isDecrypting, setIsDecrypting] = useState(false);

  useEffect(() => {
    if (parserPreset) setSelectedPreset(parserPreset);
  }, [parserPreset]);

  // Preview & Confirmation State
  const [previewData, setPreviewData] = useState(null);
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [statusMessage, setStatusMessage] = useState('');
  const fileInputRef = useRef(null);

  const processFile = async (file, password = '') => {
    if (!file) return;
    setParsing(true);
    setStatusMessage('');
    setPasswordError('');

    try {
      const result = await parseFileStatement(file, selectedPreset, password);
      if (!result.transactions || result.transactions.length === 0) {
        setIsPasswordModalOpen(false);
        setPendingFile(null);
        setStatementPassword('');
        alert(`File opened successfully, but 0 transactions were detected for the "${selectedPreset.toUpperCase()}" format.\n\nTip: Try selecting a different Bank Format (or Generic) at the top.`);
        return;
      }

      setIsPasswordModalOpen(false);
      setPendingFile(null);
      setStatementPassword('');
      preparePreview(result.transactions, result.closingBalance);
    } catch (err) {
      if (err.isPasswordRequired) {
        // Genuine password decryption prompt or failure
        setPendingFile(file);
        setPasswordError(password ? (err.message || 'Incorrect password. Please verify and try again.') : '');
        setIsPasswordModalOpen(true);
      } else {
        // File was unlocked/decrypted, but there was a table parsing error
        setIsPasswordModalOpen(false);
        console.error('File parsing error:', err);
        alert('Parsing Error: ' + err.message);
      }
    } finally {
      setParsing(false);
      setIsDecrypting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };


  const closePasswordModal = () => {
    if (isDecrypting) return;
    setIsPasswordModalOpen(false);
    setPendingFile(null);
    setStatementPassword('');
    setPasswordError('');
    setIsDecrypting(false);
  };

  const handlePasswordSubmit = (e) => {
    e?.preventDefault();
    if (!statementPassword) {
      setPasswordError('Please enter the statement password.');
      return;
    }
    if (!pendingFile) {
      closePasswordModal();
      return;
    }
    const submittedPassword = statementPassword;
    setStatementPassword(''); // Clear password input field after submit
    setIsDecrypting(true);
    processFile(pendingFile, submittedPassword);
  };


  const preparePreview = (txns, closingBalance) => {
    // Sort transactions LATEST FIRST
    const sortedTxns = [...txns].sort((a, b) => {
      const dateA = new Date(a.date).getTime() || 0;
      const dateB = new Date(b.date).getTime() || 0;
      return dateB - dateA;
    });

    const seenRefs = new Set();
    const seenFullRows = new Set();

    const marked = sortedTxns.map((txn, index) => {
      // 1. Check against historical database transactions
      const isDbDup = existingTransactions.some((existing) => isDuplicateTransaction(txn, existing));

      // 2. Intra-batch check: only duplicate if identical UPI RRN or identical (date + amount + balance + desc)
      let isBatchDup = false;
      const ref = extractReferenceNumber(txn.description || txn.title || '');
      if (ref) {
        if (seenRefs.has(ref)) isBatchDup = true;
        else seenRefs.add(ref);
      } else {
        const fullRowKey = `${normalizeDateKey(txn.date)}|${txn.amount}|${txn.isExpense}|${txn.balance ?? ''}|${(txn.description || '').trim().toLowerCase()}`;
        if (seenFullRows.has(fullRowKey)) isBatchDup = true;
        else seenFullRows.add(fullRowKey);
      }

      const isDup = isDbDup || isBatchDup;

      return {
        ...txn,
        id: 'preview-' + index + '-' + Date.now(),
        isDuplicate: isDup,
        duplicateReason: isDbDup ? 'Already in tracker' : isBatchDup ? 'Duplicate in file' : null,
        selected: !isDup,
      };
    });


    setPreviewData({
      transactions: marked,
      closingBalance,
    });
  };

  const handleConfirmImport = async () => {
    if (!previewData || !previewData.transactions) return;

    const toImport = previewData.transactions.filter((t) => (skipDuplicates ? t.selected && !t.isDuplicate : t.selected));

    if (toImport.length === 0) {
      alert('No transactions selected for import.');
      return;
    }

    setParsing(true);
    try {
      const res = await bulkAddTransactions(toImport, previewData.closingBalance);
      if (res.success) {
        setStatusMessage(`Successfully imported ${res.count || toImport.length} transactions!`);
        setPreviewData(null);
        setTimeout(() => setStatusMessage(''), 4000);
      } else {
        alert('Failed to import: ' + res.message);
      }
    } catch (err) {
      console.error('Bulk add error:', err);
      alert('Import failed: ' + err.message);
    } finally {
      setParsing(false);
    }
  };

  const updateItemCategory = (index, newCat) => {
    setPreviewData((prev) => {
      const updated = [...prev.transactions];
      updated[index].category = newCat;
      return { ...prev, transactions: updated };
    });
  };

  const toggleItemType = (index) => {
    setPreviewData((prev) => {
      const updated = [...prev.transactions];
      updated[index].isExpense = !updated[index].isExpense;
      return { ...prev, transactions: updated };
    });
  };

  const toggleItemSelection = (index) => {
    setPreviewData((prev) => {
      const updated = [...prev.transactions];
      updated[index].selected = !updated[index].selected;
      return { ...prev, transactions: updated };
    });
  };

  const selectAll = (select) => {
    setPreviewData((prev) => {
      const updated = prev.transactions.map((t) => ({
        ...t,
        selected: select ? (!skipDuplicates || !t.isDuplicate) : false,
      }));
      return { ...prev, transactions: updated };
    });
  };

  const getPasswordHint = (presetId) => {
    switch (presetId) {
      case 'sbi':
        return 'SBI statements are usually protected by your Date of Birth (DDMMYY or DDMMYYYY) or registered Mobile Number / CIF Number.';
      case 'hdfc':
        return 'HDFC statements often use your Customer ID or registered PAN.';
      case 'icici':
        return 'ICICI statements typically use your Date of Birth (DDMMYYYY) or ATM PIN.';
      case 'axis':
        return 'Axis Bank statements generally use your Customer ID.';
      case 'kotak':
        return 'Kotak statements use your Customer Relationship Number (CRN) or Date of Birth.';
      default:
        return 'Bank statements typically use your Date of Birth (DDMMYYYY or DDMMYY), PAN, or Customer ID as password.';
    }
  };

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 shadow-xs transition-all duration-200 text-slate-900">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Bank Statement Import
            </h2>
            <p className="text-xs text-slate-500">
              Direct import for CSV, Excel (.xlsx, .xls) statements
            </p>
          </div>
        </div>
      </div>

      <div className="pt-4 pb-1">
        <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
          <span className="text-xs text-slate-700 font-semibold">
            Select Bank Format:
          </span>
          <span className="text-[11px] text-slate-500">
            {BANK_PRESETS.find((p) => p.id === selectedPreset)?.description}
          </span>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto custom-scroll pb-1">
          {BANK_PRESETS.map((preset) => {
            const isSelected = selectedPreset === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => setSelectedPreset(preset.id)}
                className={`px-3 py-1.5 rounded-xl border text-xs font-bold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-slate-900 border-slate-900 text-white shadow-xs'
                    : 'bg-white border-slate-300 text-slate-700 hover:border-slate-400 hover:bg-slate-100'
                }`}
              >
                <span>{preset.shortName}</span>
                {isSelected && <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-xs" />}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-4">
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            const file = e.dataTransfer.files[0];
            if (file) processFile(file);
          }}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center gap-3 text-center cursor-pointer transition-all duration-150 ${
            isDragging
              ? 'border-slate-400 bg-slate-100 scale-[1.005]'
              : 'border-slate-300 bg-white hover:border-slate-400 hover:bg-slate-50/80 shadow-2xs'
          }`}
        >
          <div className="h-12 w-12 rounded-2xl bg-slate-50 text-slate-600 border border-slate-200 flex items-center justify-center shadow-2xs">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>

          <div>
            <p className="text-sm font-bold text-slate-900">
              {parsing
                ? `Parsing ${selectedPreset.toUpperCase()} statement data...`
                : `Drop your ${BANK_PRESETS.find((p) => p.id === selectedPreset)?.shortName || 'Bank'} statement file here`}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Supports <span className="font-semibold text-slate-700">.CSV</span>,{' '}
              <span className="font-semibold text-slate-700">.XLSX</span>, and{' '}
              <span className="font-semibold text-slate-700">.XLS</span> (including password-protected files)
            </p>
          </div>

          <div className="flex items-center gap-2 mt-1">
            <button
              type="button"
              disabled={parsing || isSyncing}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
            >
              Browse Files
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls,.tsv,.txt"
            onChange={(e) => processFile(e.target.files[0])}
            className="hidden"
          />
        </div>
      </div>

      {statusMessage && (
        <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-semibold text-emerald-800 flex items-center gap-2">
          <svg className="h-4 w-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          <span>{statusMessage}</span>
        </div>
      )}

      {/* PASSWORD INPUT MODAL FOR ENCRYPTED STATEMENTS */}
      <AnimatePresence>
        {isPasswordModalOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                if (!isDecrypting) closePasswordModal();
              }}
              className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs"
            />

            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                transition={{ duration: 0.2 }}
                className="pointer-events-auto w-full max-w-md bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl flex flex-col gap-4 overflow-hidden text-slate-900"
              >
                <div className="flex justify-between items-start pb-3 border-b border-slate-200">
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center shadow-xs">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900">
                        Password Protected Statement
                      </h3>
                      <p className="text-xs text-slate-500 truncate max-w-[200px]">
                        {pendingFile?.name || 'Statement file'}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={closePasswordModal}
                    disabled={isDecrypting}
                    className="size-7 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center transition cursor-pointer"
                  >
                    ✕
                  </button>
                </div>

                <form onSubmit={handlePasswordSubmit} className="space-y-3.5">
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                      Enter Statement Password *
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        autoFocus
                        required
                        value={statementPassword}
                        onChange={(e) => {
                          setStatementPassword(e.target.value);
                          if (passwordError) setPasswordError('');
                        }}
                        placeholder="e.g. DDMMYYYY or Customer ID..."
                        className="w-full bg-slate-50 h-10 rounded-xl border border-slate-300 pl-3 pr-10 text-xs sm:text-sm text-slate-900 outline-none focus:border-slate-500 transition-colors"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1 transition cursor-pointer"
                      >
                        {showPassword ? (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>

                  {passwordError && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium text-center"
                    >
                      {passwordError}
                    </motion.div>
                  )}

                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-start gap-2.5 text-xs text-slate-700">
                    <svg className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <p className="font-semibold text-slate-900">{BANK_PRESETS.find((p) => p.id === selectedPreset)?.name} Password Hint:</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">{getPasswordHint(selectedPreset)}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                    <button
                      type="button"
                      onClick={closePasswordModal}
                      disabled={isDecrypting}
                      className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                    >
                      Cancel
                    </button>

                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      type="submit"
                      disabled={isDecrypting}
                      className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white text-xs font-bold shadow-sm transition cursor-pointer disabled:opacity-50 flex items-center gap-2"
                    >
                      {isDecrypting ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Decrypting...</span>
                        </>
                      ) : (
                        <span>Unlock & Import</span>
                      )}
                    </motion.button>
                  </div>
                </form>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>

      {/* PREVIEW & CONFIRMATION MODAL */}
      <AnimatePresence>
        {previewData && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setPreviewData(null)}
              className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs"
            />

            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                transition={{ duration: 0.2 }}
                className="pointer-events-auto w-full max-w-3xl max-h-[90vh] bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl flex flex-col gap-4 overflow-hidden text-slate-900"
              >
                <div className="flex justify-between items-start pb-3 border-b border-slate-200">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      Review Transactions Before Importing
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Found{' '}
                      <span className="font-semibold text-slate-900">
                        {previewData.transactions.length} transactions
                      </span>
                      {previewData.closingBalance !== null && (
                        <span>
                          {' '}• Detected Closing Balance: <strong className="text-emerald-600">₹{previewData.closingBalance.toFixed(2)}</strong>
                        </span>
                      )}
                    </p>
                  </div>

                  <button
                    onClick={() => setPreviewData(null)}
                    className="size-7 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center transition cursor-pointer"
                  >
                    ✕
                  </button>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200 text-xs">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="skipDuplicatesCheck"
                      checked={skipDuplicates}
                      onChange={(e) => setSkipDuplicates(e.target.checked)}
                      className="h-4 w-4 rounded accent-slate-900 cursor-pointer"
                    />
                    <label htmlFor="skipDuplicatesCheck" className="font-semibold text-slate-800 cursor-pointer select-none">
                      Skip Already Imported Duplicates
                    </label>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => selectAll(true)}
                      className="text-slate-800 font-semibold hover:underline cursor-pointer"
                    >
                      Select All
                    </button>
                    <span className="text-slate-300">|</span>
                    <button
                      onClick={() => selectAll(false)}
                      className="text-slate-500 hover:underline cursor-pointer"
                    >
                      Deselect All
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scroll max-h-[50vh]">
                  {previewData.transactions.map((txn, idx) => {
                    const isExcluded = skipDuplicates && txn.isDuplicate;

                    return (
                      <div
                        key={txn.id}
                        className={`grid grid-cols-[auto_1fr_auto_auto] gap-3 items-center p-3 rounded-xl border text-xs transition-all ${
                          isExcluded
                            ? 'bg-slate-100 border-slate-200 opacity-40'
                            : txn.selected
                            ? 'bg-white border-slate-300 shadow-2xs'
                            : 'bg-slate-50 border-slate-200 opacity-60'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={txn.selected && !isExcluded}
                          disabled={isExcluded}
                          onChange={() => toggleItemSelection(idx)}
                          className="h-4 w-4 rounded accent-slate-900 cursor-pointer"
                        />

                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-slate-900 truncate">
                              {txn.title}
                            </p>
                            {txn.isDuplicate && (
                              <span
                                title={txn.duplicateReason || 'Duplicate detected'}
                                className="px-1.5 py-0.5 rounded bg-amber-100 border border-amber-300 text-[10px] font-bold text-amber-800"
                              >
                                {txn.duplicateReason || 'Duplicate'}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                            {new Date(txn.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} • {txn.description}
                          </p>
                        </div>

                        <div>
                          <select
                            value={txn.category}
                            onChange={(e) => updateItemCategory(idx, e.target.value)}
                            disabled={isExcluded}
                            className="bg-slate-50 border border-slate-300 rounded-lg px-2 py-1 text-[11px] font-medium text-slate-800 outline-none cursor-pointer"
                          >
                            <option value="Food">Food</option>
                            <option value="Travel">Travel</option>
                            <option value="Shopping">Shopping</option>
                            <option value="Bills">Bills</option>
                            <option value="Investments">Investments</option>
                            <option value="Salary">Salary</option>
                            <option value="Health">Health</option>
                            <option value="Entertainment">Entertainment</option>
                            <option value="Education">Education</option>
                            <option value="Transfer">Transfer</option>
                            <option value="Others">Others</option>
                          </select>
                        </div>

                        <div className="text-right min-w-[95px] flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => toggleItemType(idx)}
                            disabled={isExcluded}
                            title="Click to toggle Expense / Income"
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold border transition cursor-pointer ${
                              txn.isExpense
                                ? 'bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100'
                                : 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100'
                            }`}
                          >
                            {txn.isExpense ? 'DR' : 'CR'}
                          </button>
                          <span
                            className={`font-bold ${
                              txn.isExpense ? 'text-rose-600' : 'text-emerald-600'
                            }`}
                          >
                            {txn.isExpense ? '-' : '+'}₹{Number(txn.amount).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-200">
                  <p className="text-xs text-slate-600 font-medium">
                    Selected:{' '}
                    <strong className="text-slate-900">
                      {previewData.transactions.filter((t) => (skipDuplicates ? t.selected && !t.isDuplicate : t.selected)).length}
                    </strong>{' '}
                    of {previewData.transactions.length}
                  </p>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPreviewData(null)}
                      className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                    >
                      Cancel
                    </button>

                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleConfirmImport}
                      disabled={isSyncing}
                      className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white text-xs font-bold shadow-sm transition cursor-pointer disabled:opacity-50"
                    >
                      {isSyncing ? 'Importing...' : 'Confirm & Import Transactions'}
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

