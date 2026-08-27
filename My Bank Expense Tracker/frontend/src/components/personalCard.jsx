import React, { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAccount } from '../context/ExpenseContext';
import { BANK_PRESETS } from '../utils/statementParser';

export default function PersonalCard() {
  const {
    balance,
    bankName,
    accountType,
    parserPreset,
    accountNumber,
    lastSyncedAt,
    updateAccountBalance,
    updateAccountInfo,
    isSyncing,
  } = useAccount();

  const [isEditingBalance, setIsEditingBalance] = useState(false);
  const [localBalance, setLocalBalance] = useState(balance);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);

  const [selectedPreset, setSelectedPreset] = useState(parserPreset || 'sbi');
  const [customBankName, setCustomBankName] = useState(bankName || 'State Bank of India');
  const [customAccountType, setCustomAccountType] = useState(accountType || 'Savings Account');
  const [customAccNumber, setCustomAccNumber] = useState(accountNumber || '');

  const inputRef = useRef(null);

  useEffect(() => {
    setLocalBalance(balance);
  }, [balance]);

  useEffect(() => {
    if (isEditingBalance) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditingBalance]);

  useEffect(() => {
    setSelectedPreset(parserPreset || 'sbi');
    setCustomBankName(bankName || 'State Bank of India');
    setCustomAccountType(accountType || 'Savings Account');
    setCustomAccNumber(accountNumber || '');
  }, [bankName, accountType, parserPreset, accountNumber, isAccountModalOpen]);

  const handleSaveBalance = async () => {
    const val = Number(localBalance);
    if (isNaN(val)) return;
    setIsEditingBalance(false);
    await updateAccountBalance(val);
  };

  const handleCancelBalance = () => {
    setLocalBalance(balance);
    setIsEditingBalance(false);
  };

  const handleSaveAccountProfile = async (e) => {
    e?.preventDefault();
    await updateAccountInfo({
      bankName: customBankName.trim() || 'State Bank of India',
      accountType: customAccountType.trim() || 'Savings Account',
      parserPreset: selectedPreset,
      accountNumber: customAccNumber.trim(),
    });
    setIsAccountModalOpen(false);
  };

  const handleSelectPreset = (presetId) => {
    const preset = BANK_PRESETS.find((p) => p.id === presetId);
    setSelectedPreset(presetId);
    if (preset && preset.id !== 'generic') {
      setCustomBankName(preset.name);
      setCustomAccountType(preset.accountType);
    }
  };

  const formattedBalance = Number(balance || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const formatUpdatedDate = (rawDate) => {
    if (!rawDate) return 'Recent statement';
    const d = new Date(rawDate);
    if (isNaN(d.getTime())) return String(rawDate);
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const activePresetObj = BANK_PRESETS.find((p) => p.id === (parserPreset || 'sbi')) || BANK_PRESETS[0];

  return (
    <>
      <motion.div
        whileHover={{ y: -2 }}
        transition={{ duration: 0.2 }}
        className="bg-gradient-to-br from-indigo-50/70 via-white to-purple-50/50 p-6 rounded-2xl shadow-xs border border-indigo-100/90 flex flex-col justify-between text-slate-900 min-h-[230px]"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3.5">
            <div className="h-12 w-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <svg
                className="h-6 w-6"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7V4a1 1 0 00-1-1H5a2 2 0 000 4h15a1 1 0 011 1v4h-3a2 2 0 000 4h3a1 1 0 001-1v-2a1 1 0 00-1-1" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 5v14a2 2 0 002 2h15a1 1 0 001-1v-4" />
              </svg>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <p className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider">Available Balance</p>
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              </div>

              {!isEditingBalance ? (
                <>
                  <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 mt-0.5">
                    ₹{formattedBalance}
                  </h2>
                  <p className="text-[11px] text-slate-500 mt-0.5 font-medium">
                    Updated on {formatUpdatedDate(lastSyncedAt)}
                  </p>
                </>
              ) : (
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="text-lg font-bold text-slate-700">₹</span>
                  <input
                    ref={inputRef}
                    type="number"
                    step="any"
                    value={localBalance}
                    onChange={(e) => setLocalBalance(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveBalance();
                      if (e.key === 'Escape') handleCancelBalance();
                    }}
                    className="h-8 w-36 bg-white border border-slate-300 rounded-lg px-2.5 text-sm font-bold text-slate-900 outline-none focus:border-indigo-500 shadow-2xs"
                  />
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {!isEditingBalance ? (
              <motion.button
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.94 }}
                onClick={() => setIsEditingBalance(true)}
                title="Edit Balance"
                className="h-8 w-8 rounded-xl bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 flex items-center justify-center transition cursor-pointer shadow-2xs"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </motion.button>
            ) : (
              <div className="flex items-center gap-1">
                <motion.button
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.94 }}
                  onClick={handleSaveBalance}
                  disabled={isSyncing}
                  title="Save Balance"
                  className="h-8 w-8 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center transition cursor-pointer shadow-xs"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.94 }}
                  onClick={handleCancelBalance}
                  title="Cancel"
                  className="h-8 w-8 rounded-xl bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 flex items-center justify-center transition cursor-pointer shadow-2xs"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </motion.button>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 pt-3">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-lg border border-indigo-200 bg-indigo-50/80 text-[11px] font-bold uppercase tracking-wider text-indigo-800 shadow-2xs">
              {activePresetObj.shortName} Format Active
            </span>
            {accountNumber && (
              <span className="text-[11px] font-mono text-slate-500">
                ••• {accountNumber}
              </span>
            )}
          </div>

          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setIsAccountModalOpen(true)}
            className="text-xs font-semibold text-slate-600 hover:text-indigo-600 hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>Switch Bank</span>
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </motion.button>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-4 border-t border-indigo-100 mt-2">
          <div className="bg-white/80 rounded-xl p-3 border border-indigo-100 shadow-2xs">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Institution</p>
            <p className="text-xs sm:text-sm font-bold text-slate-900 truncate mt-0.5">{bankName || 'State Bank of India'}</p>
          </div>

          <div className="bg-white/80 rounded-xl p-3 border border-indigo-100 shadow-2xs">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Account Type</p>
            <p className="text-xs sm:text-sm font-bold text-slate-900 truncate mt-0.5">{accountType || 'Savings Account'}</p>
          </div>
        </div>
      </motion.div>

      <AnimatePresence>
        {isAccountModalOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAccountModalOpen(false)}
              className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs"
            />

            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                transition={{ duration: 0.2 }}
                className="pointer-events-auto w-full max-w-lg bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl flex flex-col gap-4 max-h-[90vh] overflow-y-auto custom-scroll text-slate-900"
              >
                <div className="flex justify-between items-start pb-3 border-b border-slate-200">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      Bank Account & Statement Format Profile
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Select your bank so statement imports use the exact parser preset
                    </p>
                  </div>

                  <button
                    onClick={() => setIsAccountModalOpen(false)}
                    className="size-7 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center transition cursor-pointer"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    Select Primary Bank Preset:
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {BANK_PRESETS.map((preset) => {
                      const isSelected = selectedPreset === preset.id;
                      return (
                        <motion.div
                          key={preset.id}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleSelectPreset(preset.id)}
                          className={`p-3 rounded-2xl border text-xs cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-slate-900 border-slate-900 text-white shadow-xs'
                              : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <p className={`font-bold ${isSelected ? 'text-white' : 'text-slate-900'}`}>{preset.shortName}</p>
                            {isSelected && (
                              <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-xs" />
                            )}
                          </div>
                          <p className={`text-[11px] mt-1 truncate ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>{preset.name}</p>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>

                <form onSubmit={handleSaveAccountProfile} className="space-y-3 pt-2 border-t border-slate-200">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                        Bank Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={customBankName}
                        onChange={(e) => setCustomBankName(e.target.value)}
                        className="bg-slate-50 h-9 rounded-xl border border-slate-300 px-3 text-xs sm:text-sm text-slate-900 outline-none focus:border-slate-500 transition-colors"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                        Account Type *
                      </label>
                      <input
                        type="text"
                        required
                        value={customAccountType}
                        onChange={(e) => setCustomAccountType(e.target.value)}
                        className="bg-slate-50 h-9 rounded-xl border border-slate-300 px-3 text-xs sm:text-sm text-slate-900 outline-none focus:border-slate-500 transition-colors"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                      Last 4 Digits / Account Reference (Optional)
                    </label>
                    <input
                      type="text"
                      maxLength={10}
                      placeholder="e.g. 6169"
                      value={customAccNumber}
                      onChange={(e) => setCustomAccNumber(e.target.value)}
                      className="bg-slate-50 h-9 rounded-xl border border-slate-300 px-3 text-xs sm:text-sm text-slate-900 outline-none focus:border-slate-500 transition-colors"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                    <button
                      type="button"
                      onClick={() => setIsAccountModalOpen(false)}
                      className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                    >
                      Cancel
                    </button>

                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      type="submit"
                      disabled={isSyncing}
                      className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white text-xs font-bold shadow-sm transition cursor-pointer disabled:opacity-50"
                    >
                      {isSyncing ? 'Saving Profile...' : 'Save Bank Profile'}
                    </motion.button>
                  </div>
                </form>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>

    </>
  );
}
