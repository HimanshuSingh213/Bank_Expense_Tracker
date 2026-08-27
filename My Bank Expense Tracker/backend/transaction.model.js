import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "userInfo",
        required: false,
        index: true
    },
    accountId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "accountInfo",
        required: false,
        index: true
    },
    title: {
        type: String,
        required: true,
        trim: true
    },
    amount: {
        type: Number,
        required: true,
        min: 0
    },
    isExpense: {
        type: Boolean,
        required: true,
        default: true
    },
    category: {
        type: String,
        required: true,
        default: "Others"
    },
    recipient: {
        type: String,
        default: "",
        trim: true
    },
    description: {
        type: String,
        default: "",
        trim: true
    },
    isOnline: {
        type: Boolean,
        default: false
    },
    reviewed: {
        type: Boolean,
        default: false
    },
    balance: {
        type: Number
    },
    date: {
        type: mongoose.Schema.Types.Mixed,
        default: Date.now,
        index: true
    },
}, { timestamps: true });

transactionSchema.index({ date: -1 });
transactionSchema.index({ createdAt: -1 });

export const transaction = mongoose.model('transaction', transactionSchema);


