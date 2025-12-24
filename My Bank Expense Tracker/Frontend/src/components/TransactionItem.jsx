import { useAccount } from "../context/ExpenseContext";

export default function TransactionItem({
  id,
  title,
  category,
  date,
  amount,
  recipient,
  isExpense,
  hasDescription,
  isOnline,
  checked1,
  checked2,
}) {

  const { toggleReviewed, toggleCalculator, deleteTransaction } = useAccount();


  const categoryVariants = {
    Food: "text-[#008236] bg-[#00c9511a] border border-[#00c95133]",
    Travel: "text-[#ca3500] bg-[#ff69001a] border border-[#ff690033]",
    Shopping: "text-[#8200db] bg-[#ad46ff1a] border border-[#ad46ff33]",
    Bills: "text-[#1447e6] bg-[#2b7fff1a] border border-[#2b7fff33]",
    Others: "text-[#364153] bg-[#6a72821a] border border-[#6a728233]",
  };

  return (
    <div className={`
      grid grid-cols-[40px_1fr_auto_auto]
      gap-3 items-center
      border border-black/10
      rounded-xl
      p-4
      transition duration-300 ease-in-out hover:scale-101 hover:shadow-lg
      ${checked1 ? "bg-gray-50" : "bg-white"}
      ${checked2 ? "ring-2 ring-indigo-500" : ""}
      
    `}>

      {/* CHECKBOX */}
      <div className="flex gap-2 items-center justify-center">
        <button onClick={() => toggleReviewed(id, checked1)}
          className={`checkbox1 size-4 border shadow-sm rounded-sm transition duration-300 ease-in-out flex items-center justify-center cursor-pointer ${checked1 ? "bg-[#030213] text-white border-[#030213]" : "border-black/90 bg-white"}`}>
          <svg className={`${checked1 ? "block" : "hidden"}`}
            xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
            strokeLinejoin="round">
            <path d="M20 6 9 17l-5-5"></path>
          </svg>
        </button>
        <button onClick={() => toggleCalculator(id, checked2)}
          className={`checkbox1 size-4 border shadow-sm rounded-sm transition duration-300 ease-in-out flex items-center justify-center cursor-pointer ${checked2 ? "bg-[#615fff] text-white border-[#030213]" : "border-[#615fff] bg-[#f3f3f5]"}`}>
          <svg className={`${checked2 ? "block" : "hidden"}`}
            xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
            strokeLinejoin="round">
            <path d="M20 6 9 17l-5-5"></path>
          </svg>
        </button>
      </div>

      {/* MAIN INFO */}
      <div>
        <div className="flex gap-2 items-center">
          <p className={`text-sm font-medium transition truncate duration-300 ease-in-out ${checked1 ? "line-through text-gray-500" : ""}`}>
            {title}
          </p>
          <svg className={`text-[#6a7282] ${isOnline? "hidden" : "block"}`}
            xmlns="http://www.w3.org/2000/svg" width="12" height="12"
            viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round"
            strokeLinejoin="round" aria-hidden="true" stroke="CurrentColor">
            <rect width="20" height="12" x="2" y="6" rx="2"></rect>
            <circle cx="12" cy="12" r="2"></circle>
            <path d="M6 12h.01M18 12h.01"></path>
          </svg>
          <svg className={`text-[#2b7fff] ${isOnline? "block" : "hidden"}`}
            xmlns="http://www.w3.org/2000/svg" width="12" height="12"
            viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round"
            strokeLinejoin="round" aria-hidden="true" stroke="CurrentColor">
            <rect width="20" height="14" x="2" y="5" rx="2"></rect>
            <line x1="2" x2="22" y1="10" y2="10"></line>
          </svg>
          <svg className={`text-[#9810fa] ${hasDescription? "block" : "hidden"}`}
            xmlns="http://www.w3.org/2000/svg" width="12" height="12"
            viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round"
            strokeLinejoin="round" aria-hidden="true" stroke="CurrentColor">
            <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"></path>
            <path d="M14 2v4a2 2 0 0 0 2 2h4"></path>
            <path d="M10 9H8"></path>
            <path d="M16 13H8"></path>
            <path d="M16 17H8"></path>
          </svg>
        </div>


        <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">

          <span className={`
            border font-medium text-xs
            px-2 py-0.5
            rounded-lg 
            ${categoryVariants[category]? categoryVariants[category]: ""}}
          `}>
          {category}
          </span>
          <span>
            {date}
          </span>

          <span className={`truncate ${recipient !== "" ? "block" : "hidden"}`}>
          • {recipient}
          </span>

        </div>
      </div>



      {/* ACTIONS */}
      <div className="flex items-center gap-2.5">

        {/* AMOUNT */}
        <span
          className={`cursor-default text-base ${isExpense ? "text-red-600" : "text-green-600"
            }`}
        >
          {isExpense ? "-" : "+"}₹{parseFloat(Number(amount).toFixed(2))}
        </span>


        <button className="flex items-center justify-center text-sm size-8  rounded-md hover:scale-110 transition duration-300 ease-in-out hover:bg-blue-100">
          <svg className="size-4 text-blue-600"
            xmlns="http://www.w3.org/2000/svg" width="16" height="16"
            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path
              d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z">
            </path>
          </svg>
        </button>

        <button onClick={() => deleteTransaction(id)}
        className="flex items-center justify-center text-sm size-8 rounded-md hover:scale-110 transition duration-300 ease-in-out hover:bg-red-100">
          <svg className="size-4 text-red-600"
            xmlns="http://www.w3.org/2000/svg" width="16" height="16"
            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M10 11v6"></path>
            <path d="M14 11v6"></path>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"></path>
            <path d="M3 6h18"></path>
            <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
        </button>

      </div>

    </div>
  );
}
