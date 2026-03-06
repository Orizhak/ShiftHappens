import { collections, convertTimestamps } from '../firebase/db';
import {
  Shift,
  ShiftStatus,
  User,
  UserFitness,
  UserCategory,
  AssignmentShiftData,
  AssignmentType,
} from '../types';
import { getPointsByGroupId, getUsersByGroupId } from './userService';

// ─── Shift CRUD ───────────────────────────────────────────────────────────────
export async function getShiftsByGroupId(groupId: string): Promise<Shift[]> {
  const snap = await collections.shifts
    .where('groupId', '==', groupId)
    .orderBy('startDate', 'desc')
    .get();
  return snap.docs.map((d) => convertTimestamps<Shift>({ id: d.id, ...d.data() }));
}

export async function getShiftById(id: string): Promise<Shift | null> {
  const doc = await collections.shifts.doc(id).get();
  if (!doc.exists) return null;
  return convertTimestamps<Shift>({ id: doc.id, ...doc.data() });
}

export async function createShift(data: Omit<Shift, 'id'>): Promise<Shift> {
  const ref = await collections.shifts.add(data);
  return { id: ref.id, ...data };
}

export async function updateShift(id: string, data: Partial<Shift>): Promise<void> {
  await collections.shifts.doc(id).update(data as any);
}

export async function deleteShift(id: string): Promise<void> {
  await collections.shifts.doc(id).delete();
}

// ─── Assignment algorithm ─────────────────────────────────────────────────────
export function calculateUserFitness(
  user: User,
  shiftData: AssignmentShiftData,
  existingShifts: Shift[],
  currentPoints: number
): UserFitness {
  const unfitReasons: string[] = [];
  let fitnessScore = 100;
  let hasSameDayShift = false;
  let conflictingShift: Shift | undefined;
  let weeklyHours = 0;

  const shiftDate = new Date(shiftData.startDate);

  // Same-day conflict
  const sameDayShifts = existingShifts.filter((shift) => {
    const d = shift.startDate instanceof Date ? shift.startDate : new Date(shift.startDate as any);
    return (
      shiftDate.toDateString() === d.toDateString() &&
      shift.users?.includes(user.id) &&
      shift.status !== ShiftStatus.Cancelled
    );
  });

  if (sameDayShifts.length > 0) {
    hasSameDayShift = true;
    conflictingShift = sameDayShifts[0];
    unfitReasons.push('יש משמרת באותו יום');
    fitnessScore -= 50;
  }

  // Weekly hours
  const weekStart = new Date(shiftDate);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);

  const weeklyShifts = existingShifts.filter((shift) => {
    const d = shift.startDate instanceof Date ? shift.startDate : new Date(shift.startDate as any);
    return (
      d >= weekStart &&
      d <= weekEnd &&
      shift.users?.includes(user.id) &&
      shift.status !== ShiftStatus.Cancelled
    );
  });

  weeklyHours = weeklyShifts.reduce((total, shift) => {
    const start = shift.startDate instanceof Date ? shift.startDate : new Date(shift.startDate as any);
    const end = shift.endDate instanceof Date ? shift.endDate : new Date(shift.endDate as any);
    const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    return total + (isNaN(hours) ? 0 : hours);
  }, 0);

  if (weeklyHours + shiftData.duration > 40) {
    unfitReasons.push('חורג ממגבלת שעות שבועיות');
    fitnessScore -= 30;
  }

  // ── Category checks ──────────────────────────────────────────────────────
  const userCatIds = user.userCategories ?? [];
  const required = shiftData.requiredUserCategories ?? [];
  const forbidden = shiftData.forbiddenUserCategories ?? [];
  const slotReqs = shiftData.slotRequirements ?? [];

  // Global forbidden — hard block
  const hasForbidden = forbidden.some((c) => userCatIds.includes(c));
  if (hasForbidden) {
    unfitReasons.push('יש קטגוריות אסורות');
    fitnessScore -= 60;
  }

  // Global required — user must have at least one
  const failsGlobalRequired = required.length > 0 && !required.some((c) => userCatIds.includes(c));
  if (failsGlobalRequired) {
    unfitReasons.push('חסרות קטגוריות נדרשות');
    fitnessScore -= 40;
  }

  // Per-slot categories — determine which specific slots this user can fill
  // Build list of all slots (0..numUsers-1), figure out which ones have constraints
  const constrainedSlots = slotReqs.filter(sr => sr.requiredCategories.length > 0);

  // Which constrained slots does this user match?
  const matchedSlots: number[] = [];
  for (const sr of constrainedSlots) {
    if (sr.requiredCategories.some(c => userCatIds.includes(c))) {
      matchedSlots.push(sr.slotIndex);
    }
  }

  // Slots without specific requirements (open to anyone who passes global checks)
  const constrainedSlotIndices = new Set(constrainedSlots.map(sr => sr.slotIndex));
  const openSlotCount = shiftData.numUsers - constrainedSlots.length;
  const canFillOpenSlot = openSlotCount > 0;
  const canFillConstrainedSlot = matchedSlots.length > 0;

  // If user matches constrained slots → bonus; otherwise small penalty
  if (constrainedSlots.length > 0) {
    if (canFillConstrainedSlot) {
      fitnessScore += 10;
    } else if (canFillOpenSlot) {
      // Can only fill open slots — lower priority than slot-matched users
      fitnessScore -= 10;
    }
  }

  // If user can't fill ANY slot (no open slots + no matching constrained slots)
  if (!canFillOpenSlot && !canFillConstrainedSlot && constrainedSlots.length > 0) {
    unfitReasons.push('לא מתאים לאף עמדה');
    fitnessScore -= 40;
  }

  // Points fairness penalty
  fitnessScore -= Math.min(30, Math.floor(currentPoints / 5));

  const isFit =
    fitnessScore >= 50 &&
    !hasSameDayShift &&
    !hasForbidden &&
    !failsGlobalRequired &&
    (constrainedSlots.length === 0 || canFillOpenSlot || canFillConstrainedSlot);

  return {
    user,
    fitnessScore: Math.max(0, Math.min(100, fitnessScore)),
    isFit,
    unfitReasons,
    hasSameDayShift,
    conflictingShift,
    weeklyHours,
    currentPoints,
    matchedSlots,
  };
}

