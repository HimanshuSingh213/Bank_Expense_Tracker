import mongoose from 'mongoose';

const accountSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "userInfo",
    required: true
  },

  accountId: {
    type: String,
    required: true,
    unique: true
  },

  bankName: {
    type: String,
    required: true,
  },

  accountType: {
    type: String,
    required: true,
  },

  currentBalance: {
    type: Number,
    default: 0
  },

  lastSyncedAt: Date,
}, { timestamps: true });

export const accountInfo = mongoose.model('accountInfo', accountSchema)
