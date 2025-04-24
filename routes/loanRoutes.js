const express = require('express');
const router = express.Router();
const loanController = require('../controllers/loanController');

// GET /api/loans - Get all loans
router.get('/', loanController.getAllLoans);

// GET /api/loans/:id - Get loan by ID
router.get('/:id', loanController.getLoanById);

// POST /api/loans - Create a new loan
router.post('/', loanController.createLoan);

// PATCH /api/loans/:id/status - Update loan status
router.patch('/:id/status', loanController.updateLoanStatus);

// GET /api/loans/filter - Filter loans
router.get('/filter', loanController.filterLoans);

module.exports = router; 