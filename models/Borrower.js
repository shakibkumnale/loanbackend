const mongoose = require('mongoose');

const borrowerSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: true,
    trim: true
  },
  phoneNumber: {
    type: String,
    required: true,
    trim: true
  },
  address: {
    type: String,
    required: true,
    trim: true
  },
  notes: {
    type: String,
    trim: true
  },
  cibilScore: {
    type: Number,
    default: 650 // Starting with a neutral score
  },
  isLoyal: {
    type: Boolean,
    default: false // 'Costume' tag for loyal customers
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Borrower', borrowerSchema); 