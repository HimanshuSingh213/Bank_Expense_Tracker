import { createContext, useContext, useEffect, useState, useMemo } from "react";

const ExpenseContext = createContext(null);

export const useAccount = () => {
  return useContext(ExpenseContext);
};

export function ExpenseProvider({ children }) {
  const [theme, setTheme] = useState("light"); // "light" | "dark"
  const [bankName, setBankName] = useState("........");
  const [accountType, setAccountType] = useState("........");
  const [user, setUser] = useState(".........");

  // Transaction states
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [importingTxn, setImportingTxn] = useState(false);

  // stats states
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpense, setTotalExpense] = useState(0);
  const [balance, setBalance] = useState(0);

  // Transaction Detail Modal states
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [openDetail, setOpenDetail] = useState(false);

  const [isLoading, setIsLoading] = useState(false);

  // Transaction Update modal states
  const [toUpdate, setToUpdate] = useState(null);
  const [openUpdate, setOpenUpdate] = useState(false);


  //Filter states
  const [filters, setFilters] = useState({
    search: "",
    category: "all",
    type: "all",        
  });

  const filteredTransactions = useMemo(
    () => applyFilters(transactions, filters),
    [transactions, filters]
  );
  
  
  function applyFilters(transactions, filters){
    return transactions.filter(txn => {

      // Search
      if(filters.search){
        const q = filters.search.toLowerCase();
        if(!txn.title.toLowerCase().includes(q) && !txn.recipient?.toLowerCase().includes(q)) return false;
      }

      //Category
      if (filters.category !== "all" && txn.category.toLowerCase() !== filters.category) return false;
      

      // type
      if(filters.type === "reviewed" && !txn.reviewed) return false;
      if(filters.type === "pending" && txn.reviewed) return false;

      if(filters.type === "upi only" && !txn.isOnline) return false;
      if(filters.type === "cash only" && txn.isOnline) return false;

      return true;
    });
  }

  async function getUserTransactions() {
    try {
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/transactions`)
      const finalData = await res.json();
      setTransactions(finalData);

    }
    catch (err) {
      console.error("Failed to load transaction:", err)
    }
    finally {
      setLoading(false);
    }
  }
  async function getBalance() {
    const res = await fetch(
      `${import.meta.env.VITE_BACKEND_URL}/api/accounts/account`
    );
    const data = await res.json();
    setBalance(data.currentBalance);
  }

  async function getAccountInfo() {
    const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/accounts/account`);
    const data = await res.json();
    setBankName(data.bankName);
    setAccountType(data.accountType);
  }

  async function getUserInfo() {
    const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/me`);
    const data = await res.json();
    setUser(data.name);
  }

  useEffect(() => {
    getUserInfo();
  }, []);
  
  useEffect(() => {
    getBalance();
  }, []);

  useEffect(() => {
    getUserTransactions();
  }, []);

  useEffect(() => {
    let income = 0;
    let expense = 0;

    const now = new Date();
    const thirtyDays = 30 * 24 * 60 * 60 * 1000;
    transactions.forEach((t) => {
      const txnDate = new Date(t.date || t.createdAt);
      if (isNaN(txnDate.getTime())) return;

      const diff = now - txnDate;

      if (diff <= thirtyDays) {
        if (t.isExpense) {
          expense += Number(t.amount);
        }
        else {
          income += Number(t.amount);
        }
      }
    });

    setTotalIncome(income);
    setTotalExpense(expense);

  }, [transactions]);

  async function deleteTransaction(id) {

    const ok = confirm("Are you sure you want to delete this Transaction?");

    if (!ok) return;
    else {
      try {
        setIsLoading(true);
        await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/transactions/${id}`, {
          method: "DELETE"
        })

        await getUserTransactions();

      }
      catch (err) {
        console.error("Failed to delete transaction:", err);
      }
      finally{
        setIsLoading(false);
      }

    }
  }

  async function addTransaction(formData) {
    try {
      // CSV import (in array)
      if (Array.isArray(formData)) {
        setImportingTxn(true); // starts Loading

        for (const txn of formData) {
          const res = await fetch(
            `${import.meta.env.VITE_BACKEND_URL}/api/transactions`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                ...txn,
              }),
            }
          );

          if (!res.ok) {
            console.error("Failed to add transaction:", txn);
          }

        }

        // fetching after full CSV import
        await getUserTransactions();
        return;
      }

      // For Single Transaction
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/transactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
        }),

      });

      const saved = await res.json();
      setTransactions(prev => [saved, ...prev]);
      await getUserTransactions();

    } catch (err) {
      console.error("Failed to add transaction:", err);
    }
    finally {
      // END loading
      setImportingTxn(false);
    }
  }

  async function updateTransaction(id, updates) {
    try {
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/transactions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      })

      const updated = await res.json();
      setTransactions(prev =>
        prev.map(transaction => transaction._id === updated._id ? updated : transaction)
      );
    }
    catch (err) {
      console.error("Failed to update transaction:", err);
    }
  }

  function toggleReviewed(id, value) {
    updateTransaction(id, { reviewed: !value });
  }

  function toggleCalculator(id, value) {
    updateTransaction(id, { inCalculator: !value });
  }

  let calculatorTransactions = transactions.filter(t => t.inCalculator);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") root.classList.add("dark");
    else root.classList.remove("dark");
  }, [theme]);

  const value = {
    theme,
    setTheme,
    totalIncome,
    totalExpense,
    user,
    balance,
    setTotalIncome,
    setTotalExpense,
    setBalance,
    transactions,
    loading,
    addTransaction,
    toggleReviewed,
    toggleCalculator,
    deleteTransaction,
    importingTxn,
    getBalance, 
    calculatorTransactions,
    bankName,
    accountType,
    getAccountInfo,
    openDetail,
    setOpenDetail,
    selectedTransaction,
    setSelectedTransaction,
    applyFilters,
    filters,
    setFilters,
    filteredTransactions,
    isLoading,
    setIsLoading,
    toUpdate,
    setToUpdate,
    openUpdate,
    setOpenUpdate,
    
  };

  return (
    <ExpenseContext.Provider value={value}>
      {children}
    </ExpenseContext.Provider>
  );
}
