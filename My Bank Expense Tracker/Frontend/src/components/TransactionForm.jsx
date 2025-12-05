import { useState } from "react";

export default function TransactionForm() {

  const [form, setForm] = useState({
    title: "",
    amount: "",
    type: "expense",
    category: "food",
    note: ""
  });

  const handleChange = (e) => {
    setForm(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    console.log("TX SUBMITTED:", form);

    // later replace console log with context action

    setForm({
      title: "",
      amount: "",
      type: "expense",
      category: "food",
      note: ""
    });
  };


  return (
    <div
      className="
        bg-white
        shadow-xl
        border border-black/10
        rounded-[14px]
        p-6
        space-y-4
        flex flex-col gap-2
      "
    >
      {/* HEADER */}
      <header className="text-base text-[#1e2939]">
        Add New Transaction
      </header>

      {/* CONTENT */}
      <div className="space-y-4">

        {/* PART 1 */}
        <div className="grid grid-cols-2 gap-[10px]">

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-800">
              Transaction Name
            </label>

            <input
              type="text"
              placeholder="e.g., Grocery Shopping"
              required
              className=" bg-gray-50
                h-[36px]
                rounded-lg
                border border-black/10
                px-[10px]
                outline-none
                text-sm
                focus:border-indigo-400
              "
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-800">
              Amount (₹)
            </label>

            <input
              type="number"
              placeholder="0.00"
              required
              className=" bg-gray-50
                h-[36px]
                rounded-lg
                border border-black/10
                px-[10px]
                outline-none
                text-sm
                focus:border-indigo-400
              "
            />
          </div>

        </div>

        {/* PART 2 */}
        <div className="flex flex-col gap-1">

          <label className="text-sm font-medium text-gray-800">
            Recipient/Sender (Optional)
          </label>

          <input
            type="text"
            placeholder="e.g., Thakur Naayi"
            className=" bg-gray-50
              h-[36px]
              rounded-lg
              border border-black/10
              px-[10px]
              outline-none
              text-sm
              focus:border-indigo-400
            "
          />

        </div>

        {/* PART 3 */}
        <div className="grid grid-cols-2 gap-[10px]">

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-800">
              Type
            </label>

            <select
              className=" bg-gray-50
                h-[36px]
                rounded-lg
                border border-black/10
                px-[10px]
                text-sm
                outline-none
                focus:border-indigo-400
              "
              defaultValue="Expense"
            >
              <option value="Expense">Expense</option>
              <option value="Income">Income</option>
            </select>
          </div>


          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-800">
              Category
            </label>

            <select
              className=" bg-gray-50
                h-[36px]
                rounded-lg
                border border-black/10
                px-[10px]
                text-sm
                outline-none
                focus:border-indigo-400
              "
              defaultValue="Food"
            >
              <option value="Food">Food</option>
              <option value="Travel">Travel</option>
              <option value="Shopping">Shopping</option>
              <option value="Bills">Bills</option>
              <option value="Others">Others</option>
            </select>
          </div>

        </div>

        {/* PART 4 */}
        <div className="flex flex-col gap-1">

          <label className="text-sm font-medium text-gray-800">
            Description (Optional)
          </label>

          <textarea
            placeholder="Add notes or details about this transaction..."
            className="
               bg-gray-50
              min-h-[80px]
              rounded-lg
              border border-black/10
              px-[10px] py-2
              text-sm
              resize-none
              outline-none
              focus:border-indigo-400
            "
          />

        </div>

        {/* PART 5 */}
        <div className="flex items-center gap-2">

          <input
            type="checkbox"
            className="accent-indigo-500"
          />

          <label className="text-sm font-medium text-gray-800">
            Online (UPI)
          </label>

        </div>

        {/* PART 6 */}
        <div className="flex w-full">

          <button
            className="
              flex items-center justify-center gap-3 w-full
              px-4 py-2
              text-sm font-medium
              text-white
              rounded-lg
              bg-linear-to-r from-indigo-600 to-pink-600
              hover:scale-101
              transition
              duration-300
              ease-in-out
              shadow-md
              cursor-pointer
            "
          >
            <svg xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M5 12h14" />
              <path d="M12 5v14" />
            </svg>

            <p>Add Transaction</p>
          </button>

        </div>

      </div>
    </div>
  );
}
