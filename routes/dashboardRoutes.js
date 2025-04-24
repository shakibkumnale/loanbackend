const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');

// GET /api/dashboard/stats - Get dashboard statistics
router.get('/stats', dashboardController.getDashboardStats);

// GET /api/dashboard/monthly-collections - Get monthly collections
router.get('/monthly-collections', dashboardController.getMonthlyCollections);

// GET /api/dashboard/daily-collection - Get daily collections
router.get('/daily-collection', dashboardController.getDailyCollection);

// GET /api/dashboard/top-borrowers - Get top borrowers
router.get('/top-borrowers', dashboardController.getTopBorrowers);

module.exports = router; 