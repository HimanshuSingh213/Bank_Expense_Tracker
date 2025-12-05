import { createContext, useContext, useEffect, useState } from "react";

const ExpenseContext = createContext(null);

export const useAccount = () => {
  return useContext(ExpenseContext);
};

export function ExpenseProvider({ children }) {
  const [theme, setTheme] = useState("light"); // "light" | "dark"
  const [user, setUser] = useState("Himanshu");

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") root.classList.add("dark");
    else root.classList.remove("dark");
  }, [theme]);

  const value = {
    theme,
    setTheme,
    user,
    setUser,
  };

  return (
    <ExpenseContext.Provider value={value}>
      {children}
    </ExpenseContext.Provider>
  );
}
