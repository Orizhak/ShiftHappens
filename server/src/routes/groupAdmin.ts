import { Router, Request } from 'express';
import { authenticate } from '../middleware/authenticate';
import { requireGroupAdmin } from '../middleware/requireRole';
import {
  getShiftsByGroupId,
  getShiftById,
  createShift,
  updateShift,
  deleteShift,
  getUsersForAssignment,
  performAutomaticAssignment,
  replaceUserInAssignment,
  completeExpiredShifts,
} from '../services/shiftService';
import { getUsersByGroupId, updateUser, getAllGroups, getGroupLeaderboard, getAllUsers, awardPointsForShift } from '../services/userService';
import { collections, convertTimestamps } from '../firebase/db';
import { UserCategory, ShiftStatus } from '../types';

/** Params inherited from parent mount: /api/group-admin/:groupId */
type GroupParams = { groupId: string };

const router = Router({ mergeParams: true });

// All group-admin routes require auth + group admin role
router.use(authenticate, requireGroupAdmin);

// ─── Shifts ──────────────────────────────────────────────────────────────────
// GET /api/group-admin/:groupId/shifts
router.get('/shifts', async (req: Request<GroupParams>, res) => {
  try {
    await completeExpiredShifts(req.params.groupId);
    const shifts = await getShiftsByGroupId(req.params.groupId);
    res.json({ shifts });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/group-admin/:groupId/shifts/:shiftId
router.get('/shifts/:shiftId', async (req, res) => {
  try {
    const shift = await getShiftById(req.params.shiftId);
    if (!shift) { res.status(404).json({ message: 'משמרת לא נמצאה' }); return; }
    res.json({ shift });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/group-admin/:groupId/shifts
router.post('/shifts', async (req: Request<GroupParams>, res) => {
  try {
    const shiftData = { ...req.body, groupId: req.params.groupId, createdAt: new Date() };
    const shift = await createShift(shiftData);
    res.status(201).json({ shift });
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
});

// PATCH /api/group-admin/:groupId/shifts/:shiftId
router.patch('/shifts/:shiftId', async (req, res) => {
  try {
    const { status: newStatus, ...otherData } = req.body;

    // Status transition validation
    if (newStatus !== undefined) {
      const shift = await getShiftById(req.params.shiftId);
      if (!shift) { res.status(404).json({ message: 'משמרת לא נמצאה' }); return; }

      const currentStatus = shift.status;
      const validTransitions: Record<number, number[]> = {
        [ShiftStatus.Active]: [ShiftStatus.Cancelled, ShiftStatus.Finished],
        [ShiftStatus.Cancelled]: [ShiftStatus.Active],
        [ShiftStatus.Finished]: [], // terminal — cannot undo
      };

      if (!validTransitions[currentStatus]?.includes(newStatus)) {
        res.status(400).json({ message: 'מעבר סטטוס לא חוקי' });
        return;
      }

      await updateShift(req.params.shiftId, { ...otherData, status: newStatus });

      // Award points on manual finish
      if (newStatus === ShiftStatus.Finished) {
        await awardPointsForShift(shift);
      }
    } else {
      await updateShift(req.params.shiftId, otherData);
    }

    res.json({ ok: true });
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE /api/group-admin/:groupId/shifts/:shiftId
router.delete('/shifts/:shiftId', async (req, res) => {
  try {
    await deleteShift(req.params.shiftId);
    res.json({ ok: true });
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
});

// ─── Assignment ───────────────────────────────────────────────────────────────
// POST /api/group-admin/:groupId/assignment/candidates
router.post('/assignment/candidates', async (req: Request<GroupParams>, res) => {
  try {
    const result = await getUsersForAssignment(req.params.groupId, req.body.shiftData);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/group-admin/:groupId/assignment/auto
router.post('/assignment/auto', async (req: Request<GroupParams>, res) => {
  try {
    const userIds = await performAutomaticAssignment(req.params.groupId, req.body.shiftData);
    res.json({ userIds });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/group-admin/:groupId/assignment/replace
router.post('/assignment/replace', async (req: Request<GroupParams>, res) => {
  try {
    const { shiftData, currentUsers, userToReplace } = req.body;
    const userIds = await replaceUserInAssignment(
      req.params.groupId,
      shiftData,
      currentUsers,
      userToReplace
    );
    res.json({ userIds });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// ─── Users ────────────────────────────────────────────────────────────────────
// GET /api/group-admin/:groupId/users
router.get('/users', async (req: Request<GroupParams>, res) => {
  try {
    const users = await getUsersByGroupId(req.params.groupId, true);
    // Strip password hashes
    const safe = users.map(({ password: _pw, ...u }) => u);
    res.json({ users: safe });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH /api/group-admin/:groupId/users/:userId/role
router.patch('/users/:userId/role', async (req: Request<GroupParams & { userId: string }>, res) => {
  try {
    const { groupId, userId } = req.params;
    const { action } = req.body; // 'makeAdmin' | 'removeAdmin' | 'removeFromGroup'

    const snap = await collections.users.doc(userId).get();
    if (!snap.exists) { res.status(404).json({ message: 'משתמש לא נמצא' }); return; }

    const user = snap.data() as any;
    const groups: any[] = user.groups ?? [];

    if (action === 'removeFromGroup') {
      // 1. Remove user from group membership
      await updateUser(userId, {
        groups: groups.filter((g: any) => g.groupId !== groupId),
      } as any);

      // 2. Remove user from future Active shifts in this group
      const shiftsSnap = await collections.shifts
        .where('groupId', '==', groupId)
        .where('status', '==', ShiftStatus.Active)
        .get();

      const now = new Date();
      for (const shiftDoc of shiftsSnap.docs) {
        const shiftData = shiftDoc.data() as any;
        const startDate = shiftData.startDate?.toDate ? shiftData.startDate.toDate() : new Date(shiftData.startDate);
        if (startDate > now && shiftData.users?.includes(userId)) {
          const updatedUsers = shiftData.users.filter((id: string) => id !== userId);
          await shiftDoc.ref.update({ users: updatedUsers });
        }
      }

      // 3. Delete userGroupPoints for this user+group
      const pointsSnap = await collections.userGroupPoints
        .where('userId', '==', userId)
        .where('groupId', '==', groupId)
        .get();
      for (const doc of pointsSnap.docs) {
        await doc.ref.delete();
      }
    } else {
      const updated = groups.map((g: any) =>
        g.groupId === groupId ? { ...g, isAdmin: action === 'makeAdmin' } : g
      );
      await updateUser(userId, { groups: updated } as any);
    }

    res.json({ ok: true });
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
});

// PATCH /api/group-admin/:groupId/users/:userId/categories
router.patch('/users/:userId/categories', async (req, res) => {
  try {
    const { userCategories } = req.body;
    await updateUser(req.params.userId, { userCategories });
    res.json({ ok: true });
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
});

// GET /api/group-admin/:groupId/available-users
router.get('/available-users', async (req: Request<GroupParams>, res) => {
  try {
    const allUsers = await getAllUsers();
    const available = allUsers
      .filter(u => !u.groups?.some((g: any) => g.groupId === req.params.groupId))
      .map(({ password: _pw, ...u }) => u);
    res.json({ users: available });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/group-admin/:groupId/users/add
router.post('/users/add', async (req: Request<GroupParams>, res) => {
  try {
    const { userIds } = req.body as { userIds: string[] };
    await Promise.all(
      userIds.map(async (uid) => {
        const doc = await collections.users.doc(uid).get();
        if (!doc.exists) return;
        const data = doc.data() as any;
        const groups: any[] = data.groups ?? [];
        const alreadyIn = groups.some((g: any) => g.groupId === req.params.groupId);
        if (!alreadyIn) {
          await collections.users
            .doc(uid)
            .update({ groups: [...groups, { groupId: req.params.groupId, isAdmin: false }] });
        }
      })
    );
    res.json({ ok: true });
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
});

// ─── Points leaderboard ───────────────────────────────────────────────────────
// GET /api/group-admin/:groupId/leaderboard
router.get('/leaderboard', async (req: Request<GroupParams>, res) => {
  try {
    await completeExpiredShifts(req.params.groupId);
    const board = await getGroupLeaderboard(req.params.groupId);
    const safe = board.map(({ user: { password: _pw, ...u }, points }) => ({ user: u, points }));
    res.json({ leaderboard: safe });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// ─── User Categories ─────────────────────────────────────────────────────────
// GET /api/group-admin/:groupId/categories
router.get('/categories', async (req, res) => {
  try {
    const snap = await collections.userCategories.get();
    const categories = snap.docs.map((d) =>
      convertTimestamps<UserCategory>({ id: d.id, ...d.data() })
    );
    res.json({ categories });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// ─── Requests (admin view) ──────────────────────────────────────────────────
// GET /api/group-admin/:groupId/requests
router.get('/requests', async (req: Request<GroupParams>, res) => {
  try {
    // Get all users in this group
    const users = await getUsersByGroupId(req.params.groupId);
    const userIds = users.map(u => u.id);

    if (userIds.length === 0) {
      res.json({ requests: [] });
      return;
    }

    // Firestore 'in' queries limited to 30 — batch if needed
    const allRequests: any[] = [];
    for (let i = 0; i < userIds.length; i += 30) {
      const batch = userIds.slice(i, i + 30);
      const snap = await collections.requests.where('userId', 'in', batch).get();
      snap.docs.forEach(d => {
        allRequests.push(convertTimestamps({ id: d.id, ...d.data() }));
      });
    }

    // Attach user names
    const userMap = new Map(users.map(u => [u.id, u.name]));
    const enriched = allRequests.map(r => ({
      ...r,
      userName: userMap.get(r.userId) ?? r.userId,
    }));

    res.json({ requests: enriched });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/group-admin/:groupId/requests/:requestId
router.delete('/requests/:requestId', async (req, res) => {
  try {
    await collections.requests.doc(req.params.requestId).delete();
    res.json({ ok: true });
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
});

// ─── Points management ──────────────────────────────────────────────────────
// PATCH /api/group-admin/:groupId/points/:userId
router.patch('/points/:userId', async (req: Request<GroupParams & { userId: string }>, res) => {
  try {
    const { groupId, userId } = req.params;
    const { adjustment } = req.body as { adjustment: number };

    // Find or create userGroupPoints doc
    const snap = await collections.userGroupPoints
      .where('userId', '==', userId)
      .where('groupId', '==', groupId)
      .limit(1)
      .get();

    if (snap.empty) {
      await collections.userGroupPoints.add({
        userId,
        groupId,
        count: adjustment,
        lastDate: new Date(),
      });
    } else {
      const doc = snap.docs[0];
      const current = (doc.data() as any).count ?? 0;
      await doc.ref.update({ count: current + adjustment, lastDate: new Date() });
    }

    res.json({ ok: true });
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
});

// ─── Templates CRUD ─────────────────────────────────────────────────────────
// GET /api/group-admin/:groupId/templates
router.get('/templates', async (req: Request<GroupParams>, res) => {
  try {
    const snap = await collections.templates.where('groupId', '==', req.params.groupId).get();
    const templates = snap.docs.map(d => convertTimestamps({ id: d.id, ...d.data() }));
    res.json({ templates });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/group-admin/:groupId/templates
router.post('/templates', async (req: Request<GroupParams>, res) => {
  try {
    const data = { ...req.body, groupId: req.params.groupId, createdAt: new Date() };
    const ref = await collections.templates.add(data);
    res.status(201).json({ template: { id: ref.id, ...data } });
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
});

// PATCH /api/group-admin/:groupId/templates/:templateId
router.patch('/templates/:templateId', async (req, res) => {
  try {
    await collections.templates.doc(req.params.templateId).update(req.body);
    res.json({ ok: true });
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE /api/group-admin/:groupId/templates/:templateId
router.delete('/templates/:templateId', async (req, res) => {
  try {
    await collections.templates.doc(req.params.templateId).delete();
    res.json({ ok: true });
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
});

export default router;
