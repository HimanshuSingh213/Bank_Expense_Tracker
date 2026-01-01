import { useState } from "react";
import { useAccount } from "../context/ExpenseContext";

export default function TransactionsHeader() {

  const {transactions, filters, setFilters } = useAccount();
  return (
    <div className="mt-10">

      {/* HEADER */}
      <div className="flex justify-between items-center">

        <h4 className="font-semibold">
          Recent Transactions
        </h4>

        <span className="text-sm text-slate-500">
          {transactions.length} Transactions
        </span>

      </div>


      {/* FILTER SECTION */}
      <div className="mt-4 space-y-3">

        {/* SEARCH */}
        <div className="relative">

          <input
            type="text"
            placeholder="Search transaction..."
            onChange={(e) =>
              setFilters(prev => ({ ...prev, search: e.target.value }))
            }
            className="
              w-md h-9
              rounded-lg
              border border-black/10
              pl-9 pr-3
              outline-none
              bg-gray-100
              text-sm
            "
          />

          {/* SEARCH ICON */}
          <svg
            className="absolute left-3 top-[9px] h-4 text-gray-500"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="CurrentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>

        </div>


        {/* FILTER BUTTONS */}
        <div className="flex items-center gap-3 flex-wrap h-9">
          <div className="filterLabel flex gap-2 items-center justify-center text-gray-500 text-sm">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
              fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
              strokeLinejoin="round" aria-hidden="true">
              <path
                d="M10 20a1 1 0 0 0 .553.895l2 1A1 1 0 0 0 14 21v-7a2 2 0 0 1 .517-1.341L21.74 4.67A1 1 0 0 0 21 3H3a1 1 0 0 0-.742 1.67l7.225 7.989A2 2 0 0 1 10 14z">
              </path>
            </svg>
            <p>Filter:</p>

          </div>

          {["all", "upi only", "cash only", "reviewed", "pending"].map(type => (
            <button
              key={type}
              onClick={() =>
                setFilters(prev => ({ ...prev, type: type }))
              }
              className={`
                border border-black/10
                rounded-lg px-3 py-1
                text-sm capitalize
                transition duration-400 ease-in-out hover:scale-102 h-full font-medium
                ${filters.type === type
                  ? "bg-black text-white"
                  : "bg-white hover:bg-slate-100"}
              `}
            >
              {type}
            </button>
          ))}


          {/* CATEGORY */}
          <div className=" flex items-center gap-2">

            <span className="text-sm text-slate-600">
              Category:
            </span>

            <select
              onChange={(e) =>
                setFilters(prev => ({ ...prev, category: e.target.value }))
              }              
              className="text-sm
                         border border-black/10
                         rounded-lg bg-gray-100 py-2 px-3 outline-0"
            >
              <option value="all">All Categories</option>
              <option value="food">Food</option>
              <option value="travel">Travel</option>
              <option value="shopping">Shopping</option>
              <option value="bills">Bills</option>
              <option value="other">Other</option>
            </select>

          </div>

        </div>

      </div>
    </div>
  );
}
