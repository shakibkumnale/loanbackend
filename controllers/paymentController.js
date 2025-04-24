const EMI = require('../models/EMI');
const Loan = require('../models/Loan');
const Borrower = require('../models/Borrower');

// Record payment for EMI
exports.recordPayment = async (req, res) => {
  try {
    const { emiId, paymentDate, paymentMode, isLenderDelay, notes } = req.body;
    
    console.log('Payment request received:', req.body);
    
    // Basic validation
    if (!emiId || !paymentDate || !paymentMode) {
      return res.status(400).json({ 
        message: 'Please provide emiId, paymentDate, and paymentMode' 
      });
    }
    
    // Check if payment mode is valid
    if (!['cash', 'online', 'advance'].includes(paymentMode)) {
      return res.status(400).json({ message: 'Payment mode must be "cash", "online", or "advance"' });
    }
    
    // Find EMI
    const emi = await EMI.findById(emiId);
    if (!emi) {
      return res.status(404).json({ message: 'EMI not found' });
    }
    
    // Find loan for this EMI
    const loan = await Loan.findById(emi.loan).populate('borrower', 'fullName phoneNumber cibilScore');
    if (!loan) {
      return res.status(404).json({ message: 'Loan not found' });
    }
    
    // Find borrower for this loan
    const borrower = loan.borrower || await Borrower.findById(loan.borrower);
    if (!borrower) {
      return res.status(404).json({ message: 'Borrower not found' });
    }
    
    console.log('Found EMI, loan, and borrower:', { 
      emiId: emi._id, 
      loanId: loan._id, 
      borrowerId: borrower._id || 'embedded'
    });
    
    // Update EMI with payment information
    emi.paidAmount = emi.amount;
    emi.paidDate = new Date(paymentDate);
    emi.paymentMode = paymentMode;
    // Add notes if provided
    if (notes) {
      emi.notes = notes;
    }
    
    // Determine payment status
    const today = new Date();
    const dueDate = new Date(emi.dueDate);
    
    if (paymentMode === 'advance') {
      // For advance payments, always mark as 'Advance paid'
      console.log('Marking as advance payment');
      emi.status = 'Advance paid';
      // Update borrower's CIBIL score for advance payment
      borrower.cibilScore += 2;
    } else if (isLenderDelay) {
      // If it's a lender delay, mark as 'Paid on time' regardless of actual date
      console.log('Marking as lender delay (on time)');
      emi.status = 'Paid on time';
      // No CIBIL impact for lender delay
    } else if (today <= dueDate) {
      // On-time payment
      console.log('Marking as paid on time');
      emi.status = 'Paid on time';
      borrower.cibilScore += 1;
    } else {
      // Late payment
      console.log('Marking as paid late');
      emi.status = 'Paid late';
      borrower.cibilScore -= 1;
    }
    
    await borrower.save();
    await emi.save();
    
    // Check if all EMIs are paid to close the loan
    const allEmis = await EMI.find({ loan: loan._id });
    const allEmisPaid = allEmis.every(emi => 
      emi.status === 'Paid on time' || emi.status === 'Paid late' || emi.status === 'Advance paid'
    );
    
    if (allEmisPaid && loan.status === 'Active') {
      loan.status = 'Closed';
      await loan.save();
    }
    
    // Create payment record with proper borrower information
    const paymentRecord = {
      _id: emi._id,
      loanId: loan._id.toString(),
      borrowerName: borrower.fullName || 'Unknown',
      amount: emi.amount,
      paymentDate: emi.paidDate,
      paymentMode: emi.paymentMode,
      status: emi.status,
      isLenderDelay,
      notes: notes || ''
    };
    
    console.log('Payment successfully recorded', paymentRecord);
    
    res.status(200).json({ 
      emi,
      loanStatus: loan.status,
      borrowerScore: borrower.cibilScore,
      payment: paymentRecord
    });
  } catch (error) {
    console.error('Error recording payment:', error);
    res.status(500).json({ message: 'Error recording payment', error: error.message });
  }
};

// Get EMIs due today
exports.getEMIsDueToday = async (req, res) => {
  try {
    // Get today's date (only year, month, day)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Find EMIs due today that are unpaid
    const emis = await EMI.find({
      dueDate: { $gte: today, $lt: tomorrow },
      status: 'Unpaid'
    }).populate({
      path: 'loan',
      select: 'borrower principal interestRate',
      populate: {
        path: 'borrower',
        select: 'fullName phoneNumber'
      }
    });
    
    const totalDueToday = emis.reduce((total, emi) => total + emi.amount, 0);
    
    res.status(200).json({
      emis,
      totalDueToday,
      count: emis.length
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching EMIs due today', error: error.message });
  }
};

// Mark EMI as missed
exports.markEMIAsMissed = async (req, res) => {
  try {
    const { emiId } = req.params;
    
    // Find EMI
    const emi = await EMI.findById(emiId);
    if (!emi) {
      return res.status(404).json({ message: 'EMI not found' });
    }
    
    // Only unpaid EMIs can be marked as missed
    if (emi.status !== 'Unpaid') {
      return res.status(400).json({ message: 'Only unpaid EMIs can be marked as missed' });
    }
    
    // Find loan for this EMI
    const loan = await Loan.findById(emi.loan);
    if (!loan) {
      return res.status(404).json({ message: 'Loan not found' });
    }
    
    // Find borrower for this loan
    const borrower = await Borrower.findById(loan.borrower);
    if (!borrower) {
      return res.status(404).json({ message: 'Borrower not found' });
    }
    
    // Update borrower's CIBIL score for missed payment
    borrower.cibilScore -= 2;
    await borrower.save();
    
    res.status(200).json({
      message: 'EMI marked as missed and CIBIL score updated',
      borrowerScore: borrower.cibilScore
    });
  } catch (error) {
    res.status(500).json({ message: 'Error marking EMI as missed', error: error.message });
  }
};

// Get all payments (paid EMIs)
exports.getAllPayments = async (req, res) => {
  try {
    // Find all EMIs that have been paid
    const paidEMIs = await EMI.find({
      status: { $in: ['Paid on time', 'Paid late', 'Advance paid'] }
    }).populate({
      path: 'loan',
      select: '_id borrower', 
      populate: {
        path: 'borrower',
        select: 'fullName'
      }
    }).sort({ paidDate: -1 });

    // Format the data for frontend
    const payments = paidEMIs.map(emi => {
      // Extract borrower information
      const borrowerName = emi.loan && 
                          emi.loan.borrower && 
                          emi.loan.borrower.fullName ? 
                          emi.loan.borrower.fullName : 'Unknown';
      
      return {
        _id: emi._id,
        loanId: emi.loan._id.toString(),
        borrowerName: borrowerName,
        amount: emi.paidAmount,
        paymentDate: emi.paidDate,
        paymentMode: emi.paymentMode,
        status: emi.status,
        notes: emi.notes || ''
      };
    });
    
    res.status(200).json(payments);
  } catch (error) {
    console.error('Error fetching payment records:', error);
    res.status(500).json({ message: 'Error fetching payment records', error: error.message });
  }
}; 