import { collections, convertTimestamps } from '../firebase/db';
import { User, UserGroupPoints, Group, Shift, ShiftStatus, UserCategory } from '../types';

// ─── Users ────────────────────────────────────────────────────────────────────
export async function getUserById(id: string): Promise<User | null> {
  const doc = await collections.users.doc(id).get();
  if (!doc.exists) return null;
  return convertTimestamps<User>({ id: doc.id, ...doc.data() });
}

export async function getAllUsers(): Promise<User[]> {
  const snap = await collections.users.get();
  return snap.docs.map((d) => convertTimestamps<User>({ id: d.id, ...d.data() }));
}

export async function getUsersByGroupId(groupId: string, excludeAdmins = false): Promise<User[]> {
  const snap = await collections.users.get();
  return snap.docs
    .map((d) => convertTimestamps<User>({ id: d.id, ...d.data() }))
    .filter((u) => u.groups?.some((g) => g.groupId === groupId && (!excludeAdmins || !g.isAdmin)));
}

export async function updateUser(id: string, data: Partial<User>): Promise<void> {
  await collections.users.doc(id).update(data as any);
}

// ─── Groups ───────────────────────────────────────────────────────────────────
export async function getAllGroups(): Promise<Group[]> {
  const snap = await collections.groups.get();
  return snap.docs.map((d) => convertTimestamps<Group>({ id: d.id, ...d.data() }));
}

export async function getGroupById(id: string): Promise<Group | null> {
  const doc = await collections.groups.doc(id).get();
  if (!doc.exists) return null;
  return convertTimestamps<Group>({ id: doc.id, ...doc.data() });
}

// ─── Points ───────────────────────────────────────────────────────────────────
export async function getPointsByUserId(userId: string): Promise<UserGroupPoints[]> {
  const snap = await collections.userGroupPoints
    .where('userId', '==', userId)
    .get();
  return snap.docs.map((d) =>
    convertTimestamps<UserGroupPoints>({ id: d.id, ...d.data() })
  );
}

export async function getPointsByGroupId(groupId: string): Promise<UserGroupPoints[]> {
  const snap = await collections.userGroupPoints
    .where('groupId', '==', groupId)
    .get();
  return snap.docs.map((d) =>
    convertTimestamps<UserGroupPoints>({ id: d.id, ...d.data() })
  );
}

/** Returns [{user, points}] sorted by points asc (lowest first = fairness) */
export async function getGroupLeaderboard(
  groupId: string
): Promise<{ user: User; points: number }[]> {
  const [users, points] = await Promise.all([
    getUsersByGroupId(groupId, true),
    getPointsByGroupId(groupId),
  ]);

  const pointsMap = new Map(points.map((p) => [p.userId, p.count]));

  return users
    .map((u) => ({ user: u, points: pointsMap.get(u.id) ?? 0 }))
    .sort((a, b) => a.points - b.points);
}

/** User's rank (1-indexed) within a group */
export async function getUserRankInGroup(
  userId: string,
  groupId: string
): Promise<number> {
  const board = await getGroupLeaderboard(groupId);
  const idx = board.findIndex((e) => e.user.id === userId);
  return idx === -1 ? -1 : idx + 1;
}

// ─── Shifts ───────────────────────────────────────────────────────────────────
export async function getUpcomingShiftsForUser(
  userId: string,
  adminGroupIds: string[] = []
): Promise<(Shift & { groupName: string })[]> {
  const snap = await collections.shifts
    .where('users', 'array-contains', userId)
    .get();

  const groups = await getAllGroups();
  const groupMap = new Map(groups.map((g) => [g.id, g.displayName]));
  const adminSet = new Set(adminGroupIds);

  const now = new Date();
  const shifts: (Shift & { groupName: string })[] = [];

  snap.forEach((doc) => {
    const data = doc.data();
    if (adminSet.has(data.groupId)) return; // skip admin groups
    const startDate =
      data.startDate?.toDate ? data.startDate.toDate() : new Date(data.startDate);
    if (data.status === ShiftStatus.Active && startDate > now) {
      shifts.push(
        convertTimestamps<Shift & { groupName: string }>({
          id: doc.id,
          ...data,
          groupName: groupMap.get(data.groupId) ?? '',
        })
      );
    }
  });

  return shifts.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
}

