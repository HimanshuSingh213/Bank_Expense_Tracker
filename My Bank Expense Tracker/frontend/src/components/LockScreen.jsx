import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAccount } from '../context/ExpenseContext';

export default function LockScreen() {
  const { login } = useAccount();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!pin.trim()) {
      setError('Please enter your passcode');
      return;
    }

    setLoading(true);
    setError('');

    const res = await login(pin.trim());
    setLoading(false);

    if (!res.success) {
      setError(res.message || 'Incorrect passcode');
      setPin('');
      inputRef.current?.focus();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#f1f5f9] p-4 text-slate-900 antialiased selection:bg-slate-300 selection:text-slate-900">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-sm bg-white border border-slate-200 rounded-3xl p-7 shadow-xl"
      >
        <div className="flex justify-center mb-5">
          <div className="h-14 w-14 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-white shadow-sm">
            <svg
              className="h-6 w-6"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
        </div>

        <div className="text-center mb-6">
          <h2 className="text-lg font-bold tracking-tight text-slate-900">Expense Tracker Vault</h2>
          <p className="text-xs text-slate-500 mt-1">
            Enter your passcode to unlock your personal account
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <input
              ref={inputRef}
              type={showPin ? 'text' : 'password'}
              value={pin}
              onChange={(e) => {
                setPin(e.target.value);
                if (error) setError('');
              }}
              placeholder="Enter PIN..."
              className="w-full bg-slate-50 border border-slate-300 rounded-2xl px-4 py-3 text-center text-lg tracking-widest text-slate-900 placeholder:text-slate-400 placeholder:tracking-normal outline-none focus:bg-white focus:border-slate-500 transition-colors"
            />
            <button
              type="button"
              onClick={() => setShowPin((prev) => !prev)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1 transition cursor-pointer"
            >
              {showPin ? (
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

          {error && (
            <motion.div
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: [0, -6, 6, -4, 4, 0] }}
              transition={{ duration: 0.3 }}
              className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs text-center font-medium"
            >
              {error}
            </motion.div>
          )}

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 rounded-2xl bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white font-bold text-sm transition-colors duration-150 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2 shadow-xs"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <span>Unlock Vault</span>
            )}
          </motion.button>
        </form>

        <p className="text-center text-[11px] text-slate-400 mt-5">
          PIN Protection • 100% Private Local Session
        </p>
      </motion.div>
    </div>
  );
}