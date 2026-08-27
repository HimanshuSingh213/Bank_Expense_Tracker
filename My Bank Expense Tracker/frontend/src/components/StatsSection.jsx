import React from 'react';
import { motion } from 'framer-motion';
import { useAccount } from '../context/ExpenseContext';

export default function StatsSection() {
  const { totalIncome, totalExpense, balance, lastSyncedAt } = useAccount();

  const formatCurrency = (val) => {
    return Number(val || 0).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

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

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
      },
    },
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 12 },
    show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8"
    >
      <StatCard
        variants={cardVariants}
        title="Total Income (30 Days)"
        amount={formatCurrency(totalIncome)}
        cardBg="bg-emerald-50/70 border-emerald-200/80"
        titleColor="text-emerald-700"
        amountColor="text-emerald-800"
        iconBg="bg-emerald-100 text-emerald-600 border border-emerald-200"
        icon={
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16 7h6v6m0-6L13.5 15.5 8.5 10.5 2 17" />
          </svg>
        }
      />

      <StatCard
        variants={cardVariants}
        title="Total Spent (30 Days)"
        amount={formatCurrency(totalExpense)}
        cardBg="bg-rose-50/70 border-rose-200/80"
        titleColor="text-rose-700"
        amountColor="text-rose-800"
        iconBg="bg-rose-100 text-rose-600 border border-rose-200"
        icon={
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16 17h6v-6m0 6l-8.5-8.5-5 5L2 7" />
          </svg>
        }
      />

      <StatCard
        variants={cardVariants}
        title="Net Balance"
        amount={formatCurrency(balance)}
        updatedText={`Updated on ${formatUpdatedDate(lastSyncedAt)}`}
        cardBg="bg-blue-50/70 border-blue-200/80"
        titleColor="text-blue-700"
        amountColor="text-blue-900"
        iconBg="bg-blue-100 text-blue-600 border border-blue-200"
        icon={
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7V4a1 1 0 00-1-1H5a2 2 0 000 4h15a1 1 0 011 1v4h-3a2 2 0 000 4h3a1 1 0 001-1v-2a1 1 0 00-1-1" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 5v14a2 2 0 002 2h15a1 1 0 001-1v-4" />
          </svg>
        }
      />
    </motion.div>
  );
}

function StatCard({ title, amount, updatedText, cardBg, titleColor, amountColor, icon, iconBg, variants }) {
  return (
    <motion.div
      variants={variants}
      whileHover={{ y: -3, transition: { duration: 0.15 } }}
      className={`p-5 rounded-2xl border shadow-xs flex items-center justify-between transition-all duration-200 hover:shadow-md ${cardBg}`}
    >
      <div className="flex flex-col gap-0.5">
        <p className={`text-[11px] font-bold uppercase tracking-wider ${titleColor}`}>
          {title}
        </p>
        <h3 className={`text-xl sm:text-2xl font-bold tracking-tight ${amountColor}`}>
          ₹{amount}
        </h3>
        {updatedText && (
          <p className="text-[11px] text-blue-600/90 font-semibold mt-0.5">
            {updatedText}
          </p>
        )}
      </div>

      <div className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 shadow-xs ${iconBg}`}>
        {icon}
      </div>
    </motion.div>
  );
}

