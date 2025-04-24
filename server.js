const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const morgan = require('morgan');
const dotenv = require('dotenv');

// Import routes
const borrowerRoutes = require('./routes/borrowerRoutes');
const loanRoutes = require('./routes/loanRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const emiRoutes = require('./routes/emiRoutes');
const reportRoutes = require('./routes/reportRoutes');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// CORS configuration with specific origin for React Native
const corsOptions = {
  origin: '*', // Allow all origins for React Native
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan('dev'));

// Connection to MongoDB - with retry logic
const connectWithRetry = () => {
  console.log('MongoDB connection with retry');
  mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 30000,
    socketTimeoutMS: 45000,
    connectTimeoutMS: 30000,
    maxPoolSize: 10,
    heartbeatFrequencyMS: 2000,
  })
  .then(() => {
    console.log('MongoDB connected successfully');
  })
  .catch(err => {
    console.log('MongoDB connection error:', err);
    console.log('Retrying in 5 seconds...');
    setTimeout(connectWithRetry, 5000);
  });
};

connectWithRetry();

// Health check route for Vercel
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Server is healthy' });
});

// Routes
app.use('/api/borrowers', borrowerRoutes);
app.use('/api/loans', loanRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/emis', emiRoutes);
app.use('/api/reports', reportRoutes);

// Basic route
app.get('/', (req, res) => {
  res.send('Loan Management API is running');
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Server error',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal Server Error'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.log('UNHANDLED REJECTION! 💥 Shutting down...');
  console.log(err.name, err.message);
  // Don't crash the server on Vercel
  // process.exit(1);
});

module.exports = app; // For Vercel serverless functions 