const Loan = require('../models/Loan');
const EMI = require('../models/EMI');
const Borrower = require('../models/Borrower');

/**
 * Get loan summary report
 */
exports.getLoanSummaryReport = async (req, res) => {
  try {
    const loanSummary = await Loan.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          totalAmount: { $sum: "$principal" }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: loanSummary
    });
  } catch (error) {
    console.error('Error getting loan summary report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate loan summary report',
      error: error.message
    });
  }
};

/**
 * Get payment collection report
 */
exports.getPaymentCollectionReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const query = {};
    if (startDate && endDate) {
      query.paidDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }
    
    const paymentReport = await EMI.aggregate([
      { $match: { ...query, status: { $in: ['Paid on time', 'Paid late', 'Advance paid'] } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$paidDate" } },
          totalAmount: { $sum: "$paidAmount" },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    
    res.status(200).json({
      success: true,
      data: paymentReport
    });
  } catch (error) {
    console.error('Error getting payment collection report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate payment collection report',
      error: error.message
    });
  }
};

/**
 * Get overdue EMIs report
 */
exports.getOverdueEMIsReport = async (req, res) => {
  try {
    const today = new Date();
    
    const overdueEmis = await EMI.find({
      dueDate: { $lt: today },
      status: 'Unpaid'
    })
    .populate({
      path: 'loan',
      populate: {
        path: 'borrower',
        select: 'fullName phoneNumber address'
      }
    });
    
    res.status(200).json({
      success: true,
      count: overdueEmis.length,
      data: overdueEmis
    });
  } catch (error) {
    console.error('Error getting overdue EMIs report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate overdue EMIs report',
      error: error.message
    });
  }
};

/**
 * Get report summary data for the reports screen
 */
exports.getReportSummary = async (req, res) => {
  try {
    const { period = 'month' } = req.query;
    const today = new Date();
    
    // Get borrower count
    const totalBorrowers = await Borrower.countDocuments();
    
    // Get loan stats
    const activeLoans = await Loan.countDocuments({ status: 'Active' });
    const completedLoans = await Loan.countDocuments({ status: 'Closed' });
    
    // Calculate financial metrics
    const allLoans = await Loan.find();
    const totalPrincipal = allLoans.reduce((sum, loan) => sum + loan.principal, 0);
    
    // Get all EMIs
    const allEMIs = await EMI.find();
    const paidEMIs = allEMIs.filter(emi => 
      emi.status === 'Paid on time' || emi.status === 'Paid late' || emi.status === 'Advance paid'
    );
    
    // Calculate total collected amount
    const totalCollected = paidEMIs.reduce((sum, emi) => sum + emi.paidAmount, 0);
    
    // Calculate outstanding amount
    const unpaidEMIs = allEMIs.filter(emi => emi.status === 'Unpaid');
    const outstandingAmount = unpaidEMIs.reduce((sum, emi) => sum + emi.amount, 0);
    
    // Calculate total interest earned
    const totalRepayable = allLoans.reduce((sum, loan) => sum + loan.totalRepayable, 0);
    const totalInterestEarned = totalCollected - totalPrincipal > 0 ? totalCollected - totalPrincipal : 0;
    
    // Calculate collection rate (percentage of expected EMIs that have been collected)
    const collectionRate = totalCollected > 0 && totalRepayable > 0 
      ? (totalCollected / totalRepayable) * 100 
      : 0;
    
    // Monthly collections
    const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    
    // This month collections
    const thisMonthPaidEMIs = paidEMIs.filter(emi => 
      emi.paidDate && new Date(emi.paidDate) >= thisMonth && new Date(emi.paidDate) < nextMonth
    );
    const thisMonthCollections = thisMonthPaidEMIs.reduce((sum, emi) => sum + emi.paidAmount, 0);
    
    // Last month collections
    const lastMonthPaidEMIs = paidEMIs.filter(emi => 
      emi.paidDate && new Date(emi.paidDate) >= lastMonth && new Date(emi.paidDate) < thisMonth
    );
    const lastMonthCollections = lastMonthPaidEMIs.reduce((sum, emi) => sum + emi.paidAmount, 0);
    
    // Respond with the summary data
    res.status(200).json({
      totalBorrowers,
      activeLoans,
      completedLoans,
      totalPrincipal,
      totalCollected,
      outstandingAmount,
      totalInterestEarned,
      collectionRate,
      thisMonthCollections,
      lastMonthCollections
    });
  } catch (error) {
    console.error('Error generating report summary:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate report summary',
      error: error.message
    });
  }
}; 