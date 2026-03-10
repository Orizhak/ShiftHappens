// ─── Enums ───────────────────────────────────────────────────────────────────
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

// ─── Domain Models ────────────────────────────────────────────────────────────
export type UserGroupRole = {
  groupId: string;
  isAdmin: boolean;
};

export interface User {
  id: string;
  username: string;
  password: string; // bcrypt hash
  name: string;
  isActive: boolean;
  isGlobalAdmin?: boolean;
  userCategories: string[];
  groups: UserGroupRole[];
  gender: Gender;
  recruitmentDate?: Date;
  createdAt: Date;
}

export interface Group {
  id: string;
  displayName: string;
  hasPointsTracking: boolean;
  type: string;
  createdAt: Date;
}

export interface UserGroupPoints {
  id: string;
  userId: string;
  groupId: string;
  count: number;
  lastDate: Date;
}

export interface Shift {
  id: string;
  groupId: string;
  displayName: string;
  startDate: Date;
  endDate: Date;
  requiredUserCategories: string[];
  forbiddenUserCategories: string[];
  users: string[];
  pointsPerHour: number;
  details?: string;
  status: ShiftStatus;
  location: string;
  createdAt: Date;
}

export interface Request {
  id: string;
  userId: string;
  startDate: Date;
  endDate: Date;
  type: RequestType;
  description: string;
  createdAt: Date;
}

export interface Template {
  id: string;
  displayName: string;
  includedUserCategories: string[];
  excludedUserCategories: string[];
  points: number;
  numUsers?: number;
  location?: string;
  details?: string;
  createdAt: Date;
}

export interface UserCategory {
  id: string;
  displayName: string;
  pointsMultiplier: number;
  createdAt: Date;
}

// ─── Session / Auth ───────────────────────────────────────────────────────────
/** Stored in the httpOnly cookie — never includes the password hash */
export type SessionUser = Omit<User, 'password'>;

// ─── Assignment ───────────────────────────────────────────────────────────────
export interface UserFitness {
  user: User;
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
