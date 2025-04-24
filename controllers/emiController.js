const EMI = require('../models/EMI');
const Loan = require('../models/Loan');

// Get all EMIs with optional filtering
exports.getAllEMIs = async (req, res) => {
  try {
    const { status, limit = 10 } = req.query;
    
    const query = {};
    if (status) {
      query.status = status;
    }
    
    const emis = await EMI.find(query)
      .sort({ dueDate: 1 })
      .limit(parseInt(limit));
    
    // Update status for unpaid future EMIs to 'Upcoming' before sending
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const updatedEmis = emis.map(emi => {
      // Update the status for display (don't save to DB)
      if (emi.status === 'Unpaid' && new Date(emi.dueDate) > today) {
        emi.status = 'Upcoming';
      }
      return emi;
    });
    
    res.status(200).json(updatedEmis);
  } catch (error) {
    console.error('Error fetching EMIs:', error);
    res.status(500).json({ message: 'Error fetching EMIs', error: error.message });
  }
};

// Get EMI by ID
exports.getEMIById = async (req, res) => {
  try {
    const emi = await EMI.findById(req.params.id);
    
    if (!emi) {
      return res.status(404).json({ message: 'EMI not found' });
    }
    
    // Update status for unpaid future EMIs to 'Upcoming' before sending
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (emi.status === 'Unpaid' && new Date(emi.dueDate) > today) {
      emi.status = 'Upcoming';
    }
    
    res.status(200).json(emi);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching EMI', error: error.message });
  }
};

// Get all EMIs for a loan
exports.getEMIsByLoanId = async (req, res) => {
  try {
    const emis = await EMI.find({ loan: req.params.loanId }).sort({ dueDate: 1 });
    
    // Update status for unpaid future EMIs to 'Upcoming' before sending
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const updatedEmis = emis.map(emi => {
      // Update the status for display (don't save to DB)
      if (emi.status === 'Unpaid' && new Date(emi.dueDate) > today) {
        emi.status = 'Upcoming';
      }
      return emi;
    });
    
    res.status(200).json(updatedEmis);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching EMIs', error: error.message });
  }
};

// Update EMI
exports.updateEMI = async (req, res) => {
  try {
    const { status, paidAmount, paidDate, paymentMode } = req.body;
    
    const emi = await EMI.findById(req.params.id);
    
    if (!emi) {
      return res.status(404).json({ message: 'EMI not found' });
    }
    
    // Update fields if provided
    if (status) emi.status = status;
    if (paidAmount) emi.paidAmount = paidAmount;
    if (paidDate) emi.paidDate = paidDate;
    if (paymentMode) emi.paymentMode = paymentMode;
    
    await emi.save();
    
    res.status(200).json(emi);
  } catch (error) {
    res.status(500).json({ message: 'Error updating EMI', error: error.message });
  }
};

// Record a payment for an EMI
exports.recordEMIPayment = async (req, res) => {
  try {
    console.log('recordEMIPayment called with params:', req.params);
    console.log('recordEMIPayment request body:', req.body);
    
    // Extract parameters, support both paymentMethod and paymentMode
    const { paymentDate, paymentMethod, paymentMode, notes } = req.body;
    const effectivePaymentMode = paymentMode || paymentMethod || 'cash'; // Use either one, with fallback
    
    // Find the EMI
    const emi = await EMI.findById(req.params.id);
    if (!emi) {
      console.error(`EMI not found with ID: ${req.params.id}`);
      return res.status(404).json({ message: 'EMI not found' });
    }
    
    console.log(`Found EMI: ${emi._id}, amount: ${emi.amount}`);
    
    // Find the associated loan
    const loan = await Loan.findById(emi.loan).populate('borrower', 'fullName phoneNumber');
    if (!loan) {
      console.error(`Associated loan not found for EMI: ${emi._id}`);
      return res.status(404).json({ message: 'Associated loan not found' });
    }
    
    console.log(`Found loan: ${loan._id}, borrower: ${loan.borrower ? loan.borrower.fullName : 'Unknown'}`);
    
    // Update EMI with payment information - always use EMI amount
    emi.paidAmount = emi.amount;
    emi.paidDate = paymentDate || new Date();
    emi.paymentMode = effectivePaymentMode;
    
    // Determine payment status
    const dueDate = new Date(emi.dueDate);
    const paymentDateObj = new Date(emi.paidDate);
    
    if (paymentDateObj < dueDate) {
      emi.status = 'Advance paid';
    } else if (paymentDateObj.toDateString() === dueDate.toDateString()) {
      emi.status = 'Paid on time';
    } else {
      emi.status = 'Paid late';
    }
    
    // Update loan's amountPaid
    loan.amountPaid = (loan.amountPaid || 0) + emi.amount;
    
    // Save both EMI and loan
    await emi.save();
    await loan.save();
    
    // Create a payment record object with correct borrower information
    const paymentRecord = {
      _id: emi._id,
      loanId: loan._id,
      borrowerName: loan.borrower ? loan.borrower.fullName : 'Unknown',
      amount: emi.amount,
      paymentDate: emi.paidDate,
      paymentMode: emi.paymentMode,
      status: emi.status,
      notes: notes || ''
    };
    
    console.log('Payment successfully recorded:', paymentRecord);
    
    res.status(200).json({
      success: true,
      emi,
      loan,
      payment: paymentRecord
    });
  } catch (error) {
    console.error('Error recording EMI payment:', error);
    res.status(500).json({ 
      message: 'Error recording EMI payment',
      error: error.message
    });
  }
}; 