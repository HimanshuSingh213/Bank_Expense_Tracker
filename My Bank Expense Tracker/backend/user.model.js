import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    default: "Himanshu Singh",
    trim: true,
  },
  email: {
    type: String,
    default: "personal@expense.local",
    trim: true,
  },
  provider: {
    type: String,
    default: "local",
  },
}, { timestamps: true });

export const userInfo = mongoose.model('userInfo', userSchema);

