import React, { useEffect, useRef, useState } from 'react'

function SelectInput({
    options = [],
    value,
    onChange,
}) {
    const [open, setOpen] = useState(false);
    const selectRef = useRef(null);

    const handleSelect = (option) => {
        onChange(option);
        setOpen(prev => !prev);
    };

    useEffect(() => {
        function handleClickOutside(e) {
            if (selectRef.current && !selectRef.current.contains(e.target)) {
                setOpen(false);
            }
        }

        if (open) {
            document.addEventListener("mousedown", handleClickOutside);
        }

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [open]);


    return (
        <>
            <div ref={selectRef} className="relative w-full">

                <div
                    onClick={() => setOpen(prev => !prev)}
                    className="flex justify-between items-center rounded-lg bg-gray-100 px-3 py-2 text-sm text-gray-700 outline-none focus:ring-2 ring-gray-400 transition-all w-full"
                >
                    <div className='pointer-events-none'>
                        {value}
                    </div>
                    <svg className="size-4 opacity-50" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"></path></svg>
                </div>

                {/* Dropdown */}
                {open && (
                    <div className="absolute left-0 right-0 mt-1 border border-gray-100 shadow-lg rounded-md bg-white z-10 p-1 transition-all duration-150 ease-in-out">
                        {options.map((option) => {
                            const isSelected = option === value;

                            return (
                                <div
                                    key={option}
                                    onClick={() => handleSelect(option)}
                                    className={`px-3 py-2 cursor-pointer rounded-lg text-sm transition-colors
                                        ${isSelected ? "bg-purple-50 text-pink-600 font-medium" : "hover:bg-gray-200"}`}>

                                    {option}
                                </div>
                            );
                        })}

                    </div>
                )}
            </div>
        </>
    )
}

export default SelectInput