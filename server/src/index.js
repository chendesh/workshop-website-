import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import authRoutes from './routes/auth.routes.js';
import workersRoutes from './routes/workers.routes.js';
import workLogsRoutes from './routes/workLogs.routes.js';
import attendanceRoutes from './routes/attendance.routes.js';
import wagesRoutes from './routes/wages.routes.js';
import campsRoutes from './routes/camps.routes.js';
import reportsRoutes from './routes/reports.routes.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

// ── API Routes ──────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/workers', workersRoutes);
app.use('/api/work-logs', workLogsRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/wages', wagesRoutes);
app.use('/api/camps', campsRoutes);
app.use('/api/reports', reportsRoutes);

// ── Serve Frontend (React SPA) ─────────────────────────────
const clientDistPath = path.join(__dirname, '../public');
app.use(express.static(clientDistPath));

// Catch-all: send index.html for any non-API route (React Router handles it)
app.get('*', (req, res) => {
  res.sendFile(path.join(clientDistPath, 'index.html'));
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
