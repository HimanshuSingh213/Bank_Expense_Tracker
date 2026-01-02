import { useAccount } from '../context/ExpenseContext'
import React, { useEffect, useState } from 'react'
import SelectInput from './SelectInput';

function TransactionUpdateModal() {
    const { openUpdate, toUpdate, setOpenUpdate } = useAccount();

    const typeOptions = ["Expense", "Income"];
    const categoryOptions = ["Food", "Travel", "Shopping", "Bills", "Others"];

    const [loading, setLoading] = useState(false);

    const [inputStates, setInputStates] = useState({
        title: "",
        amount: "",
        recipient: "",
        isExpense: true,
        category: "",
        hasDescription: "",
        isOnline: false,
    });

    useEffect(() => {
        if (openUpdate && toUpdate) {
            setInputStates({
                title: toUpdate.title || "",
                amount: toUpdate.amount || "",
                recipient: toUpdate.recipient || "",
                isExpense: toUpdate.isExpense,
                category: toUpdate.category || "",
                hasDescription: toUpdate.hasDescription || "",
                isOnline: toUpdate.isOnline

            });
        }
    }, [openUpdate, toUpdate]);

    async function handleSave() {
        setLoading(true);
        try {
            await fetch(
                `${import.meta.env.VITE_BACKEND_URL}/api/transactions/${toUpdate.id}`,
                {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(inputStates),
                }
            );
        }
        catch (err) {
            alert("Error Saving the changes, Please try again.")
            console.log("Error: ", err);
        }
        finally {
            setLoading(false)
            setOpenUpdate(false);
        }
    }

    function handleClose() {
        if (loading) return;
        setOpenUpdate(false);
        setInputStates(null);
    }


    return (
        <>
            {/* Backdrop */}
            <div
                onClick={() => handleClose()}
                className="fixed inset-0 z-1000 bg-black/40 transition-opacity duration-200"
            />

            {/* Centering wrapper */}
            <div className="fixed inset-0 z-1001 flex items-center justify-center pointer-events-none">

                {/* Modal */}
                <div
                    className={` pointer-events-auto w-full max-w-[600px] max-h-[90vh] bg-white rounded-xl p-6 shadow-xl transform transition-all duration-300 ease-out flex flex-col gap-4 overflow-y-auto custom-scroll pr-8
                        ${openUpdate ? "translate-y-0 opacity-100 scale-100" : "translate-y-4 opacity-0 scale-95"}`}>

                    {/* Header */}
                    <div className='flex justify-between items-start'>
                        <div className="flex flex-col gap-1.5">
                            <div className="flex gap-2 items-center">
                                <svg className="h-5 w-5 text-purple-600" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"></path><path d="M14 2v4a2 2 0 0 0 2 2h4"></path><path d="M10 9H8"></path><path d="M16 13H8"></path><path d="M16 17H8"></path></svg>
                                <h2 className="font-medium text-lg">Edit Transaction</h2>
                            </div>
                            <p className="text-sm text-gray-500">
                                Update the transaction details below
                            </p>
                        </div>
                        <button
                            onClick={() => handleClose()}
                            className="transition-colors duration-200 ease-in-out rounded-sm hover:bg-gray-200 cursor-pointer size-6 flex justify-center items-center"
                        >
                            ✕
                        </button>
                    </div>

                    {/* Content */}
                    <div className='space-y-4'>

                        {/* Section-1 */}
                        <div className='w-full flex gap-4 items-center'>
                            <div className='w-full flex gap-0.5 items-start flex-col justify-center h-full'>
                                <label htmlFor='txnName' className='w-full text-sm font-medium'>Transaction Name</label>
                                <input value={inputStates.title}
                                    onChange={(e) => setInputStates(prev => ({ ...prev, title: e.target.value }))}
                                    id='txnName' className='w-full rounded-lg bg-gray-100 px-3 py-2 text-sm text-gray-700 outline-none focus:ring-2 ring-gray-400 transition-all' placeholder='e.g., Grocery Shopping'
                                    type="text" />
                            </div>

                            <div className='w-full flex gap-0.5 items-start flex-col justify-center h-full'>
                                <label htmlFor='txnAmt' className='w-full text-sm font-medium'>Amount (₹)</label>
                                <input value={inputStates.amount}
                                    onChange={(e) => setInputStates(prev => ({ ...prev, amount: e.target.value }))}
                                    id='txnAmt' className='w-full rounded-lg bg-gray-100 px-3 py-2 text-sm text-gray-700 outline-none focus:ring-2 ring-gray-400 transition-all' placeholder='0.0'
                                    type="number" />
                            </div>
                        </div>

                        {/* Section-2 */}
                        <div className='w-full flex gap-0.5 items-start flex-col justify-center h-full'>
                            <label htmlFor='recipient' className='w-full text-sm font-medium'>Recipient/Sender (Optional)</label>
                            <input value={inputStates.recipient}
                                onChange={(e) => setInputStates(prev => ({ ...prev, recipient: e.target.value }))}
                                id='recipient' className='w-full rounded-lg bg-gray-100 px-3 py-2 text-sm text-gray-700 outline-none focus:ring-2 ring-gray-400 transition-all' placeholder='e.g., Amazon, Haldirams etc'
                                type="text" />
                        </div>

                        {/* Section-3 */}
                        <div className='w-full flex gap-4 items-center'>
                            <div className='w-full flex gap-0.5 items-start flex-col justify-center h-full'>
                                <label className='w-full text-sm font-medium'>Type</label>
                                <div
                                    className='w-full'>
                                    <SelectInput
                                        options={typeOptions}
                                        value={inputStates.isExpense ? "Expense" : "Income"}
                                        onChange={isExpense =>
                                            setInputStates(prev => ({ ...prev, isExpense }))
                                        }

                                    />
                                </div>

                            </div>

                            <div className='w-full flex gap-0.5 items-start flex-col justify-center h-full'>
                                <label className='w-full text-sm font-medium'>Category</label>
                                <div
                                    className='w-full'>
                                    <SelectInput
                                        options={categoryOptions}
                                        value={inputStates.category}
                                        onChange={category =>
                                            setInputStates(prev => ({ ...prev, category }))
                                        } />
                                </div>

                            </div>
                        </div>

                        {/* Section-4 */}
                        <div className='w-full flex gap-0.5 items-start flex-col justify-center h-full'>
                            <label htmlFor='description' className='w-full text-sm font-medium'>Description (Optional)</label>
                            <textarea value={inputStates.hasDescription ? inputStates.hasDescription : ""}
                                onChange={(e) => setInputStates(prev => ({ ...prev, hasDescription: e.target.value }))}
                                id='description' className='w-full rounded-lg bg-gray-100 px-3 py-2 text-sm text-gray-700 outline-none focus:ring-2 ring-gray-400 transition-all min-h-20 resize-none' placeholder='Add notes or Detail About this Transaction...'
                                type="text" />
                        </div>

                        {/* Section-5 */}
                        <div className="flex items-center gap-2">

                            <input
                                type="checkbox"
                                id="isOnline"
                                checked={inputStates.isOnline}
                                onChange={e =>
                                    setInputStates(prev => ({ ...prev, isOnline: e.target.checked }))
                                }

                                className="accent-gray-950"
                            />

                            <label htmlFor="isOnline" className="text-sm font-medium text-gray-800 pointer-events-auto">
                                Online (UPI)
                            </label>

                        </div>

                        {/* Section-6 */}
                        <div className='w-full grid gap-4 items-center grid-flow-col grid-cols-[4fr_1fr] cursor-default'>
                            <button onClick={() => handleSave()}
                                disabled={loading}
                                className={`flex gap-2 items-center justify-center w-full rounded-lg p-2 text-white transition-all duration-200
                                ${loading ? "bg-purple-300 cursor-not-allowed pointer-events-none opacity-50" : "bg-purple-500 hover:bg-purple-600 hover:scale-102"}`}>
                                <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"></path><path d="M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7"></path><path d="M7 3v4a1 1 0 0 0 1 1h7"></path></svg>
                                <p className='text-sm'>{loading ? "Saving..." : "Save Changes"}</p>
                            </button>
                            <div onClick={() => handleClose()}
                                className={`flex gap-2 items-center flex-row justify-center rounded-lg border hover:shadow-sm border-gray-300 bg-white hover:bg-pink-50 hover:border-pink-500 transition-all duration-200 ease-in-out p-2 ${loading ? "opacity-50 cursor-not-allowed": ""}`}>
                            <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 6 6 18"></path><path d="m6 6 12 12"></path></svg>
                            <p className='text-sm'>Cancel</p>
                        </div>
                    </div>
                </div>
            </div >
        </div >
        </>

    )
}

export default TransactionUpdateModal