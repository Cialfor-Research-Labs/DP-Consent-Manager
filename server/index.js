import express from 'express';
import cors from 'cors';
import apiRouter from './routes/apiRoutes.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Register API Routes
app.use('/api', apiRouter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'HEALTHY',
    service: 'Data Principal Consent Manager Backend API',
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🚀 DP Consent Manager Backend API running on port ${PORT}`);
  console.log(`🔗 REST Base URL: http://localhost:${PORT}/api`);
  console.log(`====================================================`);
});
