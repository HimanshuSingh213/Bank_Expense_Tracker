import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAccount } from '../context/ExpenseContext';

export default function CalculatorPanel() {
  const { calculatorTransactions, toggleCalculator, clearCalculator } = useAccount();

  const { income, expense, netAmount, isNegative } = useMemo(() => {
    let inc = 0;
    let exp = 0;

    calculatorTransactions.forEach((txn) => {
      const amt = Number(txn.amount) || 0;
      if (txn.isExpense) {
        exp += amt;
      } else {
        inc += amt;
      }
    });

    const net = inc - exp;
    return {
      income: inc,
      expense: exp,
      netAmount: Math.abs(net),
      isNegative: net < 0,
    };
  }, [calculatorTransactions]);

  if (calculatorTransactions.length === 0) {
    return null;
  }

  const formatCurrency = (val) => {
    return Number(val || 0).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const formatDate = (rawDate) => {
    if (!rawDate) return '';
    const d = new Date(rawDate);
    if (isNaN(d.getTime())) return String(rawDate);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98, y: -10 }}
      transition={{ duration: 0.2 }}
      className="flex flex-col gap-4 rounded-2xl border p-5 sm:p-6 bg-slate-50 border-slate-200 shadow-sm text-slate-900"
    >
      <div className="flex items-center justify-between pb-3 border-b border-slate-200">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <rect width="16" height="20" x="4" y="2" rx="2" />
              <line x1="8" x2="16" y1="6" y2="6" />
              <line x1="16" x2="16" y1="14" y2="18" />
              <path d="M16 10h.01M12 10h.01M8 10h.01M12 14h.01M8 14h.01M12 18h.01M8 18h.01" />
            </svg>
          </div>
          <div>
            <h3 className="font-bold text-sm sm:text-base text-slate-900">
              Personal Calculator Scratchpad
            </h3>
            <p className="text-xs text-slate-500">
              Instant subtotal calculation for selected transactions
            </p>
          </div>
        </div>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={clearCalculator}
          className="text-xs font-semibold px-3 py-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 transition shadow-xs cursor-pointer"
        >
          Clear All
        </motion.button>
      </div>

      <div className="max-h-48 space-y-2 overflow-y-auto pr-1 custom-scroll">
        <AnimatePresence>
          {calculatorTransactions.map((txn) => (
            <motion.div
              key={txn._id}
              layout
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.15 }}
              className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-slate-200 shadow-2xs"
            >
              <div className="flex-1 min-w-0 pr-3">
                <p className="text-xs sm:text-sm font-semibold text-slate-900 truncate">
                  {txn.title}
                </p>
                <p className="text-[11px] text-slate-500">
                  {formatDate(txn.date || txn.createdAt)} {txn.recipient ? `• ${txn.recipient}` : ''}
                </p>
              </div>

              <div className="flex items-center gap-2.5">
                <span
                  className={`text-xs sm:text-sm font-bold ${
                    txn.isExpense ? 'text-rose-600' : 'text-emerald-600'
                  }`}
                >
                  {txn.isExpense ? '-' : '+'}₹{formatCurrency(txn.amount)}
                </span>

                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => toggleCalculator(txn._id)}
                  title="Remove from calculation"
                  className="size-6 rounded-md hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 transition cursor-pointer"
                >
                  <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </motion.button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <div className="space-y-1.5 pt-3 border-t border-slate-200 text-xs sm:text-sm">
        <div className="flex justify-between items-center text-slate-600">
          <span>Total Income</span>
          <span className="font-semibold text-emerald-600">+₹{formatCurrency(income)}</span>
        </div>

        <div className="flex justify-between items-center text-slate-600">
          <span>Total Expense</span>
          <span className="font-semibold text-rose-600">-₹{formatCurrency(expense)}</span>
        </div>

        <div className="flex justify-between items-center pt-2 border-t border-slate-200 font-bold text-sm sm:text-base">
          <span className="text-slate-900">Net Calculated Amount:</span>
          <span className={isNegative ? 'text-rose-600' : 'text-emerald-600'}>
            {isNegative ? '-' : ''}₹{formatCurrency(netAmount)}
          </span>
        </div>

        <div className="flex justify-between items-center pt-1 text-[11px] text-slate-500">
          <span>Selected Items:</span>
          <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-800 font-semibold">
            {calculatorTransactions.length} transaction{calculatorTransactions.length > 1 ? 's' : ''}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

