export default function ImportCSV() {
  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    console.log("CSV Selected:", file.name);
    // later you connect your real parsing logic here
  };

  return (
    <div className="flex justify-end mt-5">

      <label className="flex items-center gap-3 bg-[#f8f8f8] border border-black/10 px-4 py-2 rounded-xl cursor-pointer hover:bg-[#efefef] hover:scale-102 transition duration-300 ease-in-out">

        {/* ICON */}
        <svg xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="black"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-[18px]"
        >
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="7 10 12 15 17 10"/>
          <line x1="12" y1="15" x2="12" y2="3"/>
        </svg>

        {/* TEXT */}
        <span className="text-sm font-medium text-slate-800">
          Import CSV
        </span>

        {/* FILE INPUT */}
        <input
          type="file"
          accept=".csv"
          onChange={handleFile}
          className="hidden"
        />
      </label>

    </div>
  );
}
