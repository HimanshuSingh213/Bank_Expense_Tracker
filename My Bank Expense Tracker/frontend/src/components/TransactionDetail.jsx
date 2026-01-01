import React from 'react'
import { useAccount } from '../context/ExpenseContext';

function TransactionDetail() {
    const { selectedTransaction, setOpenDetail, openDetail } = useAccount();

    if (!selectedTransaction) return null;

    const categoryVariants = {
        Food: "text-[#008236] bg-[#00c9511a] border border-[#00c95133]",
        Travel: "text-[#ca3500] bg-[#ff69001a] border border-[#ff690033]",
        Shopping: "text-[#8200db] bg-[#ad46ff1a] border border-[#ad46ff33]",
        Bills: "text-[#1447e6] bg-[#2b7fff1a] border border-[#2b7fff33]",
        Others: "text-[#364153] bg-[#6a72821a] border border-[#6a728233]",
    };

    return (
        <>
            {/* Backdrop */}
            <div
                onClick={() => setOpenDetail(false)}
                className="fixed inset-0 z-1000 bg-black/40 transition-opacity duration-200"
            />

            {/* Centering wrapper */}
            <div className="fixed inset-0 z-1001 flex items-center justify-center pointer-events-none">

                {/* Modal */}
                <div
                    className={` pointer-events-auto w-full max-w-[600px] max-h-[90vh] bg-white rounded-xl p-6 shadow-xl transform transition-all duration-300 ease-out flex flex-col gap-4 overflow-y-auto custom-scroll
                        ${openDetail ? "translate-y-0 opacity-100 scale-100" : "translate-y-4 opacity-0 scale-95"}`}>

                    {/* Header */}
                    <div className='flex justify-between items-start'>
                        <div className="flex flex-col gap-1.5">
                            <div className="flex gap-2 items-center">
                                <svg className="h-5 w-5 text-purple-600" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"></path><path d="M14 2v4a2 2 0 0 0 2 2h4"></path><path d="M10 9H8"></path><path d="M16 13H8"></path><path d="M16 17H8"></path></svg>
                                <h2 className="font-medium text-lg">Transaction Details</h2>
                            </div>
                            <p className="text-sm text-gray-500">
                                Complete information about this transaction
                            </p>
                        </div>
                        <button
                            onClick={() => setOpenDetail(false)}
                            className="transition-colors duration-200 ease-in-out rounded-sm hover:bg-gray-200 cursor-pointer size-6 flex justify-center items-center"
                        >
                            ✕
                        </button>
                    </div>

                    {/* Content */}
                    <div className='space-y-4'>

                        {/* Section-1 */}
                        <div className='w-full rounded-lg border border-purple-200 bg-linear-to-br from-purple-50 to-pink-50 p-4 '>
                            <div className='flex justify-between items-start mb-3'>
                                <div className="left">
                                    <h2 className='text-gray-900'>{selectedTransaction.title}</h2>
                                    <p className={`mt-1 text-base ${selectedTransaction.isExpense ? "text-red-600" : "text-green-600"} `}>{selectedTransaction.isExpense ? "-" : "+"}₹{Number(selectedTransaction.amount).toFixed(2)}</p>
                                </div>
                                <div className="right">
                                    <div className={`border text-xs px-2 py-0.5 rounded-xl ${categoryVariants[selectedTransaction.category] ? categoryVariants[selectedTransaction.category] : ""}}`}>
                                        {selectedTransaction.category}
                                    </div>
                                </div>
                            </div>
                            <div className='h-px border border-gray-300 w-full my-3'></div>

                            <div className='flex gap-2 items-center'>
                                <div className="left w-1/2 flex gap-2 items-center">
                                    <svg className=" h-4 w-4 text-gray-500" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M8 2v4"></path><path d="M16 2v4"></path><rect width="18" height="18" x="3" y="4" rx="2"></rect><path d="M3 10h18"></path></svg>

                                    <div className='flex flex-col'>
                                        <p className='text-gray-500 text-xs'>Date</p>
                                        <h3 className='text-gray-900'>{selectedTransaction.date}</h3>
                                    </div>
                                </div>
                                <div className="right w-1/2 flex gap-2 items-center">
                                    <svg className=" h-4 w-4 text-gray-500" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z"></path><circle cx="7.5" cy="7.5" r=".5" fill="currentColor"></circle></svg>

                                    <div className='flex flex-col'>
                                        <p className='text-gray-500 text-xs'>Type</p>
                                        <h3 className='text-gray-900'>{selectedTransaction.isExpense ? "Expense" : "Income"}</h3>
                                    </div>
                                </div>
                            </div>

                        </div>

                        {/* Section-2 */}
                        <div className='bg-gray-50 rounded-lg p-4'>
                            <div className='flex gap-2 items-center justify-start mb-2'>
                                <svg className=" h-4 w-4 text-blue-500" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect width="20" height="14" x="2" y="5" rx="2"></rect><line x1="2" x2="22" y1="10" y2="10"></line></svg>
                                <h2 className='font-medium text-sm'>Payment Method</h2>
                            </div>
                            <h2 className='text-gray-900'>{selectedTransaction.isOnline ? "Online Payment (UPI)" : "Cash"}</h2>
                        </div>

                        {/* Section-3 */}
                        <div className='bg-gray-50 rounded-lg p-4'>
                            <div className='flex gap-2 items-center justify-start mb-2'>
                                <svg className=" h-4 w-4 text-gray-500" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                                <h2 className='font-medium text-sm'>{selectedTransaction.isExpense? "Recipient" : "Sender"}</h2>
                            </div>
                            <h2 className='text-gray-900'>{selectedTransaction.recipient}</h2>
                        </div>

                        {/* Section-4 */}
                        <div className='bg-gray-50 rounded-lg p-4'>
                            <div className='flex gap-2 items-center justify-start mb-2'>
                                <svg className=" h-4 w-4 text-gray-500" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"></circle><path d="m9 12 2 2 4-4"></path></svg>
                                <h2 className='font-medium text-sm'>Review Status</h2>
                            </div>
                            <h2 className={`text-gray-900 border rounded-xl border-gray-300 text-xs w-fit px-2 ${selectedTransaction.checked1 ? "text-white bg-black px-3 py-1 border-black" : ""}`}>{selectedTransaction.checked1 ? "Reviewed" : "Pending Review"}</h2>
                        </div>

                        {/* Section-5 */}
                        <div className={`${selectedTransaction.hasDescription? "block" : "hidden"}`}>
                            <div className='flex gap-2 justify-start mb-2 items-center'>
                                <svg className="h-4 w-4 text-gray-500" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"></path><path d="M14 2v4a2 2 0 0 0 2 2h4"></path><path d="M10 9H8"></path><path d="M16 13H8"></path><path d="M16 17H8"></path></svg>
                                <p className='text-sm text-gray-900 font-medium'>Description</p>
                            </div>
                            <div className='border border-pink-200 bg-linear-to-br from-purple-50 to-pink-50 rounded-xl p-4'>
                                <p className='text-sm text-gray-600'>{selectedTransaction.hasDescription}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}


export default TransactionDetail