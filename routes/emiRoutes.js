const express = require('express');
const router = express.Router();
const emiController = require('../controllers/emiController');

// GET /api/emis - Get all EMIs with optional filtering
router.get('/', emiController.getAllEMIs);

// GET /api/emis/:id - Get EMI by ID
router.get('/:id', emiController.getEMIById);

// GET /api/emis/loan/:loanId - Get all EMIs for a loan
router.get('/loan/:loanId', emiController.getEMIsByLoanId);

// PATCH /api/emis/:id - Update EMI
router.patch('/:id', emiController.updateEMI);

// POST /api/emis/:id/payment - Record a payment for an EMI
router.post('/:id/payment', emiController.recordEMIPayment);

module.exports = router; 