const mongoose = require('mongoose');

const emiSchema = new mongoose.Schema({
  loan: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Loan',
    required: true
  },
  dueDate: {
    type: Date,
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  status: {
    type: String,
    enum: ['Unpaid', 'Upcoming', 'Paid on time', 'Paid late', 'Advance paid'],
    default: 'Unpaid'
  },
  paidDate: {
    type: Date
  },
  paidAmount: {
    type: Number,
    default: 0
  },
  paymentMode: {
    type: String,
    enum: ['cash', 'online', 'advance', ''],
    default: ''
  },
  notes: {
    type: String,
    default: ''
  },
  emiNumber: {
    type: Number,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('EMI', emiSchema); 