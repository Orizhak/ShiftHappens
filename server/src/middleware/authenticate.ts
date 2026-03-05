import { Request, Response, NextFunction } from 'express';
import { SessionUser } from '../types';

// Extend Express Request so downstream handlers get req.user
declare global {
  namespace Express {
    interface Request {
      user?: SessionUser;
    }
  }
}

const SESSION_COOKIE = 'session';

/**
 * Parses the httpOnly session cookie and attaches req.user.
 * Returns 401 if the cookie is missing or malformed.
 */
export function authenticate(req: Request, res: Response, next: NextFunction) {
  const raw = req.cookies?.[SESSION_COOKIE];

  if (!raw) {
    res.status(401).json({ message: 'לא מחובר' });
    return;
  }

  try {
    req.user = JSON.parse(raw) as SessionUser;
    next();
  } catch {
    res.status(401).json({ message: 'Session פגום' });
  }
}
