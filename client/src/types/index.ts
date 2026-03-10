// ─── Enums (mirror server) ────────────────────────────────────────────────────
export enum RequestType {
  Exclude = 1,
  Prefer,
}

export enum Gender {
  Male = 1,
  Female,
}

export enum ShiftStatus {
  Active = 1,
  Finished,
  Cancelled,
}

// ─── Domain Models ─────────────────────────────────────────────────────────────
export type UserGroupRole = {
  groupId: string;
  isAdmin: boolean;
};

/** Session user — no password field */
export interface SessionUser {
  id: string;
  username: string;
  name: string;
  isActive: boolean;
  isGlobalAdmin?: boolean;
  userCategories: string[];
  groups: UserGroupRole[];
  gender: Gender;
  recruitmentDate?: string; // ISO string from JSON
  createdAt: string; // ISO string from JSON
}

export interface Group {
  id: string;
  displayName: string;
  hasPointsTracking: boolean;
  type: string;
  createdAt: string;
  isAdmin?: boolean;
}

export interface UserGroupPoints {
  id: string;
  userId: string;
  groupId: string;
  count: number;
  lastDate: string;
}

export interface ShiftSplit {
  slotIndex: number;
  splitTime: string; // HH:mm
  firstHalfUser?: string;
  secondHalfUser?: string;
}

export interface Shift {
  id: string;
  groupId: string;
  displayName: string;
  startDate: string;
  endDate: string;
  requiredUserCategories: string[];
  forbiddenUserCategories: string[];
  users: string[];
  pointsPerHour: number;
  details?: string;
  splits?: ShiftSplit[];
  status: ShiftStatus;
  location: string;
  createdAt: string;
  groupName?: string;
}

export interface Request {
  id: string;
  userId: string;
  startDate: string;
  endDate: string;
  type: RequestType;
  description: string;
  createdAt: string;
}

export interface Template {
  id: string;
  groupId: string;
  displayName: string;
  includedUserCategories: string[];
  excludedUserCategories: string[];
  points: number;
  numUsers?: number;
  location?: string;
  details?: string;
  createdAt: string;
}

export interface UserCategory {
  id: string;
  displayName: string;
  pointsMultiplier: number;
  createdAt: string;
}

export interface UserFitness {
  user: SessionUser;
  fitnessScore: number;
  isFit: boolean;
  unfitReasons: string[];
  hasSameDayShift: boolean;
  conflictingShift?: Shift;
  weeklyHours: number;
  currentPoints: number;
}

export interface SlotRequirement {
  slotIndex: number;
  requiredCategories: string[];
}

export interface AssignmentShiftData {
  numUsers: number;
  requiredUserCategories: string[];
  forbiddenUserCategories: string[];
  startDate: string;
  startHour: string;
  duration: number;
}
