const Loan = require('../models/Loan');
const EMI = require('../models/EMI');
const Borrower = require('../models/Borrower');

// Get all loans
exports.getAllLoans = async (req, res) => {
  try {
    const loans = await Loan.find()
      .populate('borrower', 'fullName phoneNumber')
      .sort({ createdAt: -1 });
    
    res.status(200).json(loans);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching loans', error: error.message });
  }
};

// Get loan by ID with EMIs
exports.getLoanById = async (req, res) => {
  try {
    const loan = await Loan.findById(req.params.id)
      .populate('borrower', 'fullName phoneNumber address cibilScore isLoyal');
    
    if (!loan) {
      return res.status(404).json({ message: 'Loan not found' });
    }
    
    // Get all EMIs for this loan
    const emis = await EMI.find({ loan: req.params.id }).sort({ dueDate: 1 });
    
    // Calculate total paid amount
    const totalPaid = emis.reduce((total, emi) => total + (emi.paidAmount || 0), 0);
    
    // Calculate remaining amount
    const remainingAmount = loan.totalRepayable - totalPaid;
    
    res.status(200).json({
      loan: {
        ...loan.toObject(),
        // Add these for frontend compatibility
        startDate: loan.loanDate,
        termDays: loan.emiCycleDays,
        amountPaid: totalPaid
      },
      emis,
      stats: {
        totalPaid,
        remainingAmount,
        paidEMIs: emis.filter(emi => emi.status !== 'Unpaid').length,
        remainingEMIs: emis.filter(emi => emi.status === 'Unpaid').length
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching loan', error: error.message });
  }
};

// Create new loan
exports.createLoan = async (req, res) => {
  try {
    const {
      borrowerId,
      loanDate,
      principal,
      interestRate,
      totalEMIs,
      emiCycleDays,
      firstEMIDate,
      purpose,
      status
    } = req.body;
    
    // Basic validation
    if (!borrowerId || !principal || !interestRate || !totalEMIs || !emiCycleDays || !firstEMIDate || !loanDate) {
      return res.status(400).json({ 
        message: 'Please provide borrowerId, principal, interestRate, totalEMIs, emiCycleDays, firstEMIDate, and loanDate' 
      });
    }
    
    // Check if borrower exists
    const borrower = await Borrower.findById(borrowerId);
    if (!borrower) {
      return res.status(404).json({ message: 'Borrower not found' });
    }
    
    // Calculate total repayable amount
    const totalRepayable = principal + (principal * interestRate / 100);
    
    // Calculate EMI amount
    const emiAmount = totalRepayable / totalEMIs;
    
    // Create new loan
    const loan = new Loan({
      borrower: borrowerId,
      loanDate: new Date(loanDate),
      principal,
      interestRate,
      totalEMIs,
      emiCycleDays,
      firstEMIDate: new Date(firstEMIDate),
      totalRepayable,
      emiAmount,
      purpose,
      status: status || 'Active'
    });
    
    await loan.save();
    
    // Create EMIs for this loan
    await createEMIsForLoan(loan);
    
    res.status(201).json(loan);
  } catch (error) {
    res.status(500).json({ message: 'Error creating loan', error: error.message });
  }
};

// Update loan status (close loan)
exports.updateLoanStatus = async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!status || !['Active', 'Closed'].includes(status)) {
      return res.status(400).json({ message: 'Please provide valid status (Active or Closed)' });
    }
    
    const loan = await Loan.findById(req.params.id);
    
    if (!loan) {
      return res.status(404).json({ message: 'Loan not found' });
    }
    
    loan.status = status;
    await loan.save();
    
    res.status(200).json(loan);
  } catch (error) {
    res.status(500).json({ message: 'Error updating loan status', error: error.message });
  }
};

// Filter loans
exports.filterLoans = async (req, res) => {
  try {
    const { status, borrowerId } = req.query;
    
    const filterOptions = {};
    
    if (status && ['Active', 'Closed'].includes(status)) {
      filterOptions.status = status;
    }
    
    if (borrowerId) {
      filterOptions.borrower = borrowerId;
    }
    
    const loans = await Loan.find(filterOptions)
      .populate('borrower', 'fullName phoneNumber')
      .sort({ loanDate: -1 });
    
    res.status(200).json(loans);
  } catch (error) {
    res.status(500).json({ message: 'Error filtering loans', error: error.message });
  }
};

// Helper function to create EMIs for a loan
async function createEMIsForLoan(loan) {
  try {
    const emis = [];
    let currentDate = new Date(loan.firstEMIDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time portion for fair comparison
    
    // Create EMIs based on totalEMIs and emiCycleDays
    for (let i = 0; i < loan.totalEMIs; i++) {
      // Set status based on due date: "Upcoming" for future dates, "Unpaid" for today or past dates
      const dueDate = new Date(currentDate);
      const status = dueDate > today ? 'Upcoming' : 'Unpaid';
      
      const emi = new EMI({
        loan: loan._id,
        dueDate: dueDate,
        amount: loan.emiAmount,
        emiNumber: i + 1,
        status: status
      });
      
      emis.push(emi);
      
      // Calculate next EMI date
      currentDate = new Date(currentDate);
      currentDate.setDate(currentDate.getDate() + loan.emiCycleDays);
    }
    
    // Save all EMIs to database
    await EMI.insertMany(emis);
    
    return emis;
  } catch (error) {
    console.error('Error creating EMIs:', error);
    throw error;
  }
}

// Helper function to calculate total paid amount for a loan
function calculateTotalPaid(emis) {
  return emis.reduce((total, emi) => total + (emi.paidAmount || 0), 0);
}

// Helper function to calculate remaining amount for a loan
function calculateRemainingAmount(loan, emis) {
  const totalPaid = calculateTotalPaid(emis);
  return loan.totalRepayable - totalPaid;
} 