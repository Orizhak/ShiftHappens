import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { requireGlobalAdmin } from '../middleware/requireRole';
import { getAllUsers, getAllGroups, updateUser } from '../services/userService';
import { collections, convertTimestamps } from '../firebase/db';
import { Group, UserCategory } from '../types';
import bcrypt from 'bcryptjs';

const router = Router();
router.use(authenticate, requireGlobalAdmin);

// ─── Users ────────────────────────────────────────────────────────────────────
// GET /api/global-admin/users
router.get('/users', async (req, res) => {
  try {
    const users = await getAllUsers();
    const safe = users.map(({ password: _pw, ...u }) => u);
    res.json({ users: safe });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH /api/global-admin/users/:userId
router.patch('/users/:userId', async (req, res) => {
  try {
    const data = { ...req.body };
    if (data.password) {
      data.password = await bcrypt.hash(data.password, 10);
    }
    await updateUser(req.params.userId, data);
    res.json({ ok: true });
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE /api/global-admin/users/:userId
router.delete('/users/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;

    // 1. Delete user doc
    await collections.users.doc(userId).delete();

    // 2. Remove userId from all shifts' users arrays
    const shiftsSnap = await collections.shifts.where('users', 'array-contains', userId).get();
    for (const doc of shiftsSnap.docs) {
      const data = doc.data() as any;
      const updatedUsers = (data.users as string[]).filter(id => id !== userId);
      await doc.ref.update({ users: updatedUsers });
    }

    // 3. Delete all userGroupPoints for this user
    const pointsSnap = await collections.userGroupPoints.where('userId', '==', userId).get();
    for (const doc of pointsSnap.docs) {
      await doc.ref.delete();
    }

    // 4. Delete all requests for this user
    const requestsSnap = await collections.requests.where('userId', '==', userId).get();
    for (const doc of requestsSnap.docs) {
      await doc.ref.delete();
    }

    res.json({ ok: true });
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
});

// ─── Groups ───────────────────────────────────────────────────────────────────
// GET /api/global-admin/groups
router.get('/groups', async (req, res) => {
  try {
    const groups = await getAllGroups();
    res.json({ groups });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/global-admin/groups
router.post('/groups', async (req, res) => {
  try {
    const now = new Date();
    const group: Omit<Group, 'id'> = { ...req.body, createdAt: now };
    const ref = await collections.groups.add(group);
    res.status(201).json({ group: { id: ref.id, ...group } });
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
});

// PATCH /api/global-admin/groups/:groupId
router.patch('/groups/:groupId', async (req, res) => {
  try {
    await collections.groups.doc(req.params.groupId).update(req.body);
    res.json({ ok: true });
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
});

// ─── User Categories ─────────────────────────────────────────────────────────
// GET /api/global-admin/categories
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

// POST /api/global-admin/categories
router.post('/categories', async (req, res) => {
  try {
    const ref = await collections.userCategories.add({ ...req.body, createdAt: new Date() });
    res.status(201).json({ id: ref.id });
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
});

export default router;
