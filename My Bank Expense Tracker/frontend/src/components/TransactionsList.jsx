import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAccount } from '../context/ExpenseContext';
import TransactionItem from './TransactionItem';

export default function TransactionsList() {
  const {
    filteredTransactions,
    paginatedTransactions,
    currentPage,
    setCurrentPage,
    itemsPerPage,
    totalPages,
    loading,
  } = useAccount();

  if (loading && filteredTransactions.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="py-12 flex flex-col items-center justify-center gap-3 text-slate-500"
      >
        <div className="h-7 w-7 rounded-full border-2 border-slate-300 border-t-slate-800 animate-spin" />
        <p className="text-xs font-semibold">Loading transactions from database...</p>
      </motion.div>
    );
  }

  if (filteredTransactions.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="py-12 px-4 text-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 my-4"
      >
        <div className="h-12 w-12 rounded-2xl bg-white text-slate-400 border border-slate-200 flex items-center justify-center mx-auto mb-2.5 shadow-2xs">
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h4 className="text-xs sm:text-sm font-bold text-slate-800">No transactions found</h4>
        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
          Import a bank statement above or adjust your search filters.
        </p>
      </motion.div>
    );
  }

  const startCount = (currentPage - 1) * itemsPerPage + 1;
  const endCount = Math.min(currentPage * itemsPerPage, filteredTransactions.length);

  const getPageNumbers = () => {
    const pages = [];
    const maxButtons = 5;

    if (totalPages <= maxButtons) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      let start = Math.max(1, currentPage - 2);
      let end = Math.min(totalPages, start + maxButtons - 1);
      if (end - start < maxButtons - 1) {
        start = Math.max(1, end - maxButtons + 1);
      }
      for (let i = start; i <= end; i++) pages.push(i);
    }
    return pages;
  };

  const pageNumbers = getPageNumbers();

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages && page !== currentPage) {
      setCurrentPage(page);
      window.scrollTo({ top: 400, behavior: 'smooth' });
    }
  };

  return (
    <div className="mt-4 space-y-4">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentPage}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className="space-y-2"
        >
          {paginatedTransactions.map((txn) => (
            <TransactionItem
              key={txn._id}
              id={txn._id}
              title={txn.title}
              category={txn.category}
              date={txn.date || txn.createdAt}
              amount={txn.amount}
              recipient={txn.recipient}
              isExpense={txn.isExpense}
              hasDescription={txn.description}
              isOnline={txn.isOnline}
              balance={txn.balance}
              reviewed={txn.reviewed}
            />
          ))}
        </motion.div>
      </AnimatePresence>

      {totalPages > 1 && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-700"
        >
          <div className="text-slate-600 font-medium text-center sm:text-left">
            Showing <strong className="text-slate-900 font-bold">{startCount}–{endCount}</strong> of{' '}
            <strong className="text-slate-900 font-bold">{filteredTransactions.length}</strong> transactions
          </div>

          <div className="flex items-center gap-1.5 flex-wrap justify-center">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handlePageChange(1)}
              disabled={currentPage === 1}
              title="First Page"
              className="h-8 w-8 rounded-xl border border-slate-300 bg-white text-slate-700 flex items-center justify-center hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
            >
              «
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              title="Previous Page"
              className="h-8 px-2.5 rounded-xl border border-slate-300 bg-white text-slate-700 flex items-center justify-center gap-1 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer font-medium"
            >
              ‹ Prev
            </motion.button>

            {pageNumbers.map((num) => {
              const isActive = num === currentPage;
              return (
                <motion.button
                  key={num}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handlePageChange(num)}
                  className={`h-8 min-w-[32px] px-2.5 rounded-xl border text-xs font-bold transition cursor-pointer flex items-center justify-center ${
                    isActive
                      ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                      : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  {num}
                </motion.button>
              );
            })}

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              title="Next Page"
              className="h-8 px-2.5 rounded-xl border border-slate-300 bg-white text-slate-700 flex items-center justify-center gap-1 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer font-medium"
            >
              Next ›
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handlePageChange(totalPages)}
              disabled={currentPage === totalPages}
              title="Last Page"
              className="h-8 w-8 rounded-xl border border-slate-300 bg-white text-slate-700 flex items-center justify-center hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
            >
              »
            </motion.button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
