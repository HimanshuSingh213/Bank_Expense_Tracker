import React from "react";

function LoadingState({ message = "Loading..." }) {
  return (
    <div className="fixed inset-0 z-10001 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      
      <div className="
        flex flex-col items-center gap-4 bg-white dark:bg-neutral-900 rounded-xl px-6 py-5 shadow-xl">
        {/* Spinner */}
        <div className=" h-10 w-10 rounded-full border-4 border-gray-300 border-t-black animate-spin dark:border-neutral-700 dark:border-t-white" />

        {/* Text */}
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {message}
        </p>
      </div>

    </div>
  );
}

export default LoadingState;
