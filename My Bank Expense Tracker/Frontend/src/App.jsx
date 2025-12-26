import React from "react";
import { useAccount } from "./context/ExpenseContext";
import NavBar from "./components/NavBar";
import PersonalCard from "./components/PersonalCard";
import ImportCsv from "./components/ImportCsv";
import TransactionForm from "./components/TransactionForm";
import StatsSection from "./components/StatsSection";
import CalculatorPanel from "./components/CalculatorPanel";
import TransactionsHeader from "./components/TransactionsHeader";
import TransactionsList from "./components/TransactionsList";
import TransactionDetail from "./components/TransactionDetail";
import LoadingState from "./components/LoadingState";
function App() {
  const { openDetail, loading, importingTxn, isLoading } = useAccount();
  return (
    <div>
      {openDetail && <TransactionDetail />}
      {(loading || importingTxn) && <LoadingState message="Fetching transactions..." />}
      {isLoading && <LoadingState message="Syncing data..." />}

      <div className="min-h-screen bg-linear-to-br from-indigo-500 via-purple-500 to-sky-400 flex justify-center px-4 py-6">
        <div className="w-full max-w-6xl bg-[#fffffff2] rounded-2xl shadow-2xl p-5 md:p-7 lg:py-7.5 lg:px-5">
          <NavBar />

          <section className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] gap-6 mt-8">
            <div className="space-y-6">
              <PersonalCard />

              <ImportCsv />
            </div>

            <div className="space-y-6">
              <TransactionForm />
            </div>
          </section>
          <div>
            <StatsSection />
          </div>
          <div className="mt-8 space-y-6">
            <CalculatorPanel />
            <TransactionsHeader />
            <TransactionsList />
          </div>
        </div>

      </div>
    </div>
  );
}

export default App;

