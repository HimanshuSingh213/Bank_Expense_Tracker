import React from 'react';
import { motion } from 'framer-motion';
import { useAccount } from '../context/ExpenseContext';

export default function TransactionDetail() {
  const { selectedTransaction, setOpenDetail } = useAccount();

  if (!selectedTransaction) return null;

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

  const badgeClass = categoryVariants[selectedTransaction.category] || categoryVariants.Others;

  const formattedAmount = Number(selectedTransaction.amount || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => setOpenDetail(false)}
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs"
      />

      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          className="pointer-events-auto w-full max-w-lg max-h-[90vh] bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl flex flex-col gap-4 overflow-y-auto custom-scroll text-slate-900"
        >
          <div className="flex justify-between items-start pb-3 border-b border-slate-200">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V7l-5-5zM14 2v4h4M10 9H8m8 4H8m8 4H8" />
                </svg>
              </div>
              <div>
                <h2 className="font-bold text-base text-slate-900">
                  Transaction Details
                </h2>
                <p className="text-xs text-slate-500">
                  Complete information about this transaction
                </p>
              </div>
            </div>

            <button
              onClick={() => setOpenDetail(false)}
              className="size-7 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center transition cursor-pointer"
            >
              ✕
            </button>
          </div>

            <div className="space-y-4">
              {/* Section-1 */}
              <div className="w-full rounded-xl border border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50 p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-gray-900">
                      {selectedTransaction.title}
                    </h3>
                    <p
                      className={`mt-1 text-xl font-bold ${
                        selectedTransaction.isExpense
                          ? 'text-red-600'
                          : 'text-green-600'
                      }`}
                    >
                      {selectedTransaction.isExpense ? '-' : '+'}₹{formattedAmount}
                    </p>
                  </div>

                  <span className={`border text-xs px-2.5 py-0.5 rounded-xl font-semibold uppercase tracking-wider ${badgeClass}`}>
                    {selectedTransaction.category}
                  </span>
                </div>

                <div className="h-px bg-purple-200/80 my-3" />

                <div className="flex gap-2 items-center text-xs">
                  <div className="w-1/2 flex gap-2 items-center">
                    <svg className="h-4 w-4 text-gray-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 2v4M16 2v4M3 10h18" />
                      <rect width="18" height="18" x="3" y="4" rx="2" />
                    </svg>
                    <div>
                      <p className="text-gray-500 text-xs">Date</p>
                      <p className="font-semibold text-gray-900 mt-0.5">{selectedTransaction.date}</p>
                    </div>
                  </div>

                  <div className="w-1/2 flex gap-2 items-center">
                    <svg className="h-4 w-4 text-gray-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12.586 2.586A2 2 0 0011.172 2H4a2 2 0 00-2 2v7.172a2 2 0 00.586 1.414l8.704 8.704a2.426 2.426 0 003.42 0l6.58-6.58a2.426 2.426 0 000-3.42z" />
                      <circle cx="7.5" cy="7.5" r=".5" fill="currentColor" />
                    </svg>
                    <div>
                      <p className="text-gray-500 text-xs">Type</p>
                      <p className="font-semibold text-gray-900 mt-0.5">
                        {selectedTransaction.isExpense ? 'Expense' : 'Income'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section-2 */}
              <div className="bg-gray-50 rounded-xl p-3.5 border border-gray-100 text-xs">
                <div className="flex items-center gap-2 mb-1">
                  <svg className="h-4 w-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <rect width="20" height="14" x="2" y="5" rx="2" />
                    <line x1="2" x2="22" y1="10" y2="10" />
                  </svg>
                  <p className="text-gray-500 font-medium">Payment Method</p>
                </div>
                <p className="font-semibold text-gray-900 text-sm pl-6">
                  {selectedTransaction.isOnline ? 'Online Payment (UPI)' : 'Cash'}
                </p>
              </div>

              {/* Section-3 */}
              {selectedTransaction.recipient && (
                <div className="bg-gray-50 rounded-xl p-3.5 border border-gray-100 text-xs">
                  <div className="flex items-center gap-2 mb-1">
                    <svg className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 21v-2a4 4 0 00-4-4H9a4 4 0 00-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                    <p className="text-gray-500 font-medium">
                      {selectedTransaction.isExpense ? 'Recipient' : 'Sender'}
                    </p>
                  </div>
                  <p className="font-semibold text-gray-900 text-sm pl-6">
                    {selectedTransaction.recipient}
                  </p>
                </div>
              )}

              {/* Section-4 */}
              <div className="bg-gray-50 rounded-xl p-3.5 border border-gray-100 text-xs flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <svg className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4" />
                  </svg>
                  <p className="text-gray-500 font-medium">Review Status</p>
                </div>
                <span
                  className={`px-3 py-1 rounded-xl text-xs font-semibold ${
                    selectedTransaction.reviewed
                      ? 'bg-slate-900 text-white border border-slate-900'
                      : 'bg-white border border-gray-300 text-gray-700'
                  }`}
                >
                  {selectedTransaction.reviewed ? 'Reviewed' : 'Pending Review'}
                </span>
              </div>

              {/* Section-5 */}
              {selectedTransaction.hasDescription && (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <svg className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V7l-5-5zM14 2v4h4M10 9H8m8 4H8m8 4H8" />
                    </svg>
                    <p className="text-xs font-medium text-gray-900">Description</p>
                  </div>
                  <div className="border border-pink-200 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-4 text-xs text-gray-700 whitespace-pre-wrap font-mono">
                    {selectedTransaction.hasDescription}
                  </div>
                </div>
              )}
            </div>
        </motion.div>
      </div>
    </>
  );
}