export default function Calculator() {
  return (
    <div className="bg-indigo-50 border border-black/10
                    rounded-[16px]
                    p-5 mt-8">

      {/* HEADER */}
      <div className="flex items-center justify-between mb-4">

        <h4 className="font-semibold">
          Personal Calculator
        </h4>

        <button className="text-xs px-2 py-1
                           rounded-md
                           border border-black/10
                           hover:bg-slate-100 transition">
          Clear
        </button>

      </div>


      {/* LIST */}
      <div className="max-h-[260px] overflow-y-auto space-y-2">

        <CalcRow title="Zomato order" amount="-₹450" />
        <CalcRow title="Monthly salary" amount="+₹30,000" />
        <CalcRow title="Credit card bill" amount="-₹7,200" />

      </div>


      {/* FOOTER */}
      <div className="border-t border-black/15 pt-3 mt-3 space-y-1 text-sm">

        <FooterRow label="Total Income" value="₹30,000" />
        <FooterRow label="Total Expense" value="₹7,650" />
        <FooterRow
          label="Net Amount"
          value="+₹22,350"
          highlight
        />

      </div>

    </div>
  );
}


function CalcRow({ title, amount }) {
  return (
    <div className="bg-white
                    border border-black/10
                    rounded-lg
                    px-3 py-2
                    flex justify-between items-center">

      <p className="text-sm">
        {title}
      </p>

      <span
        className={`font-semibold ${
          amount.startsWith("-")
            ? "text-rose-500"
            : "text-emerald-600"
        }`}
      >
        {amount}
      </span>

    </div>
  );
}

function FooterRow({ label, value, highlight }) {
  return (
    <div className="flex justify-between items-center">
      <p className="text-xs text-slate-500">
        {label}
      </p>

      <span
        className={`font-semibold ${
          highlight ? "text-indigo-600" : ""
        }`}
      >
        {value}
      </span>
    </div>
  );
}
