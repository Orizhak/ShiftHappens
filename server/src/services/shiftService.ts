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

  // Category checks — global only (per-slot is handled client-side)
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

  // Points fairness penalty
  fitnessScore -= Math.min(30, Math.floor(currentPoints / 5));

  const isFit =
    fitnessScore >= 50 &&
    !hasSameDayShift &&
    !forbidden.some((c) => userCatIds.includes(c));

  return {
    user,
    fitnessScore: Math.max(0, Math.min(100, fitnessScore)),
    isFit,
    unfitReasons,
    hasSameDayShift,
    conflictingShift,
    weeklyHours,
    currentPoints,
  };
}

export function selectAutoAssignment(
  candidates: UserFitness[],
  numUsers: number
): string[] {
  const fit = candidates.filter((u) => u.isFit);
  const sorted = [...fit].sort((a, b) => {
    if (a.fitnessScore !== b.fitnessScore) return b.fitnessScore - a.fitnessScore;
    return a.currentPoints - b.currentPoints;
  });

  if (sorted.length <= numUsers) return sorted.map((u) => u.user.id);
  return sorted.slice(0, numUsers).map((u) => u.user.id);
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
  return selectAutoAssignment(users, shiftData.numUsers);
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
