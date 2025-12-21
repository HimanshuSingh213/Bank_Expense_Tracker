import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  provider: {
    type: String,
    required: true,
  },

  // bankInfo: {
  //   bankName: {
  //     type: String,
  //     required: true,
  //   },
  //   accountType: {
  //     type: String,
  //     required: true,
  //   },
  //   currentBalance: {
  //     type: Number,
  //     default: 0
  //   },
  // }
}, { timestamps: true });


export const userInfo = mongoose.model('userInfo', userSchema)
