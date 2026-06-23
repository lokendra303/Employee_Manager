import '../src/lib/loadEnv.js';
import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import workersRoutes from './routes/workers.js';
import distributorsRoutes from './routes/distributors.js';
import attendanceRoutes from './routes/attendance.js';
import payRoutes from './routes/pay.js';
import reportsRoutes from './routes/reports.js';
import systemRoutes from './routes/system.js';
import fundRequestsRoutes from './routes/fundRequests.js';
import walletRoutes from './routes/wallet.js';
import { error } from './lib/response.js';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
  })
);
app.use(express.json());

app.get('/api/v1/health', (_req, res) => {
  res.json({ success: true, data: { status: 'ok' } });
});

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/workers', workersRoutes);
app.use('/api/v1/distributors', distributorsRoutes);
app.use('/api/v1/attendance', attendanceRoutes);
app.use('/api/v1/pay', payRoutes);
app.use('/api/v1/reports', reportsRoutes);
app.use('/api/v1/system', systemRoutes);
app.use('/api/v1/fund-requests', fundRequestsRoutes);
app.use('/api/v1/wallet', walletRoutes);

app.use((_req, res) => {
  error(res, 'NOT_FOUND', 'Route not found', 404);
});

app.use((err, _req, res, _next) => {
  console.error(err);
  error(res, 'SERVER_ERROR', 'Internal server error', 500);
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