export function selectAutoAssignment(
  candidates: UserFitness[],
  numUsers: number,
  slotRequirements?: { slotIndex: number; requiredCategories: string[] }[]
): string[] {
  const fit = candidates.filter((u) => u.isFit);
  const sorted = [...fit].sort((a, b) => {
    if (a.fitnessScore !== b.fitnessScore) return b.fitnessScore - a.fitnessScore;
    return a.currentPoints - b.currentPoints;
  });

  // If no per-slot requirements, simple top-N selection
  if (!slotRequirements || slotRequirements.length === 0) {
    if (sorted.length <= numUsers) return sorted.map((u) => u.user.id);
    return sorted.slice(0, numUsers).map((u) => u.user.id);
  }

  // Slot-aware assignment: fill constrained slots first, then open slots
  const assigned = new Set<string>();
  const result: string[] = [];

  // Sort constrained slots: fewest matching candidates first (most constrained)
  const constrainedSlots = slotRequirements
    .filter(sr => sr.requiredCategories.length > 0)
    .map(sr => ({
      ...sr,
      matchCount: sorted.filter(u =>
        !assigned.has(u.user.id) &&
        sr.requiredCategories.some(c => (u.user.userCategories ?? []).includes(c))
      ).length,
    }))
    .sort((a, b) => a.matchCount - b.matchCount);

  // Fill constrained slots first
  for (const sr of constrainedSlots) {
    const match = sorted.find(u =>
      !assigned.has(u.user.id) &&
      sr.requiredCategories.some(c => (u.user.userCategories ?? []).includes(c))
    );
    if (match) {
      assigned.add(match.user.id);
      result.push(match.user.id);
    }
  }

  // Fill remaining open slots with best available
  for (const u of sorted) {
    if (result.length >= numUsers) break;
    if (!assigned.has(u.user.id)) {
      assigned.add(u.user.id);
      result.push(u.user.id);
    }
  }

  return result;
}

/** Full pipeline: load users + shifts + points, compute fitness for each user */
export async function getUsersForAssignment(
  groupId: string,
  shiftData: AssignmentShiftData
): Promise<{ users: UserFitness[]; totalUsers: number; fitUsers: number }> {
  const [users, groupShifts, pointsRecords] = await Promise.all([
    getUsersByGroupId(groupId, true),
    getShiftsByGroupId(groupId),
    getPointsByGroupId(groupId),
  ]);

  const pointsMap = new Map(pointsRecords.map((p) => [p.userId, p.count]));

  const fitnessResults = users.map((u) =>
    calculateUserFitness(u, shiftData, groupShifts, pointsMap.get(u.id) ?? 0)
  );

  return {
    users: fitnessResults,
    totalUsers: fitnessResults.length,
    fitUsers: fitnessResults.filter((u) => u.isFit).length,
  };
}

/** Runs automatic assignment and persists the shift */
export async function performAutomaticAssignment(
  groupId: string,
  shiftData: AssignmentShiftData
): Promise<string[]> {
  const { users } = await getUsersForAssignment(groupId, shiftData);
  return selectAutoAssignment(users, shiftData.numUsers, shiftData.slotRequirements);
}

/** Replaces one user in an existing assignment */
export async function replaceUserInAssignment(
  groupId: string,
  shiftData: AssignmentShiftData,
  currentUsers: string[],
  userToReplace: string
): Promise<string[]> {
  const { users } = await getUsersForAssignment(groupId, shiftData);

  const excluded = new Set([...currentUsers.filter((id) => id !== userToReplace), userToReplace]);
  const candidates = users.filter((u) => !excluded.has(u.user.id));

  const replacement = selectAutoAssignment(candidates, 1);
  return currentUsers.map((id) => (id === userToReplace ? replacement[0] ?? id : id));
}
