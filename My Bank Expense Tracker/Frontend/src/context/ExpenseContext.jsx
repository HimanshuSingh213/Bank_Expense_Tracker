import { createContext, useContext, useEffect, useState } from "react";

const ExpenseContext = createContext(null);

export const useAccount = () => {
  return useContext(ExpenseContext);
};

export function ExpenseProvider({ children }) {
  const [theme, setTheme] = useState("light"); // "light" | "dark"
  const [userId, setUserId] = useState("Himanshu");

  // Transaction states
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  // stats states
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpense, setTotalExpense] = useState(0);
  const [balance, setBalance] = useState(0);

  // function findDate() {
  //   const today = new Date();

  //   const day = today.toLocaleString('en-GB', { day: 'numeric' });
  //   const month = today.toLocaleString('en-GB', { month: 'short' });
  //   const year = today.toLocaleString('en-GB', { year: 'numeric' });

  //   const formattedDate = `${day} ${month} ${year}`;

  //   return formattedDate;
  // }

  // function addTransaction(name, amount, isExpense, recipient, category, description, isOnline) {
  //   if (!name || !amount || !category) return;

  //   setTransactions((prev) => [
  //     {
  //       id: Date.now(),
  //       name: name,
  //       amount: amount,
  //       isExpense: isExpense,
  //       recipient: recipient,
  //       category: category,
  //       description: description,
  //       isOnline: isOnline,
  //       date: findDate(),
  //     }
  //     , ...prev]);


  // }

  async function getUserTransactions() {
    try {
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/transactions/${userId}`)
      const finalData = await res.json();
      setTransactions(finalData.reverse());

    }
    catch (err) {
      console.error("Failed to load transaction:", err)
    }
    finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    getUserTransactions();
  }, [userId]);

  useEffect(() => {
    let income = 0;
    let expense = 0;

    transactions.forEach((t) => {
      if (t.isExpense) {
        expense += Number(t.amount);
      } else {
        income += Number(t.amount);
      }
    });

    setTotalIncome(income);
    setTotalExpense(expense);

    if (transactions.length > 0) {
      setBalance(transactions[0].balance);
    }
    else {
      setBalance(0);
    }

  }, [transactions]);

  async function deleteTransaction(id) {

    const ok = confirm("Are you sure you want to delete this Transaction?");

    if (!ok) return;
    else {
      try {
        await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/transactions/${id}`, {
          method: "DELETE"
        })

        await getUserTransactions();

      }
      catch (err) {
        console.error("Failed to delete transaction:", err);
      }

    }
  }

  async function addTransaction(formData) {
    try {
      // CSV import (in array)
      if (Array.isArray(formData)) {

        for (const txn of formData) {
          const res = await fetch(
            `${import.meta.env.VITE_BACKEND_URL}/api/transactions`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                ...txn,
                userId,
              }),
            }
          );

          if (!res.ok) {
            console.error("Failed to add transaction:", txn);
          }
        }

        // fetch ONCE after full CSV import
        await getUserTransactions();
        return;
      }

      // For Single Transaction
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/transactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          userId,
        }),

      });

      const saved = await res.json();
      // setTransactions(prev => [saved, ...prev]);
      await getUserTransactions();

    } catch (err) {
      console.error("Failed to add transaction:", err);
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

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") root.classList.add("dark");
    else root.classList.remove("dark");
  }, [theme]);

  const value = {
    theme,
    setTheme,
    userId,
    setUserId,
    totalIncome,
    totalExpense,
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
  };

  return (
    <ExpenseContext.Provider value={value}>
      {children}
    </ExpenseContext.Provider>
  );
}
