import bcrypt from 'bcryptjs';
import { collections, convertTimestamps } from '../firebase/db';
import { User, Gender, SessionUser } from '../types';

const SALT_ROUNDS = 10;
const SESSION_COOKIE = 'session';
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days in seconds

// ─── Cookie helpers ───────────────────────────────────────────────────────────
export function setSessionCookie(res: import('express').Response, user: SessionUser) {
  res.cookie(SESSION_COOKIE, JSON.stringify(user), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_MAX_AGE * 1000, // express uses ms
    path: '/',
  });
}

export function clearSessionCookie(res: import('express').Response) {
  res.clearCookie(SESSION_COOKIE, { path: '/' });
}

// ─── Auth operations ─────────────────────────────────────────────────────────
export async function login(username: string, password: string): Promise<SessionUser> {
  const snapshot = await collections.users
    .where('username', '==', username)
    .limit(1)
    .get();

  if (snapshot.empty) {
    throw new Error('שם משתמש או סיסמה שגויים');
  }

  const doc = snapshot.docs[0];
  const user = convertTimestamps<User>({ id: doc.id, ...doc.data() });

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    throw new Error('שם משתמש או סיסמה שגויים');
  }

  if (!user.isActive) {
    throw new Error('המשתמש אינו פעיל');
  }

  // Strip password from session
  const { password: _pw, ...sessionUser } = user;
  return sessionUser as SessionUser;
}

export async function register(data: {
  username: string;
  password: string;
  name: string;
  gender: Gender;
}): Promise<SessionUser> {
  // Check uniqueness
  const existing = await collections.users
    .where('username', '==', data.username)
    .limit(1)
    .get();

  if (!existing.empty) {
    throw new Error('שם משתמש כבר קיים');
  }

  const hashed = await bcrypt.hash(data.password, SALT_ROUNDS);

  const now = new Date();
  const newUser: Omit<User, 'id'> = {
    username: data.username,
    password: hashed,
    name: data.name,
    gender: data.gender,
    isActive: true,
    isGlobalAdmin: false,
    userCategories: [],
    groups: [],
    createdAt: now,
  };

  const ref = await collections.users.add(newUser);
  const { password: _pw, ...sessionUser } = { id: ref.id, ...newUser };
  return sessionUser as SessionUser;
}
