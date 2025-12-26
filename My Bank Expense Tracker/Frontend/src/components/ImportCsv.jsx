import Papa from "papaparse";
import { useAccount } from "../context/ExpenseContext";

export default function ImportCSV() {

  const { addTransaction, getBalance, setIsLoading } = useAccount();

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    console.log("CSV Selected:", file.name);

    Papa.parse(file, {
      skipEmptyLines: true,
      complete: async (result) => {
        setIsLoading(true);

        try {
          const data = result.data;
          console.log("FULL CSV DATA:", data);

          const metadata = data.findIndex((row) => row[1] && row[1].includes("Details"));

          if (metadata === -1) {
            console.error("Txn Date header not found");
            return;
          }

          const transactionArray = [];

          for (let i = data.length - 8; i > metadata + 1; i--) {
            const row = data[i];
            console.log(row);
            if (!row[0]) continue;

            const debit = row[3]?.replace(/,/g, "").trim();
            const credit = row[4]?.replace(/,/g, "").trim();

            console.log("Credit " + credit);
            console.log("Debit " + debit);

            if ((!debit && !credit) || (Number(debit) === 0 && Number(credit) === 0)) {
              continue;
            }

            const runningBalance = Number(row[5].replace(/,/g, "").trim());

            console.log("Running Balance (number): ", runningBalance);

            let isExpense = false;
            if (debit && Number(debit) > 0) {
              isExpense = true;
            }
            const amount = isExpense ? Number(debit) : Number(credit);

            const description = row[1].trim();

            const party = extractParty(description);
            const date = formatDate(row[0]);
            const partyName = extractPartyName(description);

            const category = categorizeTransaction(party, description);

            console.log("To: ", partyName);
            console.log("amount: " + amount);
            console.log("description: " + description);
            console.log("party: " + party);
            console.log("date: " + date);


            transactionArray.unshift({
              title: partyName,
              amount,
              isExpense,
              recipient: party,
              category,
              description,
              isOnline: description.includes("UPI"),
              date,
              balance: Number(runningBalance.toFixed(2)),
            });

          }

          if (transactionArray.length > 0) {
            await addTransaction(transactionArray);
            console.log(transactionArray[transactionArray.length - 1].balance);

            await fetch(
              `${import.meta.env.VITE_BACKEND_URL}/api/accounts/balance`,
              {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  balance: transactionArray[transactionArray.length - 1].balance,
                }),
              }
            );

            await getBalance();

          }
        }
        finally {
          setIsLoading(false);
        }

      }

    });

    function formatDate(sbiDate) {
      if (!sbiDate) return "";

      const [dd, mm, yyyy] = sbiDate.split("/");

      const day = String(Number(dd));
      const months = [
        "Jan", "Feb", "Mar", "Apr", "May", "Jun",
        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
      ];
      const month = months[Number(mm) - 1];

      return `${day} ${month} ${yyyy}`;
    }


    function categorizeTransaction(partyName = "", description = "") {
      const text = `${partyName} ${description}`.toLowerCase();

      // TRAVEL
      if (
        text.includes("dmrc") ||
        text.includes("delhi metro") ||
        text.includes("irctc") ||
        text.includes("railway") ||
        text.includes("uber") ||
        text.includes("ola")
      ) {
        return "Travel";
      }

      // FOOD
      if (
        text.includes("zomato") ||
        text.includes("swiggy") ||
        text.includes("domino") ||
        text.includes("pizza") ||
        text.includes("restaurant") ||
        text.includes("cafe")
      ) {
        return "Food";
      }

      // SHOPPING
      if (
        text.includes("amazon") ||
        text.includes("flipkart") ||
        text.includes("myntra") ||
        text.includes("ajio") ||
        text.includes("meesho")
      ) {
        return "Shopping";
      }

      // BILLS / UTILITIES
      if (
        text.includes("bhim") ||
        text.includes("paytm") ||
        text.includes("phonepe") ||
        text.includes("upi") ||
        text.includes("electric") ||
        text.includes("recharge") ||
        text.includes("bill")
      ) {
        return "Bills";
      }

      return "Others";
    }


    function extractParty(description = "") {
      const text = description.toUpperCase();

      if (text.includes("DMRC")) return "DMRC";
      if (text.includes("IRCTC")) return "IRCTC";
      if (text.includes("AMAZON")) return "Amazon";
      if (text.includes("FLIPKART")) return "Flipkart";
      if (text.includes("MYNTRA")) return "Myntra";
      if (text.includes("ZOMATO")) return "Zomato";
      if (text.includes("SWIGGY")) return "Swiggy";
      if (text.includes("JIO")) return "Jio";
      if (text.includes("PAYTM")) return "Paytm";
      if (text.includes("PHONEPE")) return "PhonePe";
      if (text.includes("BHIM")) return "BHIM";
      if(text.includes("INTERES T CREDIT")) return "INTEREST CREDIT";

      // UPI 
      if (text.includes("UPI")) {
        const parts = description.split("/");

        if (parts.length >= 4) {
          const name = parts[3]
            .replace(/[^a-zA-Z\s]/g, "")
            .trim();

          if (name.length >= 2) {
            return toTitleCase(name);
          }
        }

        return "UPI Transfer";
      }


      // Cheque
      if (text.includes("CHQ")) return "Cheque";

      return "Others";
    }

    function extractPartyName(description = "") {
      if (!description) return "Unknown";
      if(description.includes("INTERES T CREDIT")) return "INTEREST CREDIT";

      const clean = description
        .replace(/\u00A0/g, " ")
        .replace(/\n/g, " ")
        .replace(/\s+/g, " ")
        .trim();


      const parts = clean.split("/");

      if (parts.length >= 4) {
        const name = parts[3]
          .replace(/[^a-zA-Z\s]/g, "")
          .trim();

        if (name.length >= 2) {
          return toTitleCase(name);
        }
      }

      return "Unknown";
    }

    function toTitleCase(str) {
      return str
        .toLowerCase()
        .split(" ")
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");
    }


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
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
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
