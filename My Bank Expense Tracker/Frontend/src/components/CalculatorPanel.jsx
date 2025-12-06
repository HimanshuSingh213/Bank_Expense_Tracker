export default function Calculator() {
  return (
    <div className="flex flex-col gap-6 rounded-xl border p-6 bg-linear-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30 border-indigo-200 dark:border-indigo-800 shadow-lg">

      {/* HEADER */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            className=" h-5 w-5 text-indigo-600 "
            aria-hidden="true">
            <rect width="16" height="20" x="4" y="2" rx="2"></rect>
            <line x1="8" x2="16" y1="6" y2="6"></line>
            <line x1="16" x2="16" y1="14" y2="18"></line>
            <path d="M16 10h.01"></path>
            <path d="M12 10h.01"></path>
            <path d="M8 10h.01"></path>
            <path d="M12 14h.01"></path>
            <path d="M8 14h.01"></path>
            <path d="M12 18h.01"></path>
            <path d="M8 18h.01"></path>
          </svg>
          <h4 className="font-normal">
            Personal Calculator
          </h4>
        </div>

        <button className="text-sm px-2 py-1
                           rounded-md
                           border border-black/10
                           hover:bg-slate-200 transition">
          Clear All
        </button>

      </div>


      {/* LIST */}
      <div className="max-h-[200px]  space-y-3">

        <CalcRow title="Zomato order" date="6 Dec 2025" amount="-₹450" />
        <CalcRow title="Monthly salary" date="6 Dec 2025" amount="+₹30,000" />
        <CalcRow title="Credit card bill" date="6 Dec 2025" amount="-₹7,200" />

      </div>


      {/* FOOTER */}
      <div className="space-y-2 pt-4 border-t border-indigo-200 dark:border-indigo-800">

        <FooterRow label="Total Income" value="₹30,000" income />
        <FooterRow label="Total Expense" value="₹7,650" />
        <div className="flex items-center justify-between pt-2 border-t border-indigo-200 dark:border-indigo-800">
          <span className="text-gray-800 dark:text-gray-200">Net Amount:</span>
          <span className="text-red-600">₹-3500.00</span>
        </div>
        <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
          <span>Selected Transactions:</span>
          <span className="inline-flex items-center justify-center rounded-md border border-gray-300 px-2 py-0.5 text-xs text-gray-800 font-medium whitespace-nowrap gap-1 overflow-hidden">
            1
          </span>
        </div>

      </div>

    </div>
  );
}


function CalcRow({ title, amount, date }) {
  return (
    <div className=" overflow-y-auto gap-1
                    flex items-center justify-between p-2 bg-white  rounded-lg
                    ">

      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-900 truncate">
          {title}
        </p>
        <p className="text-xs text-gray-500">
          {date}
        </p>
      </div>

      <div className="flex gap-2 items-center justify-end">
        <span
          className={`font-normal text-sm ${amount.startsWith("-")
            ? "text-red-600"
            : "text-green-600"
            }`}
        >
          {amount}
        </span>

        <button className="size-6 flex items-center justify-center p-1 rounded-md hover:bg-gray-100 transition">
          <svg className="size-4 text-black"
            xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
            fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            aria-hidden="true" stroke="currentColor">
            <path d="M18 6 6 18"></path>
            <path d="m6 6 12 12"></path>
          </svg>
        </button>
      </div>

    </div>
  );
}

function FooterRow({ label, value, income }) {
  return (
    <div className="flex justify-between items-center">
      <p className="text-sm text-gray-600 dark:text-gray-400">
        {label}
      </p>

      <span
        className={` ${income ? "text-green-600" : "text-red-600"}`}
      >
        {value}
      </span>
    </div>
  );
}