export async function getAllShiftsForUser(
  userId: string,
  adminGroupIds: string[] = []
): Promise<(Shift & { groupName: string })[]> {
  const snap = await collections.shifts
    .where('users', 'array-contains', userId)
    .get();

  const groups = await getAllGroups();
  const groupMap = new Map(groups.map((g) => [g.id, g.displayName]));
  const adminSet = new Set(adminGroupIds);

  return snap.docs
    .map((doc) => {
      const data = doc.data();
      return convertTimestamps<Shift & { groupName: string }>({
        id: doc.id,
        ...data,
        groupName: groupMap.get(data.groupId) ?? '',
      });
    })
    .filter((s) => !adminSet.has(s.groupId))
    .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
}

/** Award points to all users assigned to a completed shift */
export async function awardPointsForShift(shift: Shift): Promise<void> {
  if (!shift.users || shift.users.length === 0) return;

  const start = shift.startDate instanceof Date ? shift.startDate : new Date(shift.startDate as any);
  const end = shift.endDate instanceof Date ? shift.endDate : new Date(shift.endDate as any);
  const durationHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
  if (durationHours <= 0 || isNaN(durationHours)) return;

  // Load categories for multiplier support
  const catSnap = await collections.userCategories.get();
  const categories = catSnap.docs.map((d) =>
    convertTimestamps<UserCategory>({ id: d.id, ...d.data() })
  );
  const catMap = new Map(categories.map((c) => [c.id, c]));

  // Load user docs to get their categories
  const userDocs = await Promise.all(
    shift.users.map((uid) => collections.users.doc(uid).get())
  );

  for (let i = 0; i < shift.users.length; i++) {
    const userId = shift.users[i];
    const userDoc = userDocs[i];
    if (!userDoc.exists) continue;

    const userData = userDoc.data() as any;
    const userCatIds: string[] = userData.userCategories ?? [];

    // Calculate multiplier: highest applicable multiplier from user's categories
    let maxMultiplier = 1;
    for (const catId of userCatIds) {
      const cat = catMap.get(catId);
      if (cat && cat.pointsMultiplier > maxMultiplier) {
        maxMultiplier = cat.pointsMultiplier;
      }
    }

    const basePoints = shift.pointsPerHour * durationHours;
    const finalPoints = Math.round(basePoints * maxMultiplier);

    // Upsert userGroupPoints
    const snap = await collections.userGroupPoints
      .where('userId', '==', userId)
      .where('groupId', '==', shift.groupId)
      .limit(1)
      .get();

    if (snap.empty) {
      await collections.userGroupPoints.add({
        userId,
        groupId: shift.groupId,
        count: finalPoints,
        lastDate: new Date(),
      });
    } else {
      const doc = snap.docs[0];
      const current = (doc.data() as any).count ?? 0;
      await doc.ref.update({ count: current + finalPoints, lastDate: new Date() });
    }
  }
}

/** Hours worked this month and this week in a group */
export async function getGroupUserStats(
  userId: string,
  groupId: string
): Promise<{ weeklyShifts: number; monthlyShifts: number; groupName: string }> {
  const [allShifts, group] = await Promise.all([
    getAllShiftsForUser(userId),
    getGroupById(groupId),
  ]);

  const now = new Date();
  const weekAgo = new Date(now);
  weekAgo.setDate(now.getDate() - 7);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const groupShifts = allShifts.filter((s) => s.groupId === groupId);
  const weeklyShifts = groupShifts.filter(
    (s) => new Date(s.startDate) >= weekAgo && new Date(s.startDate) <= now
  ).length;
  const monthlyShifts = groupShifts.filter(
    (s) => new Date(s.startDate) >= startOfMonth && new Date(s.startDate) <= now
  ).length;

  return { weeklyShifts, monthlyShifts, groupName: group?.displayName ?? '' };
}
