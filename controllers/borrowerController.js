const Borrower = require('../models/Borrower');
const Loan = require('../models/Loan');
const EMI = require('../models/EMI');

// Get all borrowers
exports.getAllBorrowers = async (req, res) => {
  try {
    const borrowers = await Borrower.find().sort({ fullName: 1 });
    res.status(200).json(borrowers);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching borrowers', error: error.message });
  }
};

// Get borrower by ID
exports.getBorrowerById = async (req, res) => {
  try {
    const borrower = await Borrower.findById(req.params.id);
    
    if (!borrower) {
      return res.status(404).json({ message: 'Borrower not found' });
    }
    
    // Get loans for this borrower
    const loans = await Loan.find({ borrower: req.params.id });
    
    // Get all EMIs for these loans
    const loanIds = loans.map(loan => loan._id);
    const emis = await EMI.find({ loan: { $in: loanIds } }).sort({ dueDate: 1 });
    
    res.status(200).json({
      borrower,
      loans,
      emis,
      stats: {
        totalLoans: loans.length,
        activeLoans: loans.filter(loan => loan.status === 'Active').length,
        totalOutstanding: calculateTotalOutstanding(loans, emis)
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching borrower', error: error.message });
  }
};

// Create new borrower
exports.createBorrower = async (req, res) => {
  try {
    const { fullName, phoneNumber, address, notes } = req.body;
    
    // Basic validation
    if (!fullName || !phoneNumber || !address) {
      return res.status(400).json({ message: 'Please provide fullName, phoneNumber, and address' });
    }
    
    // Check if borrower with same phone number already exists
    const existingBorrower = await Borrower.findOne({ phoneNumber });
    if (existingBorrower) {
      return res.status(400).json({ message: 'Borrower with this phone number already exists' });
    }
    
    const borrower = new Borrower({
      fullName,
      phoneNumber,
      address,
      notes
    });
    
    await borrower.save();
    
    res.status(201).json(borrower);
  } catch (error) {
    res.status(500).json({ message: 'Error creating borrower', error: error.message });
  }
};

// Update borrower
exports.updateBorrower = async (req, res) => {
  try {
    const { fullName, phoneNumber, address, notes, isLoyal } = req.body;
    
    // Find borrower first to ensure it exists
    const borrower = await Borrower.findById(req.params.id);
    
    if (!borrower) {
      return res.status(404).json({ message: 'Borrower not found' });
    }
    
    // Update fields if provided
    if (fullName) borrower.fullName = fullName;
    if (phoneNumber) borrower.phoneNumber = phoneNumber;
    if (address) borrower.address = address;
    if (notes !== undefined) borrower.notes = notes;
    if (isLoyal !== undefined) borrower.isLoyal = isLoyal;
    
    await borrower.save();
    
    res.status(200).json(borrower);
  } catch (error) {
    res.status(500).json({ message: 'Error updating borrower', error: error.message });
  }
};

// Delete borrower (only if no loans exist)
exports.deleteBorrower = async (req, res) => {
  try {
    // Check if borrower has any loans
    const loans = await Loan.find({ borrower: req.params.id });
    if (loans.length > 0) {
      return res.status(400).json({ 
        message: 'Cannot delete borrower with existing loans. Please close or delete all loans first.' 
      });
    }
    
    const borrower = await Borrower.findByIdAndDelete(req.params.id);
    
    if (!borrower) {
      return res.status(404).json({ message: 'Borrower not found' });
    }
    
    res.status(200).json({ message: 'Borrower deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting borrower', error: error.message });
  }
};

// Search borrowers
exports.searchBorrowers = async (req, res) => {
  try {
    const { query } = req.query;
    
    if (!query) {
      return res.status(400).json({ message: 'Please provide a search query' });
    }
    
    const borrowers = await Borrower.find({
      $or: [
        { fullName: { $regex: query, $options: 'i' } },
        { phoneNumber: { $regex: query, $options: 'i' } }
      ]
    });
    
    res.status(200).json(borrowers);
  } catch (error) {
    res.status(500).json({ message: 'Error searching borrowers', error: error.message });
  }
};

// Update borrower's CIBIL score
exports.updateCibilScore = async (req, res) => {
  try {
    const { cibilScore } = req.body;
    
    if (cibilScore === undefined) {
      return res.status(400).json({ message: 'Please provide cibilScore' });
    }
    
    const borrower = await Borrower.findById(req.params.id);
    
    if (!borrower) {
      return res.status(404).json({ message: 'Borrower not found' });
    }
    
    borrower.cibilScore = cibilScore;
    await borrower.save();
    
    res.status(200).json(borrower);
  } catch (error) {
    res.status(500).json({ message: 'Error updating CIBIL score', error: error.message });
  }
};

// Helper function to calculate total outstanding for a borrower
function calculateTotalOutstanding(loans, emis) {
  let totalOutstanding = 0;
  
  // Only consider active loans
  const activeLoans = loans.filter(loan => loan.status === 'Active');
  
  // For each active loan, calculate remaining EMI amounts
  activeLoans.forEach(loan => {
    const loanEmis = emis.filter(emi => emi.loan.toString() === loan._id.toString());
    const unpaidEmis = loanEmis.filter(emi => emi.status === 'Unpaid');
    
    unpaidEmis.forEach(emi => {
      totalOutstanding += emi.amount - emi.paidAmount;
    });
  });
  
  return totalOutstanding;
} 