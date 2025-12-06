import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema({
    userId: { 
        type: String, 
        required: true 
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
}, { timestamps: true });

export const transaction = mongoose.model('transaction', transactionSchema )
