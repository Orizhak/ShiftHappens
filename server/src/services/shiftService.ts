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

  // Category checks
  const userCatIds = user.userCategories ?? [];
  const required = shiftData.requiredUserCategories ?? [];
  const forbidden = shiftData.forbiddenUserCategories ?? [];

  if (required.length > 0 && !required.some((c) => userCatIds.includes(c))) {
    unfitReasons.push('חסרות קטגוריות נדרשות');
    fitnessScore -= 40;
  }

  if (forbidden.some((c) => userCatIds.includes(c))) {
    unfitReasons.push('יש קטגוריות אסורות');
    fitnessScore -= 60;
  }

  // Per-slot category checks
  const slotReqs = shiftData.slotRequirements ?? [];
  if (slotReqs.length > 0) {
    // Count how many slots are open (no specific requirement) vs constrained
    const constrainedSlots = slotReqs.filter(sr => sr.requiredCategories.length > 0);
    const openSlots = shiftData.numUsers - constrainedSlots.length;

    // Check if user matches at least one constrained slot
    const matchesConstrainedSlot = constrainedSlots.some(sr =>
      sr.requiredCategories.some(c => userCatIds.includes(c))
    );

    // User is eligible if they match a constrained slot OR there are open slots
    if (openSlots <= 0 && !matchesConstrainedSlot) {
      // ALL slots are constrained and user doesn't match any
      unfitReasons.push('לא מתאים לאף עמדה');
      fitnessScore -= 40;
    } else if (matchesConstrainedSlot) {
      // Bonus for matching a constrained slot
      fitnessScore += 5;
    }
  }

  // Points fairness penalty
  fitnessScore -= Math.min(30, Math.floor(currentPoints / 5));

  // Check if user can't fill any slot due to per-slot constraints
  const allSlotsConstrained = slotReqs.length > 0 &&
    slotReqs.filter(sr => sr.requiredCategories.length > 0).length >= shiftData.numUsers;
  const matchesNoSlot = allSlotsConstrained &&
    !slotReqs.some(sr => sr.requiredCategories.some(c => userCatIds.includes(c)));

  const isFit =
    fitnessScore >= 50 &&
    !hasSameDayShift &&
    !forbidden.some((c) => userCatIds.includes(c)) &&
    !matchesNoSlot;

  // Compute which constrained slots this user matches
  const matchedSlots = slotReqs.length > 0
    ? slotReqs
        .filter(sr => sr.requiredCategories.length > 0 && sr.requiredCategories.some(c => userCatIds.includes(c)))
        .map(sr => sr.slotIndex)
    : undefined;

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

  // Sort slots: most constrained first (those with slot requirements)
  const slotsWithReqs = slotRequirements
    .filter(sr => sr.requiredCategories.length > 0)
    .sort((a, b) => a.requiredCategories.length - b.requiredCategories.length);

  // Fill constrained slots
  for (const sr of slotsWithReqs) {
    const match = sorted.find(u =>
      !assigned.has(u.user.id) &&
      sr.requiredCategories.some(c => (u.user.userCategories ?? []).includes(c))
    );
    if (match) {
      assigned.add(match.user.id);
      result.push(match.user.id);
    }
  }

  // Fill remaining open slots
  const remaining = numUsers - result.length;
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
