import { useAccount } from "../context/ExpenseContext";
export default function StatsSection() {
  const {totalIncome, totalExpense, balance} = useAccount();
  return (
    <div className="grid grid-cols-3 gap-3 mt-10">

      <StatCard
        title="Total Income (last 30days)"
        amount={parseFloat(totalIncome.toFixed(2))}
        bgColor="bg-gradient-to-br from-[#f0fdf4] to-[#ecfdf5] border border-[#b9f8cf]"
        amountColor="text-[#0d542b]"
        titleColor="text-[#008236]"
        svg={<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
          fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
          strokeLinejoin="round"
          className=" h-6 w-6 text-green-600 "
          aria-hidden="true">
          <path d="M16 7h6v6"></path>
          <path d="m22 7-8.5 8.5-5-5L2 17"></path>
      </svg>}
        svgColor=" bg-[#00c95133]"
      />

      <StatCard
        title="Total Spent (last 30days)"
        amount={parseFloat(totalExpense.toFixed(2))}
        bgColor="bg-gradient-to-br from-[#fef2f2] to-[#fdf2f8] border border-[#ffc9c9]"
        amountColor="text-[#82181a]"
        titleColor="text-[#c10007]"
        svg={ <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
           strokeLinejoin="round"
        className=" h-6 w-6 text-red-600 "
        aria-hidden="true">
       <path d="M16 17h6v-6"></path>
       <path d="m22 17-8.5-8.5-5 5L2 7"></path>
                            </svg>}
        svgColor=" bg-[#fb2c3633]"
      />

      <StatCard
        title="Net Balance"
        amount={parseFloat(balance)}
        bgColor="bg-gradient-to-br from-[#eff6ff] to-[#eef2ff] border border-[#bedbff]"
        amountColor="text-[#1c398e]"
        titleColor="text-[#1447e6]"
        svg={ <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
         fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                                strokeLinejoin="round"
   className=" h-6 w-6 text-blue-600 "
          aria-hidden="true">
                                <path
                d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1">
       </path>
             <path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"></path>
   </svg>}
        svgColor=" bg-[#2b7fff33]"
      />

    </div>
  );
}


function StatCard({ title, amount, bgColor, svg, svgColor, titleColor, amountColor }) {


  return (

    <li
      className={`
        p-6
        flex items-center justify-between
        w-full bg-white
        rounded-xl shadow-md hover:shadow-lg hover:scale-102 transition duration-300 ease-in-out ${bgColor}
      `}
    >

      {/* LEFT CONTENT */}
      <div className="flex flex-col gap-[2px]">
        <p className={`text-sm ${titleColor}`}>
          {title}
        </p>

        <h3 className={`text-base ${amountColor}`}>
          ₹{amount}
        </h3>
      </div>


      {/* RIGHT ICON */}
      <div className={`flex items-center justify-center rounded-full size-12 ${svgColor}`}>

        {svg}

      </div>

    </li>

  );
}
