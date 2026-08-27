import { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';

const ExpenseContext = createContext(null);

export const useAccount = () => {
  const context = useContext(ExpenseContext);
  if (!context) {
    throw new Error('useAccount must be used within an ExpenseProvider');
  }
  return context;
};

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

export function ExpenseProvider({ children }) {
  // Theme state (Permanent Dark Mode)
  const [theme] = useState('dark');

  // Auth state
  const [token, setToken] = useState(() => localStorage.getItem('expense_token') || '');
  const [isAuthenticated, setIsAuthenticated] = useState(() => Boolean(localStorage.getItem('expense_token')));
  const [authChecking, setAuthChecking] = useState(true);

  // User and Account states
  const [user, setUser] = useState({ name: 'Himanshu Singh', email: 'personal@expense.local' });
  const [account, setAccount] = useState({
    bankName: 'State Bank of India',
    accountType: 'Savings Account',
    accountNumber: '',
    parserPreset: 'sbi',
    currentBalance: 0,
    lastSyncedAt: null,
  });

  // Transactions states
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Client-Side Calculator Selected IDs
  const [calculatorIds, setCalculatorIds] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('expense_calc_ids')) || [];
    } catch {
      return [];
    }
  });

  // Modals state
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [openDetail, setOpenDetail] = useState(false);
  const [toUpdate, setToUpdate] = useState(null);
  const [openUpdate, setOpenUpdate] = useState(false);

  // Filter states
  const [filters, setFilters] = useState({
    search: '',
    category: 'all',
    type: 'all',
  });

  // Pagination states (20 transactions per page)
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Reset to page 1 whenever filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  // Enforce Dark Theme
  useEffect(() => {
    document.documentElement.classList.add('dark');
    localStorage.setItem('expense_theme', 'dark');
  }, []);

  // Persist Calculator selection locally
  useEffect(() => {
    localStorage.setItem('expense_calc_ids', JSON.stringify(calculatorIds));
  }, [calculatorIds]);

  // Authenticated Fetch Helper
  const authFetch = useCallback(
    async (endpoint, options = {}) => {
      const currentToken = token || localStorage.getItem('expense_token');
      const headers = {
        'Content-Type': 'application/json',
        ...(currentToken ? { Authorization: `Bearer ${currentToken}` } : {}),
        ...options.headers,
      };

      const res = await fetch(`${BACKEND_URL}${endpoint}`, {
        ...options,
        headers,
      });

      if (res.status === 401) {
        logout();
        throw new Error('Unauthorized');
      }

      return res;
    },
    [token]
  );

  // Authentication Actions
  const login = async (pin) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      });

      const data = await res.json();

      if (!res.ok) {
        return { success: false, message: data.message || 'Login failed' };
      }

      localStorage.setItem('expense_token', data.token);
      setToken(data.token);
      setIsAuthenticated(true);
      if (data.user) setUser(data.user);

      return { success: true };
    } catch (err) {
      console.error('Login error:', err);
      return { success: false, message: 'Could not connect to server' };
    }
  };

  const logout = () => {
    localStorage.removeItem('expense_token');
    setToken('');
    setIsAuthenticated(false);
    setTransactions([]);
    setCalculatorIds([]);
  };

  // Verify auth on mount
  useEffect(() => {
    async function verifyAuth() {
      const savedToken = localStorage.getItem('expense_token');
      if (!savedToken) {
        setIsAuthenticated(false);
        setAuthChecking(false);
        return;
      }

      try {
        const res = await fetch(`${BACKEND_URL}/api/auth/verify`, {
          headers: { Authorization: `Bearer ${savedToken}` },
        });

        if (res.ok) {
          const data = await res.json();
          if (data.user) setUser(data.user);
          setIsAuthenticated(true);
        } else {
          logout();
        }
      } catch {
        setIsAuthenticated(Boolean(savedToken));
      } finally {
        setAuthChecking(false);
      }
    }

    verifyAuth();
  }, []);

  // Fetch all initial data once authenticated
  const loadDashboardData = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoading(true);

    try {
      // 1. Fetch Account Info & Balance
      const [accRes, meRes, txnRes] = await Promise.all([
        authFetch('/api/accounts/account'),
        authFetch('/api/me'),
        authFetch('/api/transactions'),
      ]);

      if (accRes.ok) {
        const accData = await accRes.json();
        setAccount({
          bankName: accData.bankName || 'State Bank of India',
          accountType: accData.accountType || 'Savings Account',
          accountNumber: accData.accountNumber || '',
          parserPreset: accData.parserPreset || 'sbi',
          currentBalance: Number(accData.currentBalance || 0),
          lastSyncedAt: accData.lastSyncedAt,
        });
      }

      if (meRes.ok) {
        const meData = await meRes.json();
        setUser(meData);
      }

      if (txnRes.ok) {
        const txnData = await txnRes.json();
        setTransactions(Array.isArray(txnData) ? txnData : []);
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, authFetch]);

  useEffect(() => {
    if (isAuthenticated) {
      loadDashboardData();
    }
  }, [isAuthenticated, loadDashboardData]);

  // Compute 30-day stats
  const stats = useMemo(() => {
    let income = 0;
    let expense = 0;
    const now = new Date();
    const thirtyDaysAgo = new Date(now.setDate(now.getDate() - 30));

    transactions.forEach((txn) => {
      const txnDate = new Date(txn.date || txn.createdAt);
      if (txnDate >= thirtyDaysAgo) {
        const amt = Number(txn.amount) || 0;
        if (txn.isExpense) {
          expense += amt;
        } else {
          income += amt;
        }
      }
    });

    return { totalIncome: income, totalExpense: expense };
  }, [transactions]);

  // Filtered transactions for UI (Strictly LATEST FIRST)
  const filteredTransactions = useMemo(() => {
    const list = transactions.filter((txn) => {
      // Search text filter
      if (filters.search) {
        const query = filters.search.toLowerCase().trim();
        const titleMatch = (txn.title || '').toLowerCase().includes(query);
        const recipientMatch = (txn.recipient || '').toLowerCase().includes(query);
        const descMatch = (txn.description || '').toLowerCase().includes(query);
        const catMatch = (txn.category || '').toLowerCase().includes(query);
        if (!titleMatch && !recipientMatch && !descMatch && !catMatch) return false;
      }

      // Category filter
      if (filters.category && filters.category !== 'all') {
        const txnCat = (txn.category || '').toLowerCase();
        const filterCat = filters.category.toLowerCase();
        if (filterCat === 'other' || filterCat === 'others') {
          if (txnCat !== 'other' && txnCat !== 'others') return false;
        } else if (txnCat !== filterCat) {
          return false;
        }
      }

      // Type filters
      if (filters.type === 'expense' && !txn.isExpense) return false;
      if (filters.type === 'income' && txn.isExpense) return false;
      if (filters.type === 'reviewed' && !txn.reviewed) return false;
      if (filters.type === 'pending' && txn.reviewed) return false;
      if (filters.type === 'upi only' && !txn.isOnline) return false;
      if (filters.type === 'cash only' && txn.isOnline) return false;

      return true;
    });

    // Strictly sort LATEST FIRST (Descending order by Date and Creation timestamp)
    return list.sort((a, b) => {
      const dateA = new Date(a.date || a.createdAt || 0).getTime() || 0;
      const dateB = new Date(b.date || b.createdAt || 0).getTime() || 0;
      if (dateB !== dateA) return dateB - dateA;
      const createA = new Date(a.createdAt || 0).getTime() || 0;
      const createB = new Date(b.createdAt || 0).getTime() || 0;
      return createB - createA;
    });
  }, [transactions, filters]);


  // Pagination calculation
  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(filteredTransactions.length / itemsPerPage));
  }, [filteredTransactions.length, itemsPerPage]);

  const paginatedTransactions = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredTransactions.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredTransactions, currentPage, itemsPerPage]);

  // Ensure current page does not exceed totalPages when filtered list shrinks
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  // Calculator Active Transactions
  const calculatorTransactions = useMemo(() => {
    const idSet = new Set(calculatorIds);
    return transactions.filter((t) => idSet.has(t._id));
  }, [transactions, calculatorIds]);

  const toggleCalculator = (id) => {
    setCalculatorIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  };

  const clearCalculator = () => {
    setCalculatorIds([]);
  };

  // Transaction Operations
  const addTransaction = async (formData) => {
    try {
      setIsSyncing(true);
      const res = await authFetch('/api/transactions', {
        method: 'POST',
        body: JSON.stringify(formData),
      });

      if (!res.ok) throw new Error('Failed to create transaction');

      const savedTxn = await res.json();

      setTransactions((prev) => [savedTxn, ...prev]);
      const delta = savedTxn.isExpense ? -savedTxn.amount : savedTxn.amount;
      setAccount((prev) => ({
        ...prev,
        currentBalance: prev.currentBalance + delta,
      }));

      return { success: true, transaction: savedTxn };
    } catch (err) {
      console.error('Failed to add transaction:', err);
      return { success: false, message: err.message };
    } finally {
      setIsSyncing(false);
    }
  };

  // Bulk Add Transactions (Optimized CSV/Excel import in 1 call)
  const bulkAddTransactions = async (transactionsArray, closingBalance) => {
    try {
      setIsSyncing(true);
      const res = await authFetch('/api/transactions/bulk', {
        method: 'POST',
        body: JSON.stringify({
          transactions: transactionsArray,
          closingBalance: typeof closingBalance === 'number' && !isNaN(closingBalance) ? closingBalance : undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.message || 'Failed to bulk import transactions');

      // Refresh dashboard data seamlessly
      await loadDashboardData();

      return { success: true, count: data.count || transactionsArray.length };
    } catch (err) {
      console.error('Bulk add error:', err);
      return { success: false, message: err.message };
    } finally {
      setIsSyncing(false);
    }
  };

  const updateTransaction = async (id, updatePayload) => {
    try {
      setIsSyncing(true);
      const prevTxn = transactions.find((t) => t._id === id);

      const res = await authFetch(`/api/transactions/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(updatePayload),
      });


      if (!res.ok) throw new Error('Failed to update transaction');

      const updated = await res.json();

      setTransactions((prev) => {
        if (prevTxn && updatePayload.amount !== undefined) {
          const oldSigned = prevTxn.isExpense ? -prevTxn.amount : prevTxn.amount;
          const newSigned = updated.isExpense ? -updated.amount : updated.amount;
          const balanceDiff = newSigned - oldSigned;

          if (balanceDiff !== 0) {
            setAccount((acc) => ({
              ...acc,
              currentBalance: acc.currentBalance + balanceDiff,
            }));
          }
        }
        return prev.map((t) => (t._id === id ? updated : t));
      });

      return { success: true, transaction: updated };
    } catch (err) {
      console.error('Update transaction error:', err);
      return { success: false, message: err.message };
    } finally {
      setIsSyncing(false);
    }
  };

  const deleteTransaction = async (id) => {
    const ok = window.confirm('Are you sure you want to delete this transaction?');
    if (!ok) return;

    try {
      setIsSyncing(true);
      const targetTxn = transactions.find((t) => t._id === id);

      const res = await authFetch(`/api/transactions/${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error('Failed to delete transaction');

      setTransactions((prev) => prev.filter((t) => t._id !== id));
      if (targetTxn) {
        const change = targetTxn.isExpense ? targetTxn.amount : -targetTxn.amount;
        setAccount((prev) => ({
          ...prev,
          currentBalance: prev.currentBalance + change,
        }));
      }

      setCalculatorIds((prev) => prev.filter((i) => i !== id));
    } catch (err) {
      console.error('Delete transaction error:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  const toggleReviewed = (id, currentVal) => {
    updateTransaction(id, { reviewed: !currentVal });
  };

  const updateAccountBalance = async (newBalance) => {
    try {
      setIsSyncing(true);
      const res = await authFetch('/api/accounts/balance', {
        method: 'PATCH',
        body: JSON.stringify({ balance: Number(newBalance) }),
      });

      if (res.ok) {
        const data = await res.json();
        setAccount((prev) => ({
          ...prev,
          currentBalance: data.currentBalance,
          lastSyncedAt: data.lastSyncedAt,
        }));
      }
    } catch (err) {
      console.error('Failed to update balance:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  const updateAccountInfo = async (updates) => {
    try {
      setIsSyncing(true);
      const payload = typeof updates === 'object' ? updates : { bankName: updates };
      const res = await authFetch('/api/accounts/info', {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        setAccount((prev) => ({
          ...prev,
          bankName: data.bankName,
          accountType: data.accountType,
          parserPreset: data.parserPreset || 'sbi',
          accountNumber: data.accountNumber || '',
        }));
      }
    } catch (err) {
      console.error('Failed to update account info:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  const value = {
    // Theme
    theme,

    // Auth
    isAuthenticated,
    authChecking,
    login,
    logout,

    // User & Account
    user,
    account,
    balance: account.currentBalance,
    bankName: account.bankName,
    accountType: account.accountType,
    accountNumber: account.accountNumber,
    parserPreset: account.parserPreset || 'sbi',
    lastSyncedAt: account.lastSyncedAt,
    updateAccountBalance,
    updateAccountInfo,
    loadDashboardData,

    // Stats
    totalIncome: stats.totalIncome,
    totalExpense: stats.totalExpense,

    // Transactions & Pagination (20 items per page)
    transactions,
    filteredTransactions,
    paginatedTransactions,
    currentPage,
    setCurrentPage,
    itemsPerPage,
    totalPages,
    loading,
    isSyncing,
    addTransaction,
    bulkAddTransactions,
    updateTransaction,
    deleteTransaction,
    toggleReviewed,

    // Calculator (Client-side)
    calculatorIds,
    calculatorTransactions,
    toggleCalculator,
    clearCalculator,

    // Filters
    filters,
    setFilters,

    // Modals
    selectedTransaction,
    setSelectedTransaction,
    openDetail,
    setOpenDetail,
    toUpdate,
    setToUpdate,
    openUpdate,
    setOpenUpdate,
  };

  return <ExpenseContext.Provider value={value}>{children}</ExpenseContext.Provider>;
}
