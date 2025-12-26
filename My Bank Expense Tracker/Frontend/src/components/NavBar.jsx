import React from "react";
import { useAccount } from "../context/ExpenseContext";

export default function NavBar() {

  const {theme, setTheme, user} = useAccount ();


  return (
    <div className="flex items-center justify-between mb-8">

      {/* LEFT */}
      <div>
        <p className="bg-linear-to-r from-[#932bff] via-pink-400 to-blue-500 bg-clip-text text-transparent text-base font-medium">
          MyWallet Dashboard
        </p>

        <p className="text-slate-600 mt-2">
          Good Morning, {user} 👋
        </p>
      </div>

      {/* RIGHT ICONS */}
      <div className="flex gap-3">

        {/* Light Theme Icon */}
        <div>
          <button onClick={() => setTheme("light")}
            className={`size-9 bg-white text-black rounded-[10px] border border-black/10 hover:scale-110 flex items-center justify-center hover:bg-slate-100 transition duration-400 ease-in-out ${theme === "dark"? "" : "invert"}`}>
            <svg
              className="size-4"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="black"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round">
              <circle cx="12" cy="12" r="4"></circle>
              <path d="M12 2v2"></path>
              <path d="M12 20v2"></path>
              <path d="m4.93 4.93 1.41 1.41"></path>
              <path d="m17.66 17.66 1.41 1.41"></path>
              <path d="M2 12h2"></path>
              <path d="M20 12h2"></path>
              <path d="m6.34 17.66-1.41 1.41"></path>
              <path d="m19.07 4.93-1.41 1.41"></path>
            </svg>
          </button>
        </div>


        {/* Dark Theme Icon*/}
        <div>
          <button onClick={() => setTheme("dark")}
          className={`size-9 bg-white text-black rounded-[10px] border border-black/10 hover:scale-110 flex items-center justify-center hover:bg-slate-100 transition duration-400 ease-in-out ${theme === "light"? "" : "invert"}`}>
            <svg xmlns="http://www.w3.org/2000/svg"
              className="size-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="black"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round">
              <path
                d="M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401">
              </path>
            </svg>
          </button>
        </div>


      </div>
    </div>
  );
}
