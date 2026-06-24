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

const defaultOrigins = [
  'http://localhost:5173', // Vite web client
  'http://localhost:8081', // Expo web
  'http://localhost:19006', // Expo web (alternate port)
];

function getAllowedOrigins() {
  const fromEnv = process.env.CLIENT_URL
    ? process.env.CLIENT_URL.split(',').map((s) => s.trim()).filter(Boolean)
    : [];
  return [...new Set([...defaultOrigins, ...fromEnv])];
}

function isAllowedOrigin(origin) {
  if (!origin) return true;
  if (getAllowedOrigins().includes(origin)) return true;
  return (
    /^https?:\/\/localhost(:\d+)?$/i.test(origin) ||
    /^https?:\/\/127\.0\.0\.1(:\d+)?$/i.test(origin) ||
    /^https?:\/\/10\.0\.2\.2(:\d+)?$/i.test(origin)
  );
}

app.use(
  cors({
    origin(origin, callback) {
      callback(null, isAllowedOrigin(origin));
    },
    credentials: true,
  })
);
app.use(express.json());

app.get('/api/v1/health', (_req, res) => {
  res.json({ success: true, data: { status: 'ok' } });
});

app.get(['/api/v1', '/api/v1/'], (_req, res) => {
  res.json({
    success: true,
    data: {
      name: 'Attendance Manager API',
      version: 'v1',
      status: 'ok',
      health: '/api/v1/health',
    },
  });
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

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Network access: http://<your-pc-ip>:${PORT}/api/v1`);
});
