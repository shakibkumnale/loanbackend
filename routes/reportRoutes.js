const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');

// GET /api/reports/loan-summary - Get loan summary report
router.get('/loan-summary', reportController.getLoanSummaryReport);

// GET /api/reports/payment-collection - Get payment collection report
router.get('/payment-collection', reportController.getPaymentCollectionReport);

// GET /api/reports/overdue-emis - Get overdue EMIs report
router.get('/overdue-emis', reportController.getOverdueEMIsReport);

// GET /api/reports/summary - Get report summary data
router.get('/summary', reportController.getReportSummary);

module.exports = router; 