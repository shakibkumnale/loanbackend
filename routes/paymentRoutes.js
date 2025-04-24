const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');

// POST /api/payments - Record a payment
router.post('/', paymentController.recordPayment);

// GET /api/payments/due-today - Get EMIs due today
router.get('/due-today', paymentController.getEMIsDueToday);

// GET /api/payments - Get all payment records
router.get('/', paymentController.getAllPayments);

// PATCH /api/payments/:emiId/mark-missed - Mark EMI as missed
router.patch('/:emiId/mark-missed', paymentController.markEMIAsMissed);

module.exports = router; 