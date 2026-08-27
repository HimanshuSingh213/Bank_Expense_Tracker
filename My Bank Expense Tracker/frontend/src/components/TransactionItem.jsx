import React from 'react';
import { motion } from 'framer-motion';
import { useAccount } from '../context/ExpenseContext';

export default function TransactionItem({
  id,
  title,
  category,
  date,
  amount,
  recipient,
  isExpense,
  hasDescription,
  isOnline,
  reviewed,
}) {
  const {
    toggleReviewed,
    calculatorIds,
    toggleCalculator,
    deleteTransaction,
    setOpenDetail,
    setSelectedTransaction,
    setToUpdate,
    setOpenUpdate,
  } = useAccount();

  const isCalcSelected = calculatorIds.includes(id);

  const formatDate = (rawDate) => {
    if (!rawDate) return '';
    const d = new Date(rawDate);
    if (isNaN(d.getTime())) return String(rawDate);
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const formattedDate = formatDate(date);

  const formattedAmount = Number(amount || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const handleOpenDetail = () => {
    setSelectedTransaction({
      id,
      title,
      category,
      date: formattedDate,
      amount,
      recipient,
      isExpense,
      isOnline,
      hasDescription,
      reviewed,
    });
    setOpenDetail(true);
  };

  const handleUpdateDetail = () => {
    setToUpdate({
      id,
      title,
      category,
      amount,
      recipient,
      isExpense,
      isOnline,
      hasDescription,
      date: date ? new Date(date).toISOString().split('T')[0] : '',
    });
    setOpenUpdate(true);
  };

  const categoryVariants = {
    Food: 'text-[#008236] bg-[#00c9511a] border border-[#00c95133]',
    Travel: 'text-[#ca3500] bg-[#ff69001a] border border-[#ff690033]',
    Shopping: 'text-[#8200db] bg-[#ad46ff1a] border border-[#ad46ff33]',
    Bills: 'text-[#1447e6] bg-[#2b7fff1a] border border-[#2b7fff33]',
    Investments: 'text-[#0284c7] bg-[#0284c71a] border border-[#0284c733]',
    Salary: 'text-[#008236] bg-[#00c9511a] border border-[#00c95133]',
    Health: 'text-[#059669] bg-[#0596691a] border border-[#05966933]',
    Entertainment: 'text-[#db2777] bg-[#db27771a] border border-[#db277733]',
    Education: 'text-[#4f46e5] bg-[#4f46e51a] border border-[#4f46e533]',
    Transfer: 'text-[#475569] bg-[#4755691a] border border-[#47556933]',
    Others: 'text-[#364153] bg-[#6a72821a] border border-[#6a728233]',
  };

  const badgeClass = categoryVariants[category] || categoryVariants.Others;

  return (
    <motion.div
      layout
      whileHover={{ scale: 1.004, transition: { duration: 0.15 } }}
      whileTap={{ scale: 0.996 }}
      onClick={handleOpenDetail}
      className={`
        grid grid-cols-[auto_1fr_auto] sm:grid-cols-[auto_1fr_auto_auto]
        gap-3 items-center
        border rounded-2xl p-3.5 sm:p-4
        transition-all duration-150 cursor-pointer shadow-xs
        ${reviewed ? 'bg-slate-50/70 border-slate-200/60 opacity-60' : 'bg-white border-slate-200 hover:bg-slate-50/80 hover:border-slate-300 hover:shadow-md'}
        ${isCalcSelected ? 'ring-2 ring-indigo-500 bg-indigo-50/30' : ''}
      `}
    >
      <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
        <motion.button
          whileHover={{ scale: 1.15 }}
          whileTap={{ scale: 0.85 }}
          onClick={() => toggleReviewed(id, reviewed)}
          title={reviewed ? 'Mark as Unreviewed' : 'Mark as Reviewed'}
          className={`size-5 rounded-md border flex items-center justify-center transition-colors cursor-pointer shadow-xs ${
            reviewed
              ? 'bg-slate-900 border-slate-900 text-white'
              : 'border-slate-300 bg-white hover:border-slate-500 text-transparent'
          }`}
        >
          {reviewed && (
            <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.15 }}
          whileTap={{ scale: 0.85 }}
          onClick={() => toggleCalculator(id)}
          title={isCalcSelected ? 'Remove from Calculator' : 'Add to Calculator'}
          className={`size-5 rounded-md border flex items-center justify-center transition-colors cursor-pointer shadow-xs ${
            isCalcSelected
              ? 'bg-indigo-600 border-indigo-600 text-white'
              : 'border-slate-300 bg-slate-100 text-slate-500 hover:text-slate-900 hover:border-slate-400'
          }`}
        >
          <svg className="size-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <rect width="16" height="20" x="4" y="2" rx="2" />
            <line x1="8" x2="16" y1="6" y2="6" />
          </svg>
        </motion.button>
      </div>

      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <p
            className={`text-xs sm:text-sm font-semibold truncate text-slate-900 ${
              reviewed ? 'line-through text-slate-400' : ''
            }`}
          >
            {title}
          </p>

          {isOnline ? (
            <span title="Online UPI Transaction" className="shrink-0 text-blue-600">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <rect width="20" height="14" x="2" y="5" rx="2" />
                <line x1="2" x2="22" y1="10" y2="10" />
              </svg>
            </span>
          ) : (
            <span title="Cash Transaction" className="shrink-0 text-slate-400">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <rect width="20" height="12" x="2" y="6" rx="2" />
                <circle cx="12" cy="12" r="2" />
              </svg>
            </span>
          )}

          {hasDescription && (
            <span title="Has notes" className="shrink-0 text-purple-500">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V7l-5-5zM14 2v4h4M10 9H8m8 4H8m8 4H8" />
              </svg>
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500 flex-wrap">
          <span className={`px-2 py-0.5 rounded-md border text-[10px] font-semibold uppercase tracking-wider ${badgeClass}`}>
            {category || 'Others'}
          </span>

          <span>{formattedDate}</span>

          {recipient && <span className="truncate max-w-[120px] sm:max-w-[200px]">• {recipient}</span>}
        </div>
      </div>

      <div className="text-right">
        <span
          className={`text-sm sm:text-base font-bold ${
            isExpense ? 'text-rose-600' : 'text-emerald-600'
          }`}
        >
          {isExpense ? '-' : '+'}₹{formattedAmount}
        </span>
      </div>

      <div className="flex items-center gap-1 col-span-3 sm:col-span-1 justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100" onClick={(e) => e.stopPropagation()}>
        <motion.button
          whileHover={{ scale: 1.15 }}
          whileTap={{ scale: 0.85 }}
          onClick={handleUpdateDetail}
          title="Edit Transaction"
          className="size-7 rounded-lg hover:bg-blue-50 text-slate-400 hover:text-blue-600 flex items-center justify-center transition cursor-pointer"
        >
          <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.15 }}
          whileTap={{ scale: 0.85 }}
          onClick={() => deleteTransaction(id)}
          title="Delete Transaction"
          className="size-7 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 flex items-center justify-center transition cursor-pointer"
        >
          <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </motion.button>
      </div>
    </motion.div>
  );
}

