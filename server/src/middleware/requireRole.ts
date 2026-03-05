import { Request, Response, NextFunction } from 'express';

/**
 * Factory: creates a middleware that verifies the user is a global admin.
 */
export function requireGlobalAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user?.isGlobalAdmin) {
    res.status(403).json({ message: 'אין הרשאת מנהל מערכת' });
    return;
  }
  next();
}

/**
 * Factory: creates a middleware that verifies the user is a group admin
 * for the :groupId URL param, or a global admin.
 */
export function requireGroupAdmin(req: Request, res: Response, next: NextFunction) {
  const { groupId } = req.params;
  const user = req.user;

  if (!user) {
    res.status(401).json({ message: 'לא מחובר' });
    return;
  }

  const isGroupAdmin = user.groups?.some(
    (g) => g.groupId === groupId && g.isAdmin
  );

  if (!isGroupAdmin && !user.isGlobalAdmin) {
    res.status(403).json({ message: 'אין הרשאת ניהול לקבוצה זו' });
    return;
  }

  next();
}
