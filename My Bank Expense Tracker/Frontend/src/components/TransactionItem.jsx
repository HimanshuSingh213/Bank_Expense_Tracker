import { useState } from "react";

export default function TransactionItem({
  title = "Zomato Order",
  category = "Food",
  date = "10 Sep 2025",
  amount = -450
}) {

  const [checked, setChecked] = useState(false);

  return (
    <div className={`
      grid grid-cols-[30px_1fr_auto_auto]
      gap-3 items-center
      bg-white border border-black/10
      rounded-[14px]
      px-4 py-3
      transition
      ${checked ? "bg-slate-100" : ""}
    `}>

      {/* CHECKBOX */}
      <input
        type="checkbox"
        checked={checked}
        onChange={() => setChecked(!checked)}
      />


      {/* MAIN INFO */}
      <div>
        <p className="text-sm font-medium">
          {title}
        </p>

        <div className="flex gap-2 mt-1 text-[11px] text-slate-500">

          <span className="
            bg-indigo-50
            px-2 py-0.5
            rounded-full
          ">
            {category}
          </span>

          <span>
            {date}
          </span>

        </div>
      </div>


      {/* AMOUNT */}
      <span
        className={`font-semibold text-sm ${
          amount < 0 ? "text-rose-500" : "text-emerald-600"
        }`}
      >
        {amount < 0 ? "-" : "+"}₹{Math.abs(amount)}
      </span>


      {/* ACTIONS */}
      <div className="flex gap-1">

        <button className="p-1 hover:bg-slate-100 rounded-md">
          ✏️
        </button>

        <button className="p-1 hover:bg-slate-100 rounded-md">
          🗑️
        </button>

      </div>

    </div>
  );
}
