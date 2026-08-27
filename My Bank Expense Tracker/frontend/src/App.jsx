import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAccount } from './context/ExpenseContext';
import NavBar from './components/NavBar';
import PersonalCard from './components/personalCard';
import StatementImportHub from './components/StatementImportHub';
import StatsSection from './components/StatsSection';
import CalculatorPanel from './components/CalculatorPanel';
import TransactionsHeader from './components/TransactionsHeader';
import TransactionsList from './components/TransactionsList';
import TransactionDetail from './components/TransactionDetail';
import TransactionUpdateModal from './components/TransactionUpdateModal';
import LoadingState from './components/LoadingState';
import LockScreen from './components/LockScreen';

export default function App() {
  const {
    isAuthenticated,
    authChecking,
    openDetail,
    openUpdate,
    isSyncing,
  } = useAccount();

  if (authChecking) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center text-slate-800 gap-3">
        <div className="h-8 w-8 border-2 border-slate-300 border-t-slate-800 rounded-full animate-spin" />
        <p className="text-xs font-medium tracking-wider text-slate-500 uppercase">
          Verifying Session...
        </p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LockScreen />;
  }

  return (
    <div className="min-h-screen bg-[#f1f5f9] text-slate-900 flex justify-center px-3 sm:px-6 py-4 sm:py-8 antialiased selection:bg-slate-200 selection:text-slate-900">
      <AnimatePresence>
        {openDetail && <TransactionDetail key="detailModal" />}
        {openUpdate && <TransactionUpdateModal key="updateModal" />}
        {isSyncing && <LoadingState key="syncState" message="Syncing with database..." />}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="w-full max-w-6xl bg-white rounded-2xl shadow-xl border border-slate-200/80 p-5 sm:p-8"
      >
        <NavBar />


        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
          className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.8fr)] gap-6 mt-6"
        >
          <div>
            <PersonalCard />
          </div>

          <div>
            <StatementImportHub />
          </div>
        </motion.section>

        <StatsSection />

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.15 }}
          className="mt-8 space-y-6"
        >
          <CalculatorPanel />
          <TransactionsHeader />
          <TransactionsList />
        </motion.div>
      </motion.div>
    </div>
  );
}
