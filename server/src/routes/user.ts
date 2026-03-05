import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import {
  getUpcomingShiftsForUser,
  getAllShiftsForUser,
  getAllGroups,
  getPointsByUserId,
  getGroupLeaderboard,
  getUserRankInGroup,
  getGroupUserStats,
} from '../services/userService';
import {
  getRequestsByUserId,
  createRequest,
  deleteRequest,
} from '../services/requestService';
import { RequestType } from '../types';

const router = Router();

// All user routes require authentication
router.use(authenticate);

// ─── Shifts ─────────────────────────────────────────────────────────────────
// GET /api/user/shifts/upcoming
router.get('/shifts/upcoming', async (req, res) => {
  try {
    const adminGroupIds = req.user!.groups?.filter((g) => g.isAdmin).map((g) => g.groupId) ?? [];
    const shifts = await getUpcomingShiftsForUser(req.user!.id, adminGroupIds);
    res.json({ shifts });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/user/shifts
router.get('/shifts', async (req, res) => {
  try {
    const adminGroupIds = req.user!.groups?.filter((g) => g.isAdmin).map((g) => g.groupId) ?? [];
    const shifts = await getAllShiftsForUser(req.user!.id, adminGroupIds);
    res.json({ shifts });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// ─── Groups ──────────────────────────────────────────────────────────────────
// GET /api/user/groups
router.get('/groups', async (req, res) => {
  try {
    const all = await getAllGroups();
    const userGroupMap = new Map(
      req.user!.groups?.map((g) => [g.groupId, g.isAdmin]) ?? []
    );
    // Return all groups user belongs to, with isAdmin flag
    const groups = all
      .filter((g) => userGroupMap.has(g.id))
      .map((g) => ({ ...g, isAdmin: userGroupMap.get(g.id) ?? false }));
    res.json({ groups });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// ─── Points ───────────────────────────────────────────────────────────────────
// GET /api/user/points
router.get('/points', async (req, res) => {
  try {
    const adminGroupIds = new Set(
      req.user!.groups?.filter((g) => g.isAdmin).map((g) => g.groupId) ?? []
    );
    const allPoints = await getPointsByUserId(req.user!.id);
    const points = allPoints.filter((p) => !adminGroupIds.has(p.groupId));
    res.json({ points });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/user/points/leaderboard/:groupId
router.get('/points/leaderboard/:groupId', async (req, res) => {
  try {
    const board = await getGroupLeaderboard(req.params.groupId);
    res.json({ leaderboard: board });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/user/rank/:groupId
router.get('/rank/:groupId', async (req, res) => {
  try {
    const rank = await getUserRankInGroup(req.user!.id, req.params.groupId);
    res.json({ rank });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/user/stats/:groupId
router.get('/stats/:groupId', async (req, res) => {
  try {
    const stats = await getGroupUserStats(req.user!.id, req.params.groupId);
    res.json(stats);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// ─── Requests ─────────────────────────────────────────────────────────────────
// GET /api/user/requests
router.get('/requests', async (req, res) => {
  try {
    const requests = await getRequestsByUserId(req.user!.id);
    res.json({ requests });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/user/requests
router.post('/requests', async (req, res) => {
  try {
    const { startDate, endDate, type, description } = req.body;
    const request = await createRequest({
      userId: req.user!.id,
      startDate,
      endDate,
      type: type as RequestType,
      description,
    });
    res.status(201).json({ request });
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE /api/user/requests/:id
router.delete('/requests/:id', async (req, res) => {
  try {
    await deleteRequest(req.params.id, req.user!.id);
    res.json({ ok: true });
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
});

export default router;
