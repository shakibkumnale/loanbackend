# Loan Management Backend

Backend API for Loan Management Application

## Deployment on Vercel

### Prerequisites
- Node.js
- MongoDB Atlas account
- Vercel account

### Environment Variables
Make sure to set these environment variables in Vercel:

- `MONGODB_URI`: Your MongoDB connection string
- `NODE_ENV`: Set to "production"

### Deployment Steps

1. Push your code to GitHub
2. Log in to Vercel and import your Git repository
3. Configure the project:
   - Set the Build Command to `npm install`
   - Set the Output Directory to `.`
   - Add the environment variables mentioned above
4. Deploy

### Troubleshooting

If you encounter MongoDB connection issues:
- Ensure your MongoDB Atlas IP whitelist includes Vercel's IPs or is set to allow access from anywhere (0.0.0.0/0)
- Check that your MongoDB Atlas user has the correct permissions
- Verify your connection string is correct in the environment variables

## API Routes

- `GET /api/health`: Health check endpoint
- `/api/borrowers`: Borrower management
- `/api/loans`: Loan management
- `/api/payments`: Payment management
- `/api/dashboard`: Dashboard data
- `/api/emis`: EMI calculations
- `/api/reports`: Report generation

## Local Development

```
npm install
npm run dev
```

The server will run on port 5000 by default. 