import React from "react";
import { useAccount } from "../context/ExpenseContext";
import { useRef, useEffect, useState } from "react";

export default function PersonalCard() {
  const { balance, setBalance, bankName, accountType, getAccountInfo, setIsLoading, isLoading } = useAccount();
  
  const [editedBalance, isEditingBalance] = useState(false);
  const [localBalance, setLocalBalance] = useState(balance);
  const inputRef = useRef(null);

  useEffect(() => {
    getAccountInfo();
  }, []);

  useEffect(() => {
    if (editedBalance) {
      inputRef.current?.focus();
    }
  }, [editedBalance]); 

  useEffect(() => {
    if (editedBalance) {
      setLocalBalance(balance);
    }
  }, [editedBalance, balance]);

  async function setDBBalance(){
    setIsLoading(true);
    try{
    await fetch(
      `${import.meta.env.VITE_BACKEND_URL}/api/accounts/balance`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          balance: Number(localBalance),
        }),
      })
    }
    finally{
      setIsLoading(false);
    }
  }

  return (
    <div className="bg-linear-to-br from-[#ad46ff] via-[#f6339a] to-[#ff6900]
                    p-6 rounded-[14px] shadow-lg border border-black/10 
                    flex flex-col gap-8 max-h-[250px] 
                    transition-all duration-400 ease-in-out hover:scale-[1.015] hover:shadow-xl">

      {/* HEADER */}
      <div className={`flex items-center justify-between ${editedBalance? "mb-2" : "mb-4"}`}>

        <div className="flex items-center gap-4">

          {/* LOGO */}
          <div className="h-12 w-12 rounded-full bg-white/20 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg"
              width="24" height="24" viewBox="0 0 24 24"
              fill="none" stroke="white"
              strokeWidth="2" strokeLinecap="round"
              strokeLinejoin="round">
              <path
                d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1"
              />
              <path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4" />
            </svg>
          </div>

          {/* BALANCE */}
          <div>
            <p className="text-sm text-white/80">Available balance</p>
            <h2 className={`${editedBalance? "hidden" : "flex"} text-base text-white`}>₹{balance.toFixed(2)}</h2>

            <input 
              type="number"
              ref={inputRef}
              value={localBalance}
              disabled={isLoading}
              onChange={(e) => setLocalBalance(e.target.value)}
              inputMode="numeric" pattern="[0-9]*"
              className= {` ${editedBalance? "flex" : "hidden"} mt-1 h-8 w-[90%] 
                         bg-white/20 border border-white/30
                         rounded-md px-3 text-xs text-white outline-none hover:bg-white/25 `}
            />
          </div>
        </div>

        {/* ACTIONS */}
        <div className="flex items-center gap-1">

          <button onClick={() => isEditingBalance(prev => !prev)}
          className={`editedBalance ${editedBalance? "hidden" : "flex"} h-9 w-9 rounded-lg bg-white/20 hover:bg-white/30 transition  items-center justify-center`}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"
              viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path
                d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z">
              </path>
            </svg>
          </button>
          <div className={`${editedBalance? "flex" : "hidden"} flex-row items-center gap-1.5`}>
            <button onClick={async () => {
              isEditingBalance(false)
              setBalance(Number(localBalance))
              setDBBalance()
            }}
            disabled={isLoading}
            className="editYes border-none h-9 w-9 rounded-lg bg-white/20 hover:bg-white/30 transition flex items-center justify-center text-white">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"></path></svg>
            </button>
            <button onClick={() => {
              setLocalBalance(balance)
              isEditingBalance(false)
            }}
            disabled={isLoading}
            className="editNo border-none h-9 w-9 rounded-lg bg-white/20 hover:bg-white/30 transition flex items-center justify-center text-white">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 6 6 18"></path><path d="m6 6 12 12"></path></svg>
            </button>
          </div>

        </div>
      </div>


      {/* FOOTER */}
      <div className="flex justify-between border-t border-white/30 pt-6 mt-6">

        <div className="bg-white/20 rounded-xl p-3 min-w-[47%]">
          <p className="text-xs text-white/70">Bank Name</p>
          <h2 className="text-sm text-white">{bankName}</h2>
        </div>

        <div className="bg-white/20 rounded-xl p-3 min-w-[47%]">
          <p className="text-xs text-white/70">Account Type</p>
          <h2 className="text-sm text-white">{accountType}</h2>
        </div>

      </div>
    </div>
  )
}
