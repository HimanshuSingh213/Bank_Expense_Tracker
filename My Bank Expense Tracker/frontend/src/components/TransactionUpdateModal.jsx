import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useAccount } from '../context/ExpenseContext';

const categoryOptions = [
  'Food',
  'Travel',
  'Shopping',
  'Bills',
  'Investments',
  'Salary',
  'Health',
  'Entertainment',
  'Education',
  'Transfer',
  'Others',
];


const initialFormState = {
  title: '',
  amount: '',
  recipient: '',
  isExpense: true,
  category: 'Bills',
  description: '',
  isOnline: false,
  date: '',
};

export default function TransactionUpdateModal() {
  const { openUpdate, toUpdate, setOpenUpdate, updateTransaction } = useAccount();
  const [loading, setLoading] = useState(false);
  const [inputStates, setInputStates] = useState(initialFormState);

  useEffect(() => {
    if (openUpdate && toUpdate) {
      setInputStates({
        title: toUpdate.title || '',
        amount: toUpdate.amount !== undefined ? toUpdate.amount : '',
        recipient: toUpdate.recipient || '',
        isExpense: toUpdate.isExpense !== undefined ? toUpdate.isExpense : true,
        category: toUpdate.category || 'Bills',

        description: toUpdate.hasDescription || toUpdate.description || '',
        isOnline: Boolean(toUpdate.isOnline),
        date: toUpdate.date ? new Date(toUpdate.date).toISOString().split('T')[0] : '',
      });
    }
  }, [openUpdate, toUpdate]);

  const handleSave = async (e) => {
    e?.preventDefault();
    if (!toUpdate?.id) return;

    const parsedAmount = parseFloat(inputStates.amount);
    if (!inputStates.title.trim()) {
      alert('Please enter a title');
      return;
    }
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    try {
      setLoading(true);
      const payload = {
        ...inputStates,
        title: inputStates.title.trim(),
        amount: parsedAmount,
        recipient: inputStates.recipient.trim(),
        description: inputStates.description.trim(),
        date: inputStates.date ? new Date(inputStates.date) : undefined,
      };

      const res = await updateTransaction(toUpdate.id, payload);
      if (res.success) {
        setOpenUpdate(false);
      } else {
        alert(res.message || 'Failed to update transaction');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (loading) return;
    setOpenUpdate(false);
    setInputStates(initialFormState);
  };

  if (!openUpdate) return null;

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={handleClose}
        className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs"
      />

      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          className="pointer-events-auto w-full max-w-md bg-white border border-gray-100 rounded-3xl p-6 shadow-2xl flex flex-col gap-4 overflow-y-auto custom-scroll text-gray-900"
        >
          <div className="flex justify-between items-center pb-3 border-b border-gray-200">
            <h2 className="font-bold text-sm sm:text-base text-gray-900">
              Edit Transaction
            </h2>

            <button
              type="button"
              onClick={handleClose}
              className="size-7 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 flex items-center justify-center transition cursor-pointer text-xs"
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleSave} className="space-y-3.5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-gray-600 uppercase tracking-wider">
                  Title *
                </label>
                <input
                  type="text"
                  required
                  value={inputStates.title}
                  onChange={(e) => setInputStates((prev) => ({ ...prev, title: e.target.value }))}
                  className="bg-gray-100 h-9 rounded-xl border border-gray-200 px-3 text-xs sm:text-sm text-gray-800 outline-none focus:ring-2 ring-purple-400 focus:bg-white transition-all"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-gray-600 uppercase tracking-wider">
                  Amount (₹) *
                </label>
                <input
                  type="number"
                  step="any"
                  min="0.01"
                  required
                  value={inputStates.amount}
                  onChange={(e) => setInputStates((prev) => ({ ...prev, amount: e.target.value }))}
                  className="bg-gray-100 h-9 rounded-xl border border-gray-200 px-3 text-xs sm:text-sm text-gray-800 outline-none focus:ring-2 ring-purple-400 focus:bg-white transition-all font-medium"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-gray-600 uppercase tracking-wider">
                  Party / Recipient
                </label>
                <input
                  type="text"
                  value={inputStates.recipient}
                  onChange={(e) => setInputStates((prev) => ({ ...prev, recipient: e.target.value }))}
                  className="bg-gray-100 h-9 rounded-xl border border-gray-200 px-3 text-xs sm:text-sm text-gray-800 outline-none focus:ring-2 ring-purple-400 focus:bg-white transition-all"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-gray-600 uppercase tracking-wider">
                  Date
                </label>
                <input
                  type="date"
                  value={inputStates.date}
                  onChange={(e) => setInputStates((prev) => ({ ...prev, date: e.target.value }))}
                  className="bg-gray-100 h-9 rounded-xl border border-gray-200 px-3 text-xs sm:text-sm text-gray-800 outline-none focus:ring-2 ring-purple-400 focus:bg-white transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-gray-600 uppercase tracking-wider">
                  Type
                </label>
                <select
                  value={inputStates.isExpense ? 'Expense' : 'Income'}
                  onChange={(e) => setInputStates((prev) => ({ ...prev, isExpense: e.target.value === 'Expense' }))}
                  className="bg-gray-100 h-9 rounded-xl border border-gray-200 px-3 text-xs sm:text-sm text-gray-800 outline-none focus:ring-2 ring-purple-400 focus:bg-white transition-all cursor-pointer"
                >
                  <option value="Expense">Expense (Debit)</option>
                  <option value="Income">Income (Credit)</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-gray-600 uppercase tracking-wider">
                  Category
                </label>
                <select
                  value={inputStates.category}
                  onChange={(e) => setInputStates((prev) => ({ ...prev, category: e.target.value }))}
                  className="bg-gray-100 h-9 rounded-xl border border-gray-200 px-3 text-xs sm:text-sm text-gray-800 outline-none focus:ring-2 ring-purple-400 focus:bg-white transition-all cursor-pointer"
                >
                  {categoryOptions.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-gray-600 uppercase tracking-wider">
                Notes
              </label>
              <textarea
                rows="2"
                value={inputStates.description}
                onChange={(e) => setInputStates((prev) => ({ ...prev, description: e.target.value }))}
                className="bg-gray-100 rounded-xl border border-gray-200 p-2.5 text-xs sm:text-sm text-gray-800 outline-none focus:ring-2 ring-purple-400 focus:bg-white transition-all resize-none"
              />
            </div>

            <div className="flex items-center gap-2 pt-0.5">
              <input
                type="checkbox"
                id="modalIsOnline"
                checked={inputStates.isOnline}
                onChange={(e) => setInputStates((prev) => ({ ...prev, isOnline: e.target.checked }))}
                className="h-3.5 w-3.5 rounded accent-purple-600 cursor-pointer"
              />
              <label htmlFor="modalIsOnline" className="text-xs font-medium text-gray-700 cursor-pointer select-none">
                Online Payment (UPI / NetBanking)
              </label>
            </div>

            <div className="w-full grid gap-3 items-center grid-flow-col grid-cols-[4fr_1fr] pt-3 border-t border-gray-200">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={loading}
                className="flex gap-2 items-center justify-center w-full rounded-xl p-2.5 bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white font-bold text-xs sm:text-sm shadow-sm transition-all duration-200 cursor-pointer disabled:opacity-50"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 3v4a1 1 0 0 0 1 1h7" />
                </svg>
                <span>{loading ? 'Saving...' : 'Save Changes'}</span>
              </motion.button>

              <button
                type="button"
                onClick={handleClose}
                disabled={loading}
                className="flex gap-1.5 items-center justify-center rounded-xl border border-gray-300 bg-white hover:bg-pink-50 hover:border-pink-300 text-gray-700 p-2.5 text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer disabled:opacity-50"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18 6 6 18" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="m6 6 12 12" />
                </svg>
                <span>Cancel</span>
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </>
  );
}