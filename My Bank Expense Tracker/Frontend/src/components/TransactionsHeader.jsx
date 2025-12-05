import { useState } from "react";

export default function TransactionsHeader() {

  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [category, setCategory] = useState("all");

  return (
    <div className="mt-10">

      {/* HEADER */}
      <div className="flex justify-between items-center">

        <h4 className="font-semibold">
          Recent Transactions
        </h4>

        <span className="text-sm text-slate-500">
          Showing results
        </span>

      </div>


      {/* FILTER SECTION */}
      <div className="mt-4 space-y-3">

        {/* SEARCH */}
        <div className="relative">

          <input
            type="text"
            placeholder="Search transaction..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="
              w-full h-9
              rounded-xl
              border border-black/10
              pl-9 pr-3
              outline-none
            "
          />

          {/* SEARCH ICON */}
          <svg xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="black"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="absolute left-3 top-[9px] h-4"
          >
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>

        </div>


        {/* FILTER BUTTONS */}
        <div className="flex items-center gap-3 flex-wrap">

          {["all", "expense", "income"].map(type => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`
                border border-black/10
                rounded-lg px-3 py-1
                text-xs capitalize
                transition
                ${filterType === type
                  ? "bg-black text-white"
                  : "bg-white hover:bg-slate-100"}
              `}
            >
              {type}
            </button>
          ))}


          {/* CATEGORY */}
          <div className="ml-auto flex items-center gap-2">

            <span className="text-xs text-slate-500">
              Category:
            </span>

            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="text-xs px-2 py-1
                         border border-black/10
                         rounded-lg"
            >
              <option value="all">All</option>
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
