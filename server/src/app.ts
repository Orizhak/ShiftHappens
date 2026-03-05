import path from 'path';
import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';

import authRoutes from './routes/auth';
import userRoutes from './routes/user';
import groupAdminRoutes from './routes/groupAdmin';
import globalAdminRoutes from './routes/globalAdmin';

const app = express();

// ─── Core middleware ──────────────────────────────────────────────────────────
app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN ?? 'http://localhost:5173',
    credentials: true, // allow cookies cross-origin in dev
  })
);

// ─── API routes ───────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/group-admin/:groupId', groupAdminRoutes);
app.use('/api/global-admin', globalAdminRoutes);

// Public: list all groups (used in register page)
import { getAllGroups } from './services/userService';
app.get('/api/groups', async (_req, res) => {
  try {
    const groups = await getAllGroups();
    res.json({ groups });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// ─── Serve React SPA in production ────────────────────────────────────────────
if (process.env.NODE_ENV === 'production') {
  const clientDist = path.join(process.cwd(), '..', 'client', 'dist');
  app.use(express.static(clientDist));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

export default app;
