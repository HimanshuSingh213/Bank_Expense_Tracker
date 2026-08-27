import mongoose from 'mongoose';

const accountSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "userInfo",
    required: true,
    index: true
  },

  accountId: {
    type: String,
    required: true,
    unique: true
  },

  bankName: {
    type: String,
    default: "State Bank of India",
    trim: true
  },

  accountType: {
    type: String,
    default: "Savings Account",
    trim: true
  },

  accountNumber: {
    type: String,
    default: "",
    trim: true
  },

  parserPreset: {
    type: String,
    default: "sbi",
    trim: true
  },

  currentBalance: {
    type: Number,
    default: 0
  },

  lastSyncedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });


export const accountInfo = mongoose.model('accountInfo', accountSchema);

