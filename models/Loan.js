const mongoose = require('mongoose');

const loanSchema = new mongoose.Schema({
  borrower: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Borrower',
    required: true
  },
  loanDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  principal: {
    type: Number,
    required: true,
    min: 0
  },
  interestRate: {
    type: Number,
    required: true,
    min: 0
  },
  totalEMIs: {
    type: Number,
    required: true,
    min: 1
  },
  emiCycleDays: {
    type: Number,
    required: true,
    min: 1,
    default: 30 // Default to monthly
  },
  firstEMIDate: {
    type: Date,
    required: true
  },
  totalRepayable: {
    type: Number,
    required: true
  },
  emiAmount: {
    type: Number,
    required: true
  },
  purpose: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['Active', 'Closed'],
    default: 'Active'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Pre-save middleware to calculate totalRepayable and emiAmount
loanSchema.pre('save', function(next) {
  if (this.isNew || this.isModified('principal') || this.isModified('interestRate') || this.isModified('totalEMIs')) {
    // Calculate total repayable amount
    this.totalRepayable = this.principal + (this.principal * this.interestRate / 100);
    
    // Calculate EMI amount
    this.emiAmount = this.totalRepayable / this.totalEMIs;
  }
  next();
});

module.exports = mongoose.model('Loan', loanSchema); 