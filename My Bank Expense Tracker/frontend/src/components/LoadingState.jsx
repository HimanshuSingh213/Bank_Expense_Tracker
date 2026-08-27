import React from "react";

function LoadingState({ message = "Loading..." }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs">
      <div className="flex flex-col items-center gap-3 bg-white border border-slate-200 rounded-2xl px-6 py-5 shadow-xl">
        <div className="h-7 w-7 rounded-full border-2 border-slate-200 border-t-slate-800 animate-spin" />
        <p className="text-xs font-semibold text-slate-800">
          {message}
        </p>
      </div>
    </div>
  );
}


export default LoadingState;
