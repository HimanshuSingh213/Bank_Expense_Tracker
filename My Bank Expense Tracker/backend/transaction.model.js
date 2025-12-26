import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "userInfo",
        required: true
    },

    accountId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "accountInfo",
        required: true,
    },

    title: {
        type: String,
        required: true
    },
    amount: {
        type: Number,
        required: true
    },

    isExpense: {
        type: Boolean,
        required: true
    },
    category: {
        type: String,
        required: true
    },

    recipient: {
        type: String
    },
    description: {
        type: String
    },
    isOnline: {
        type: Boolean,
        default: false
    },

    reviewed: {
        type: Boolean,
        default: false
    },
    inCalculator: {
        type: Boolean,
        default: false
    },
    date: {
        type: String,
        default: () => (
            new Date().toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric",
            }))
    },

}, { timestamps: true });

export const transaction = mongoose.model('transaction', transactionSchema)
