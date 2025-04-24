const mongoose = require('mongoose');
const dotenv = require('dotenv');
const EMI = require('./models/EMI');

// Load environment variables
dotenv.config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(async () => {
  console.log('MongoDB connected');
  
  try {
    // Get first 5 EMIs
    const emis = await EMI.find().limit(5);
    
    console.log('EMI IDs:');
    emis.forEach(emi => {
      console.log(`ID: ${emi._id.toString()}, Status: ${emi.status}, EMI Number: ${emi.emiNumber}, Loan: ${emi.loan.toString()}`);
    });
    
    // Get unpaid EMIs for the current date (April 9, 2025)
    const today = new Date('2025-04-09');
    const unpaidEmis = await EMI.find({
      status: 'Unpaid',
      dueDate: { $lte: today }
    }).limit(5);
    
    console.log('\nUnpaid EMIs due today or earlier:');
    if (unpaidEmis.length === 0) {
      console.log('No unpaid EMIs due today or earlier');
    } else {
      unpaidEmis.forEach(emi => {
        console.log(`ID: ${emi._id.toString()}, Due Date: ${emi.dueDate.toDateString()}, Loan: ${emi.loan.toString()}`);
      });
    }
    
    mongoose.disconnect();
    console.log('Done');
  } catch (error) {
    console.error('Error:', error);
    mongoose.disconnect();
  }
})
.catch(err => console.log('MongoDB connection error:', err)); 