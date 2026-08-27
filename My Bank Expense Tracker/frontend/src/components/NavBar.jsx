import React from 'react';
import { motion } from 'framer-motion';
import { useAccount } from '../context/ExpenseContext';

export default function NavBar() {
  const { user, logout, loadDashboardData, loading } = useAccount();

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';
  const userName = user?.name || 'Himanshu';

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-200">
      <div>
        <div className="flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-sm shadow-xs">
            ₹
          </div>
          <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900">
            My Bank Expense Tracker
          </h1>
        </div>

        <p className="text-slate-500 text-xs sm:text-sm mt-1">
          {greeting}, <span className="font-semibold text-slate-800">{userName}</span>
        </p>
      </div>

      <div className="flex items-center gap-2 self-end sm:self-auto">
        <motion.button
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          onClick={() => loadDashboardData()}
          disabled={loading}
          title="Refresh Data"
          className="h-8 px-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-slate-900 flex items-center gap-1.5 text-xs font-semibold transition cursor-pointer disabled:opacity-50 shadow-xs"
        >
          <svg
            className={`size-3.5 ${loading ? 'animate-spin' : ''}`}
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          <span>{loading ? 'Syncing...' : 'Sync'}</span>
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => logout()}
          title="Lock Dashboard"
          className="size-8 rounded-xl border border-slate-200 bg-slate-50 hover:bg-rose-50 text-slate-500 hover:text-rose-600 hover:border-rose-200 flex items-center justify-center transition cursor-pointer shadow-xs"
        >
          <svg className="size-3.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </motion.button>
      </div>
    </div>

  );
}
