import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.routes.js';
import workersRoutes from './routes/workers.routes.js';
import workLogsRoutes from './routes/workLogs.routes.js';
import attendanceRoutes from './routes/attendance.routes.js';
import wagesRoutes from './routes/wages.routes.js';
import campsRoutes from './routes/camps.routes.js';
import reportsRoutes from './routes/reports.routes.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/workers', workersRoutes);
app.use('/api/work-logs', workLogsRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/wages', wagesRoutes);
app.use('/api/camps', campsRoutes);
app.use('/api/reports', reportsRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
