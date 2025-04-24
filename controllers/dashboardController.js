const Loan = require('../models/Loan');
const EMI = require('../models/EMI');
const Borrower = require('../models/Borrower');

// Get dashboard statistics
exports.getDashboardStats = async (req, res) => {
  try {
    // Get all loans by status
    const activeLoans = await Loan.find({ status: 'Active' });
    const closedLoans = await Loan.find({ status: 'Closed' });
    
    // Calculate total invested amount (sum of all active loan principals)
    const totalInvestedAmount = activeLoans.reduce((total, loan) => total + loan.principal, 0);
    
    // Find all EMIs
    const allEMIs = await EMI.find();
    
    // Get today's date without time
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Categorize EMIs by status
    const paidEMIs = allEMIs.filter(emi => 
      emi.status === 'Paid on time' || emi.status === 'Paid late'
    );
    const advancePaidEMIs = allEMIs.filter(emi => emi.status === 'Advance paid');
    const unpaidEMIs = allEMIs.filter(emi => emi.status === 'Unpaid');
    const upcomingEMIs = unpaidEMIs.filter(emi => new Date(emi.dueDate) > today);
    const overdueEMIs = unpaidEMIs.filter(emi => new Date(emi.dueDate) < today);
    
    // Calculate financial metrics
    const totalRecoveredAmount = paidEMIs.reduce((total, emi) => total + (emi.paidAmount || 0), 0);
    const advanceCollectedAmount = advancePaidEMIs.reduce((total, emi) => total + (emi.paidAmount || 0), 0);
    const totalCollectedAmount = totalRecoveredAmount + advanceCollectedAmount;
    
    // Calculate total principal amount (active + closed loans)
    const totalPrincipalAmount = activeLoans.reduce((total, loan) => total + loan.principal, 0) + 
                               closedLoans.reduce((total, loan) => total + loan.principal, 0);
    
    // Calculate profit (total collected minus total principal)
    const profit = totalCollectedAmount - totalPrincipalAmount;
    
    // Calculate pending amount (sum of all unpaid EMI amounts)
    const pendingAmount = unpaidEMIs.reduce((total, emi) => total + emi.amount, 0);
    
    // Calculate overdue amount (sum of all overdue EMI amounts)
    const overdueAmount = overdueEMIs.reduce((total, emi) => total + emi.amount, 0);
    
    // Get count of borrowers
    const borrowerCount = await Borrower.countDocuments();
    
    // Create tomorrow date for daily collection query
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Get today's EMIs count
    const todayEMIsCount = await EMI.find({
      dueDate: { $gte: today, $lt: tomorrow },
      status: 'Unpaid'
    }).countDocuments();
    
    // Calculate today's due amount
    const todayEMIs = await EMI.find({
      dueDate: { $gte: today, $lt: tomorrow },
      status: 'Unpaid'
    });
    const todayDueAmount = todayEMIs.reduce((total, emi) => total + emi.amount, 0);
    
    // Response with detailed statistics
    res.status(200).json({
      totalInvestedAmount,
      totalRecoveredAmount: totalCollectedAmount,
      advanceCollectedAmount,
      totalProfit: profit,
      pendingAmount,
      overdueAmount,
      activeLoanCount: activeLoans.length,
      totalBorrowerCount: borrowerCount,
      loanStats: {
        activeLoans: activeLoans.length,
        closedLoans: closedLoans.length,
        totalLoans: activeLoans.length + closedLoans.length
      },
      emiStats: {
        todayEMIs: todayEMIsCount,
        todayDueAmount,
        overdueEMIs: overdueEMIs.length,
        totalEMIs: allEMIs.length,
        paidEMIs: paidEMIs.length,
        advancePaidEMIs: advancePaidEMIs.length,
        unpaidEMIs: unpaidEMIs.length,
        upcomingEMIs: upcomingEMIs.length
      },
      collectionStats: {
        totalRecovered: totalRecoveredAmount,
        advanceCollected: advanceCollectedAmount,
        totalCollected: totalCollectedAmount,
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard statistics:', error);
    res.status(500).json({ message: 'Error fetching dashboard statistics', error: error.message });
  }
};

// Get monthly collections summary
exports.getMonthlyCollections = async (req, res) => {
  try {
    const { year } = req.query;
    
    // Default to current year if not provided
    const selectedYear = year ? parseInt(year) : new Date().getFullYear();
    
    // Array to hold monthly collection data
    const monthlyData = Array(12).fill(0);
    
    // Find all EMIs that were paid in the selected year
    const paidEMIs = await EMI.find({
      paidDate: { 
        $gte: new Date(`${selectedYear}-01-01`), 
        $lt: new Date(`${selectedYear + 1}-01-01`) 
      },
      status: { $in: ['Paid on time', 'Paid late', 'Advance paid'] }
    });
    
    // Aggregate paid amounts by month
    paidEMIs.forEach(emi => {
      const paidDate = new Date(emi.paidDate);
      const month = paidDate.getMonth(); // 0-indexed month
      monthlyData[month] += emi.paidAmount;
    });
    
    // Monthly labels
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    
    res.status(200).json({
      year: selectedYear,
      months,
      collections: monthlyData,
      totalCollection: monthlyData.reduce((total, month) => total + month, 0)
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching monthly collections', error: error.message });
  }
};

// Get top borrowers by loan amount
exports.getTopBorrowers = async (req, res) => {
  try {
    // Get all borrowers
    const borrowers = await Borrower.find();
    
    // For each borrower, find their active loans
    const borrowerData = await Promise.all(
      borrowers.map(async (borrower) => {
        const activeLoans = await Loan.find({ 
          borrower: borrower._id,
          status: 'Active'
        });
        
        const totalLoanAmount = activeLoans.reduce((total, loan) => total + loan.principal, 0);
        
        return {
          _id: borrower._id,
          fullName: borrower.fullName,
          phoneNumber: borrower.phoneNumber,
          cibilScore: borrower.cibilScore,
          isLoyal: borrower.isLoyal,
          activeLoansCount: activeLoans.length,
          totalLoanAmount
        };
      })
    );
    
    // Sort by total loan amount and get top 10
    const topBorrowers = borrowerData
      .filter(borrower => borrower.activeLoansCount > 0)
      .sort((a, b) => b.totalLoanAmount - a.totalLoanAmount)
      .slice(0, 10);
    
    res.status(200).json(topBorrowers);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching top borrowers', error: error.message });
  }
};

// Get daily collections (due today)
exports.getDailyCollection = async (req, res) => {
  try {
    // Get today's date (without time)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Find all EMIs due today
    const todayEMIs = await EMI.find({
      dueDate: { $gte: today, $lt: tomorrow },
      status: 'Unpaid'
    }).populate({
      path: 'loan',
      populate: { path: 'borrower' }
    });
    
    // Find all EMIs due in the future that are unpaid for upcoming collections
    const futureEMIs = await EMI.find({
      dueDate: { $gte: tomorrow },
      status: 'Unpaid'
    }).populate({
      path: 'loan',
      populate: { path: 'borrower' }
    }).sort({ dueDate: 1 }).limit(10); // Limit to the next 10 future EMIs
    
    // Format the data for frontend
    const todayCollections = todayEMIs.map(emi => {
      return {
        _id: emi._id.toString(),
        borrower: emi.loan.borrower,
        loan: emi.loan,
        emi: {
          _id: emi._id,
          amount: emi.amount,
          dueDate: emi.dueDate,
          status: emi.status
        },
        dueDate: emi.dueDate,
        amount: emi.amount,
        status: emi.status
      };
    });
    
    // Format the upcoming collections, mark them as "Upcoming"
    const upcomingCollections = futureEMIs.map(emi => {
      return {
        _id: emi._id.toString(),
        borrower: emi.loan.borrower,
        loan: emi.loan,
        emi: {
          _id: emi._id,
          amount: emi.amount,
          dueDate: emi.dueDate,
          status: 'Upcoming'
        },
        dueDate: emi.dueDate,
        amount: emi.amount,
        status: 'Upcoming'
      };
    });
    
    // Combine today's and upcoming collections
    const collections = [...todayCollections, ...upcomingCollections];
    
    res.status(200).json(collections);
  } catch (error) {
    console.error('Error fetching daily collections:', error);
    res.status(500).json({ message: 'Error fetching daily collections', error: error.message });
  }
}; 