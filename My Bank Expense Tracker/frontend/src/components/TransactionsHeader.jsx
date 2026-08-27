import React from 'react';
import { useAccount } from '../context/ExpenseContext';

export default function TransactionsHeader() {
  const {
    transactions,
    filteredTransactions,
    paginatedTransactions,
    filters,
    setFilters,
  } = useAccount();

  const filterPills = [
    { label: 'All', value: 'all' },
    { label: 'Expense (Dr)', value: 'expense' },
    { label: 'Income (Cr)', value: 'income' },
    { label: 'UPI / Online', value: 'upi only' },
    { label: 'Cash', value: 'cash only' },
    { label: 'Reviewed', value: 'reviewed' },
    { label: 'Pending', value: 'pending' },
  ];

  const shownCount = paginatedTransactions?.length || 0;
  const totalCount = filteredTransactions?.length || 0;
  const grandTotal = transactions?.length || 0;
  const isFiltered = filters.search || filters.category !== 'all' || filters.type !== 'all';

  return (
    <div className="mt-8 space-y-3.5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-sm sm:text-base text-slate-900">
            Recent Transactions
          </h3>
          <p className="text-xs text-slate-500">
            Showing <span className="font-semibold text-slate-800">{shownCount}</span> of{' '}
            <span className="font-semibold text-slate-800">{grandTotal}</span> transactions
            {isFiltered && totalCount !== grandTotal && (
              <span className="text-slate-400"> ({totalCount} filtered)</span>
            )}
          </p>
        </div>

        {filters.search || filters.category !== 'all' || filters.type !== 'all' ? (
          <button
            onClick={() => setFilters({ search: '', category: 'all', type: 'all' })}
            className="text-xs font-semibold text-slate-500 hover:text-slate-900 hover:underline cursor-pointer"
          >
            Reset Filters
          </button>
        ) : null}
      </div>

      <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2.5">
        <div className="relative flex-1">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>

          <input
            type="text"
            value={filters.search}
            placeholder="Search transactions by title, merchant, notes, or category..."
            onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
            className="w-full h-9 rounded-xl border border-slate-300 bg-slate-50 pl-8 pr-8 text-xs sm:text-sm text-slate-900 outline-none focus:bg-white focus:border-slate-500 transition-colors placeholder:text-slate-400"
          />

          {filters.search && (
            <button
              onClick={() => setFilters((prev) => ({ ...prev, search: '' }))}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 size-4 rounded-full hover:bg-slate-200 flex items-center justify-center text-slate-500 text-xs cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>

        <div className="shrink-0">
          <select
            value={filters.category}
            onChange={(e) => setFilters((prev) => ({ ...prev, category: e.target.value }))}
            className="h-9 w-full md:w-auto rounded-xl border border-slate-300 bg-slate-50 px-3 text-xs sm:text-sm font-medium text-slate-800 outline-none focus:border-slate-500 cursor-pointer"
          >
            <option value="all">All Categories</option>
            <option value="food">Food & Dining</option>
            <option value="travel">Travel & Fuel</option>
            <option value="shopping">Shopping</option>
            <option value="bills">Bills & Utilities</option>
            <option value="investments">Investments</option>
            <option value="salary">Salary / Income</option>
            <option value="health">Health & Medical</option>
            <option value="entertainment">Entertainment</option>
            <option value="education">Education</option>
            <option value="transfer">Transfers</option>
            <option value="others">Others</option>
          </select>
        </div>
      </div>

      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-[11px] font-medium text-slate-500 mr-1 flex items-center gap-1">
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          Filter:
        </span>

        {filterPills.map((pill) => {
          const isActive = filters.type === pill.value;
          return (
            <button
              key={pill.value}
              onClick={() => setFilters((prev) => ({ ...prev, type: pill.value }))}
              className={`px-3 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer ${
                isActive
                  ? 'bg-slate-900 border border-slate-900 text-white font-bold shadow-xs'
                  : 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200 hover:text-slate-900'
              }`}
            >
              {pill.label}
            </button>
          );
        })}
      </div>
    </div>

  );
}
