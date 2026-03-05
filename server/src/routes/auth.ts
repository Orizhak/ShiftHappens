import { Router } from 'express';
import { login, register, setSessionCookie, clearSessionCookie } from '../services/authService';
import { Gender } from '../types';

const router = Router();

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      res.status(400).json({ message: 'שם משתמש וסיסמה נדרשים' });
      return;
    }
    const user = await login(username, password);
    setSessionCookie(res, user);
    res.json({ user });
  } catch (err: any) {
    res.status(401).json({ message: err.message });
  }
});

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { username, password, name, gender } = req.body;
    if (!username || !password || !name || !gender) {
      res.status(400).json({ message: 'כל השדות נדרשים' });
      return;
    }
    const user = await register({ username, password, name, gender: gender as Gender });
    setSessionCookie(res, user);
    res.status(201).json({ user });
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  clearSessionCookie(res);
  res.json({ ok: true });
});

// GET /api/auth/me  — returns current session user
router.get('/me', (req, res) => {
  const raw = req.cookies?.session;
  if (!raw) {
    res.status(401).json({ message: 'לא מחובר' });
    return;
  }
  try {
    res.json({ user: JSON.parse(raw) });
  } catch {
    res.status(401).json({ message: 'Session פגום' });
  }
});

export default router;
