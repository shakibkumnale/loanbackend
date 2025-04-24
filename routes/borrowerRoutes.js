const express = require('express');
const router = express.Router();
const borrowerController = require('../controllers/borrowerController');

// GET /api/borrowers - Get all borrowers
router.get('/', borrowerController.getAllBorrowers);

// GET /api/borrowers/search - Search borrowers
router.get('/search', borrowerController.searchBorrowers);

// GET /api/borrowers/:id - Get borrower by ID
router.get('/:id', borrowerController.getBorrowerById);

// GET /api/borrowers/:id/loans - Get loans for a borrower
router.get('/:id/loans', async (req, res) => {
  try {
    const loans = await require('../models/Loan').find({ borrower: req.params.id })
      .populate('borrower', 'fullName phoneNumber');
    res.status(200).json(loans);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching borrower loans', error: error.message });
  }
});

// POST /api/borrowers - Create a new borrower
router.post('/', borrowerController.createBorrower);

// PUT /api/borrowers/:id - Update a borrower
router.put('/:id', borrowerController.updateBorrower);

// DELETE /api/borrowers/:id - Delete a borrower
router.delete('/:id', borrowerController.deleteBorrower);

// PATCH /api/borrowers/:id/cibil - Update borrower's CIBIL score
router.patch('/:id/cibil', borrowerController.updateCibilScore);

module.exports = router; 