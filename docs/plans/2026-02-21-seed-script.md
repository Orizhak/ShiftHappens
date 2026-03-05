# Seed Script Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create `new/server/src/seed.ts` that populates Firestore with realistic dev data (3 groups, 3 user categories, 9 users, 24 shifts, assignments, points, requests, templates) — skipping if data already exists.

**Architecture:** Single self-contained TypeScript script that reuses the existing Firebase Admin init (`src/firebase/admin.ts`) and collection refs (`src/firebase/db.ts`). Uses Firestore `WriteBatch` for atomic commits. Runs via `tsx` with `npm run seed`.

**Tech Stack:** Node.js + TypeScript + Firebase Admin SDK + bcryptjs + tsx + dotenv

---

### Task 1: Add `seed` script to `server/package.json`

**Files:**
- Modify: `new/server/package.json`

**Step 1: Add the script**

In `new/server/package.json`, add `"seed"` to the `"scripts"` block:

```json
"scripts": {
  "dev": "tsx watch src/index.ts",
  "build": "tsc -p tsconfig.json",
  "start": "node dist/index.js",
  "seed": "tsx src/seed.ts"
},
```

**Step 2: Verify**

```bash
cd new/server
npm run seed
```

Expected: `Error: Cannot find module './seed'` (or similar — proves the script entry is wired up, file just doesn't exist yet).

**Step 3: Commit**

```bash
git add new/server/package.json
git commit -m "chore(seed): add seed npm script"
```

---

### Task 2: Create `seed.ts` — bootstrap and guard

**Files:**
- Create: `new/server/src/seed.ts`

**Step 1: Create the file with dotenv load, Firebase init, and the exists-guard**

```ts
import 'dotenv/config';
import { db } from './firebase/admin';
import { collections } from './firebase/db';
import bcrypt from 'bcryptjs';
import {
  Gender,
  ShiftStatus,
  RequestType,
  AssignmentType,
  MultiplierType,
} from './types';

async function main() {
  // Guard: skip if users collection already has data
  const existingUsers = await collections.users.limit(1).get();
  if (!existingUsers.empty) {
    console.log('⚠️  Database already has data — skipping seed. Drop collections manually to reseed.');
    process.exit(0);
  }

  console.log('🌱 Seeding database...');

  await seedUserCategories();
  await seedGroups();
  await seedUsers();
  await seedShifts();
  await seedRequests();
  await seedTemplates();

  console.log('✅ Seed complete.');
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
```

**Step 2: Run to verify guard works on an existing DB**

```bash
cd new/server
npm run seed
```

Expected output (if DB already has data):
```
⚠️  Database already has data — skipping seed. Drop collections manually to reseed.
```

Expected output (if DB is empty):
```
🌱 Seeding database...
❌ Seed failed: ReferenceError: seedUserCategories is not defined
```

Both are correct — the guard and bootstrap work.

---

### Task 3: Implement `seedUserCategories`

**Files:**
- Modify: `new/server/src/seed.ts`

**Step 1: Add the function before `main()`**

```ts
// ─── IDs (stable so other functions can reference them) ──────────────────────
const CAT_OFFICER = 'cat-officer';
const CAT_SERGEANT = 'cat-sergeant';
const CAT_SOLDIER = 'cat-soldier';

async function seedUserCategories() {
  const batch = db.batch();

  batch.set(collections.userCategories.doc(CAT_OFFICER), {
    displayName: 'קצין',
    pointsMultiplier: 1.5,
    multiplierType: MultiplierType.User,
    createdAt: new Date(),
  });

  batch.set(collections.userCategories.doc(CAT_SERGEANT), {
    displayName: 'סמל',
    pointsMultiplier: 1.2,
    multiplierType: MultiplierType.User,
    createdAt: new Date(),
  });

  batch.set(collections.userCategories.doc(CAT_SOLDIER), {
    displayName: 'חייל בסיסי',
    pointsMultiplier: 1.0,
    multiplierType: MultiplierType.User,
    createdAt: new Date(),
  });

  await batch.commit();
  console.log('  ✓ userCategories');
}
```

---

### Task 4: Implement `seedGroups`

**Files:**
- Modify: `new/server/src/seed.ts`

**Step 1: Add stable group IDs and `seedGroups` function**

```ts
const GROUP_SOFTWARE = 'group-software';
const GROUP_KARIN = 'group-karin';
const GROUP_GUARD = 'group-guard';

async function seedGroups() {
  const batch = db.batch();

  batch.set(collections.groups.doc(GROUP_SOFTWARE), {
    displayName: 'תורנויות תוכנה',
    hasPointsTracking: true,
    type: 'software',
    createdAt: new Date(),
  });

  batch.set(collections.groups.doc(GROUP_KARIN), {
    displayName: 'תורנויות קארין',
    hasPointsTracking: true,
    type: 'karin',
    createdAt: new Date(),
  });

  batch.set(collections.groups.doc(GROUP_GUARD), {
    displayName: 'שמירות מחנה',
    hasPointsTracking: false,
    type: 'guard',
    createdAt: new Date(),
  });

  await batch.commit();
  console.log('  ✓ groups');
}
```

---

### Task 5: Implement `seedUsers`

**Files:**
- Modify: `new/server/src/seed.ts`

**Step 1: Add stable user IDs and `seedUsers` function**

```ts
const USER_GLOBAL_ADMIN = 'user-global-admin';
const USER_ADMIN_SOFTWARE = 'user-admin-software';
const USER_ADMIN_KARIN = 'user-admin-karin';
const USER_ADMIN_GUARD = 'user-admin-guard';
const USER_1 = 'user-1';
const USER_2 = 'user-2';
const USER_3 = 'user-3';
const USER_4 = 'user-4';
const USER_5 = 'user-5';

async function seedUsers() {
  const adminHash = await bcrypt.hash('admin123', 10);
  const userHash = await bcrypt.hash('user123', 10);

  const batch = db.batch();

  // Global admin — member of all 3 groups as admin
  batch.set(collections.users.doc(USER_GLOBAL_ADMIN), {
    username: 'admin',
    password: adminHash,
    name: 'מנהל מערכת',
    isActive: true,
    isGlobalAdmin: true,
    gender: Gender.Male,
    userCategories: [CAT_OFFICER],
    groups: [
      { groupId: GROUP_SOFTWARE, isAdmin: true },
      { groupId: GROUP_KARIN, isAdmin: true },
      { groupId: GROUP_GUARD, isAdmin: true },
    ],
    createdAt: new Date(),
  });

  // Group admin — תורנויות תוכנה
  batch.set(collections.users.doc(USER_ADMIN_SOFTWARE), {
    username: 'admin_software',
    password: adminHash,
    name: 'מנהל תוכנה',
    isActive: true,
    isGlobalAdmin: false,
    gender: Gender.Male,
    userCategories: [CAT_OFFICER],
    groups: [{ groupId: GROUP_SOFTWARE, isAdmin: true }],
    createdAt: new Date(),
  });

  // Group admin — תורנויות קארין
  batch.set(collections.users.doc(USER_ADMIN_KARIN), {
    username: 'admin_karin',
    password: adminHash,
    name: 'מנהלת קארין',
    isActive: true,
    isGlobalAdmin: false,
    gender: Gender.Female,
    userCategories: [CAT_OFFICER],
    groups: [{ groupId: GROUP_KARIN, isAdmin: true }],
    createdAt: new Date(),
  });

  // Group admin — שמירות מחנה
  batch.set(collections.users.doc(USER_ADMIN_GUARD), {
    username: 'admin_guard',
    password: adminHash,
    name: 'מנהל שמירות',
    isActive: true,
    isGlobalAdmin: false,
    gender: Gender.Male,
    userCategories: [CAT_SERGEANT],
    groups: [{ groupId: GROUP_GUARD, isAdmin: true }],
    createdAt: new Date(),
  });

  // Regular users spread across groups
  batch.set(collections.users.doc(USER_1), {
    username: 'user1',
    password: userHash,
    name: 'דוד כהן',
    isActive: true,
    isGlobalAdmin: false,
    gender: Gender.Male,
    userCategories: [CAT_SOLDIER],
    groups: [
      { groupId: GROUP_SOFTWARE, isAdmin: false },
      { groupId: GROUP_KARIN, isAdmin: false },
    ],
    createdAt: new Date(),
  });

  batch.set(collections.users.doc(USER_2), {
    username: 'user2',
    password: userHash,
    name: 'מיכל לוי',
    isActive: true,
    isGlobalAdmin: false,
    gender: Gender.Female,
    userCategories: [CAT_SERGEANT],
    groups: [{ groupId: GROUP_SOFTWARE, isAdmin: false }],
    createdAt: new Date(),
  });

  batch.set(collections.users.doc(USER_3), {
    username: 'user3',
    password: userHash,
    name: 'יוסי אברהם',
    isActive: true,
    isGlobalAdmin: false,
    gender: Gender.Male,
    userCategories: [CAT_SOLDIER],
    groups: [
      { groupId: GROUP_KARIN, isAdmin: false },
      { groupId: GROUP_GUARD, isAdmin: false },
    ],
    createdAt: new Date(),
  });

  batch.set(collections.users.doc(USER_4), {
    username: 'user4',
    password: userHash,
    name: 'רחל ברקוביץ',
    isActive: true,
    isGlobalAdmin: false,
    gender: Gender.Female,
    userCategories: [CAT_SOLDIER],
    groups: [{ groupId: GROUP_GUARD, isAdmin: false }],
    createdAt: new Date(),
  });

  batch.set(collections.users.doc(USER_5), {
    username: 'user5',
    password: userHash,
    name: 'אמיר שפירא',
    isActive: true,
    isGlobalAdmin: false,
    gender: Gender.Male,
    userCategories: [CAT_SERGEANT],
    groups: [
      { groupId: GROUP_SOFTWARE, isAdmin: false },
      { groupId: GROUP_GUARD, isAdmin: false },
    ],
    createdAt: new Date(),
  });

  await batch.commit();
  console.log('  ✓ users');
}
```

---

### Task 6: Implement `seedShifts` (with assignments and points)

**Files:**
- Modify: `new/server/src/seed.ts`

**Step 1: Add helper to build a date offset from today**

Add this utility near the top of the file (after the imports):

```ts
function daysFromNow(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}
```

**Step 2: Add `seedShifts` function**

This creates ~8 shifts per group (mix of past Finished and upcoming Active), plus ShiftAssignment records for finished shifts, plus UserGroupPoints records.

```ts
async function seedShifts() {
  // ── Batch 1: shifts ──────────────────────────────────────────────────────
  const shiftBatch = db.batch();

  // Helper: shift ref with stable ID
  const shiftId = (s: string) => collections.shifts.doc(s);

  // ── תורנויות תוכנה shifts ────────────────────────────────────────────────
  shiftBatch.set(shiftId('shift-sw-1'), {
    groupId: GROUP_SOFTWARE, displayName: 'תורנות לילה ראשונה',
    startDate: daysFromNow(-20), endDate: daysFromNow(-19),
    requiredUserCategories: [], forbiddenUserCategories: [],
    users: [USER_1, USER_2], pointsPerHour: 2,
    location: 'חדר שרתים', status: ShiftStatus.Finished,
    details: '', createdAt: new Date(),
  });
  shiftBatch.set(shiftId('shift-sw-2'), {
    groupId: GROUP_SOFTWARE, displayName: 'תורנות בוקר',
    startDate: daysFromNow(-14), endDate: daysFromNow(-13),
    requiredUserCategories: [CAT_SERGEANT], forbiddenUserCategories: [],
    users: [USER_2, USER_5], pointsPerHour: 1,
    location: 'חדר שרתים', status: ShiftStatus.Finished,
    details: '', createdAt: new Date(),
  });
  shiftBatch.set(shiftId('shift-sw-3'), {
    groupId: GROUP_SOFTWARE, displayName: 'תורנות סוף שבוע',
    startDate: daysFromNow(-7), endDate: daysFromNow(-6),
    requiredUserCategories: [], forbiddenUserCategories: [],
    users: [USER_1, USER_5], pointsPerHour: 3,
    location: 'מרכז טכנולוגי', status: ShiftStatus.Finished,
    details: '', createdAt: new Date(),
  });
  shiftBatch.set(shiftId('shift-sw-4'), {
    groupId: GROUP_SOFTWARE, displayName: 'תורנות לילה',
    startDate: daysFromNow(-3), endDate: daysFromNow(-2),
    requiredUserCategories: [], forbiddenUserCategories: [],
    users: [USER_1, USER_2, USER_5], pointsPerHour: 2,
    location: 'חדר שרתים', status: ShiftStatus.Finished,
    details: '', createdAt: new Date(),
  });
  shiftBatch.set(shiftId('shift-sw-5'), {
    groupId: GROUP_SOFTWARE, displayName: 'תורנות מחר',
    startDate: daysFromNow(1), endDate: daysFromNow(2),
    requiredUserCategories: [], forbiddenUserCategories: [],
    users: [], pointsPerHour: 2,
    location: 'חדר שרתים', status: ShiftStatus.Active,
    details: 'תורנות תוכנה רגילה', createdAt: new Date(),
  });
  shiftBatch.set(shiftId('shift-sw-6'), {
    groupId: GROUP_SOFTWARE, displayName: 'תורנות שבוע הבא',
    startDate: daysFromNow(7), endDate: daysFromNow(8),
    requiredUserCategories: [CAT_OFFICER], forbiddenUserCategories: [],
    users: [], pointsPerHour: 2,
    location: 'מרכז טכנולוגי', status: ShiftStatus.Active,
    details: '', createdAt: new Date(),
  });
  shiftBatch.set(shiftId('shift-sw-7'), {
    groupId: GROUP_SOFTWARE, displayName: 'תורנות לילה מתוכננת',
    startDate: daysFromNow(14), endDate: daysFromNow(15),
    requiredUserCategories: [], forbiddenUserCategories: [],
    users: [], pointsPerHour: 3,
    location: 'חדר שרתים', status: ShiftStatus.Active,
    details: '', createdAt: new Date(),
  });
  shiftBatch.set(shiftId('shift-sw-8'), {
    groupId: GROUP_SOFTWARE, displayName: 'תורנות בוקר מתוכננת',
    startDate: daysFromNow(21), endDate: daysFromNow(21),
    requiredUserCategories: [], forbiddenUserCategories: [CAT_OFFICER],
    users: [], pointsPerHour: 1,
    location: 'חדר שרתים', status: ShiftStatus.Active,
    details: '', createdAt: new Date(),
  });

  // ── תורנויות קארין shifts ─────────────────────────────────────────────────
  shiftBatch.set(shiftId('shift-ka-1'), {
    groupId: GROUP_KARIN, displayName: 'קארין לילה',
    startDate: daysFromNow(-18), endDate: daysFromNow(-17),
    requiredUserCategories: [], forbiddenUserCategories: [],
    users: [USER_1, USER_3], pointsPerHour: 2,
    location: 'קארין', status: ShiftStatus.Finished,
    details: '', createdAt: new Date(),
  });
  shiftBatch.set(shiftId('shift-ka-2'), {
    groupId: GROUP_KARIN, displayName: 'קארין בוקר',
    startDate: daysFromNow(-12), endDate: daysFromNow(-11),
    requiredUserCategories: [], forbiddenUserCategories: [],
    users: [USER_3], pointsPerHour: 1,
    location: 'קארין', status: ShiftStatus.Finished,
    details: '', createdAt: new Date(),
  });
  shiftBatch.set(shiftId('shift-ka-3'), {
    groupId: GROUP_KARIN, displayName: 'קארין סוף שבוע',
    startDate: daysFromNow(-5), endDate: daysFromNow(-4),
    requiredUserCategories: [], forbiddenUserCategories: [],
    users: [USER_1, USER_3], pointsPerHour: 3,
    location: 'קארין', status: ShiftStatus.Finished,
    details: '', createdAt: new Date(),
  });
  shiftBatch.set(shiftId('shift-ka-4'), {
    groupId: GROUP_KARIN, displayName: 'קארין לילה אחרון',
    startDate: daysFromNow(-2), endDate: daysFromNow(-1),
    requiredUserCategories: [CAT_SOLDIER], forbiddenUserCategories: [],
    users: [USER_3], pointsPerHour: 2,
    location: 'קארין', status: ShiftStatus.Finished,
    details: '', createdAt: new Date(),
  });
  shiftBatch.set(shiftId('shift-ka-5'), {
    groupId: GROUP_KARIN, displayName: 'קארין מחר',
    startDate: daysFromNow(2), endDate: daysFromNow(3),
    requiredUserCategories: [], forbiddenUserCategories: [],
    users: [], pointsPerHour: 2,
    location: 'קארין', status: ShiftStatus.Active,
    details: '', createdAt: new Date(),
  });
  shiftBatch.set(shiftId('shift-ka-6'), {
    groupId: GROUP_KARIN, displayName: 'קארין שבוע הבא',
    startDate: daysFromNow(8), endDate: daysFromNow(9),
    requiredUserCategories: [], forbiddenUserCategories: [],
    users: [], pointsPerHour: 2,
    location: 'קארין', status: ShiftStatus.Active,
    details: '', createdAt: new Date(),
  });
  shiftBatch.set(shiftId('shift-ka-7'), {
    groupId: GROUP_KARIN, displayName: 'קארין לילה מתוכננת',
    startDate: daysFromNow(15), endDate: daysFromNow(16),
    requiredUserCategories: [], forbiddenUserCategories: [],
    users: [], pointsPerHour: 3,
    location: 'קארין', status: ShiftStatus.Active,
    details: '', createdAt: new Date(),
  });
  shiftBatch.set(shiftId('shift-ka-8'), {
    groupId: GROUP_KARIN, displayName: 'קארין בוקר מתוכננת',
    startDate: daysFromNow(22), endDate: daysFromNow(22),
    requiredUserCategories: [], forbiddenUserCategories: [],
    users: [], pointsPerHour: 1,
    location: 'קארין', status: ShiftStatus.Active,
    details: '', createdAt: new Date(),
  });

  // ── שמירות מחנה shifts ────────────────────────────────────────────────────
  shiftBatch.set(shiftId('shift-gu-1'), {
    groupId: GROUP_GUARD, displayName: 'שמירת שער',
    startDate: daysFromNow(-16), endDate: daysFromNow(-15),
    requiredUserCategories: [], forbiddenUserCategories: [],
    users: [USER_3, USER_4, USER_5], pointsPerHour: 1,
    location: 'שער הכניסה', status: ShiftStatus.Finished,
    details: '', createdAt: new Date(),
  });
  shiftBatch.set(shiftId('shift-gu-2'), {
    groupId: GROUP_GUARD, displayName: 'שמירת לילה',
    startDate: daysFromNow(-10), endDate: daysFromNow(-9),
    requiredUserCategories: [], forbiddenUserCategories: [],
    users: [USER_4, USER_5], pointsPerHour: 2,
    location: 'היקף המחנה', status: ShiftStatus.Finished,
    details: '', createdAt: new Date(),
  });
  shiftBatch.set(shiftId('shift-gu-3'), {
    groupId: GROUP_GUARD, displayName: 'שמירת יום',
    startDate: daysFromNow(-6), endDate: daysFromNow(-5),
    requiredUserCategories: [], forbiddenUserCategories: [],
    users: [USER_3, USER_4], pointsPerHour: 1,
    location: 'שער הכניסה', status: ShiftStatus.Finished,
    details: '', createdAt: new Date(),
  });
  shiftBatch.set(shiftId('shift-gu-4'), {
    groupId: GROUP_GUARD, displayName: 'שמירת לילה אחרונה',
    startDate: daysFromNow(-1), endDate: daysFromNow(0),
    requiredUserCategories: [CAT_SERGEANT], forbiddenUserCategories: [],
    users: [USER_5], pointsPerHour: 2,
    location: 'היקף המחנה', status: ShiftStatus.Finished,
    details: '', createdAt: new Date(),
  });
  shiftBatch.set(shiftId('shift-gu-5'), {
    groupId: GROUP_GUARD, displayName: 'שמירת שער מחר',
    startDate: daysFromNow(1), endDate: daysFromNow(2),
    requiredUserCategories: [], forbiddenUserCategories: [],
    users: [], pointsPerHour: 1,
    location: 'שער הכניסה', status: ShiftStatus.Active,
    details: '', createdAt: new Date(),
  });
  shiftBatch.set(shiftId('shift-gu-6'), {
    groupId: GROUP_GUARD, displayName: 'שמירת לילה שבוע הבא',
    startDate: daysFromNow(6), endDate: daysFromNow(7),
    requiredUserCategories: [], forbiddenUserCategories: [],
    users: [], pointsPerHour: 2,
    location: 'היקף המחנה', status: ShiftStatus.Active,
    details: '', createdAt: new Date(),
  });
  shiftBatch.set(shiftId('shift-gu-7'), {
    groupId: GROUP_GUARD, displayName: 'שמירה מתוכננת',
    startDate: daysFromNow(13), endDate: daysFromNow(14),
    requiredUserCategories: [], forbiddenUserCategories: [],
    users: [], pointsPerHour: 1,
    location: 'שער הכניסה', status: ShiftStatus.Active,
    details: '', createdAt: new Date(),
  });
  shiftBatch.set(shiftId('shift-gu-8'), {
    groupId: GROUP_GUARD, displayName: 'שמירת לילה מתוכננת',
    startDate: daysFromNow(20), endDate: daysFromNow(21),
    requiredUserCategories: [], forbiddenUserCategories: [CAT_OFFICER],
    users: [], pointsPerHour: 2,
    location: 'היקף המחנה', status: ShiftStatus.Active,
    details: '', createdAt: new Date(),
  });

  await shiftBatch.commit();
  console.log('  ✓ shifts');

  // ── Batch 2: shiftAssignments ──────────────────────────────────────────────
  const assignBatch = db.batch();
  const asgn = (id: string, shiftId: string, userId: string) =>
    assignBatch.set(collections.shiftAssignments.doc(id), {
      shiftId, userId,
      assignedBy: AssignmentType.Auto,
      assignedAt: new Date(),
    });

  asgn('asgn-sw-1-u1', 'shift-sw-1', USER_1);
  asgn('asgn-sw-1-u2', 'shift-sw-1', USER_2);
  asgn('asgn-sw-2-u2', 'shift-sw-2', USER_2);
  asgn('asgn-sw-2-u5', 'shift-sw-2', USER_5);
  asgn('asgn-sw-3-u1', 'shift-sw-3', USER_1);
  asgn('asgn-sw-3-u5', 'shift-sw-3', USER_5);
  asgn('asgn-sw-4-u1', 'shift-sw-4', USER_1);
  asgn('asgn-sw-4-u2', 'shift-sw-4', USER_2);
  asgn('asgn-sw-4-u5', 'shift-sw-4', USER_5);
  asgn('asgn-ka-1-u1', 'shift-ka-1', USER_1);
  asgn('asgn-ka-1-u3', 'shift-ka-1', USER_3);
  asgn('asgn-ka-2-u3', 'shift-ka-2', USER_3);
  asgn('asgn-ka-3-u1', 'shift-ka-3', USER_1);
  asgn('asgn-ka-3-u3', 'shift-ka-3', USER_3);
  asgn('asgn-ka-4-u3', 'shift-ka-4', USER_3);
  asgn('asgn-gu-1-u3', 'shift-gu-1', USER_3);
  asgn('asgn-gu-1-u4', 'shift-gu-1', USER_4);
  asgn('asgn-gu-1-u5', 'shift-gu-1', USER_5);
  asgn('asgn-gu-2-u4', 'shift-gu-2', USER_4);
  asgn('asgn-gu-2-u5', 'shift-gu-2', USER_5);
  asgn('asgn-gu-3-u3', 'shift-gu-3', USER_3);
  asgn('asgn-gu-3-u4', 'shift-gu-3', USER_4);
  asgn('asgn-gu-4-u5', 'shift-gu-4', USER_5);

  await assignBatch.commit();
  console.log('  ✓ shiftAssignments');

  // ── Batch 3: userGroupPoints (only for groups with hasPointsTracking) ───────
  const pointsBatch = db.batch();
  const pts = (id: string, userId: string, groupId: string, count: number) =>
    pointsBatch.set(collections.userGroupPoints.doc(id), {
      userId, groupId, count,
      lastDate: daysFromNow(-1),
    });

  // SOFTWARE group points
  pts('pts-sw-u1', USER_1, GROUP_SOFTWARE, 14);
  pts('pts-sw-u2', USER_2, GROUP_SOFTWARE, 8);
  pts('pts-sw-u5', USER_5, GROUP_SOFTWARE, 10);

  // KARIN group points
  pts('pts-ka-u1', USER_1, GROUP_KARIN, 10);
  pts('pts-ka-u3', USER_3, GROUP_KARIN, 16);

  await pointsBatch.commit();
  console.log('  ✓ userGroupPoints');
}
```

---

### Task 7: Implement `seedRequests`

**Files:**
- Modify: `new/server/src/seed.ts`

**Step 1: Add `seedRequests` function**

```ts
async function seedRequests() {
  const batch = db.batch();

  const req = (id: string, userId: string, offsetStart: number, offsetEnd: number, type: RequestType, description: string) =>
    batch.set(collections.requests.doc(id), {
      userId, type, description,
      startDate: daysFromNow(offsetStart),
      endDate: daysFromNow(offsetEnd),
      createdAt: new Date(),
    });

  req('req-u1-1', USER_1, 5, 6, RequestType.Exclude, 'חופשה משפחתית');
  req('req-u1-2', USER_1, 20, 21, RequestType.Prefer, 'מעדיף תורנות בוקר');
  req('req-u2-1', USER_2, 3, 4, RequestType.Exclude, 'בדיקה רפואית');
  req('req-u2-2', USER_2, 15, 16, RequestType.Prefer, 'זמינה לכל תורנות');
  req('req-u3-1', USER_3, 8, 9, RequestType.Exclude, 'אירוע אישי');
  req('req-u3-2', USER_3, 25, 26, RequestType.Prefer, 'תורנות לילה מועדפת');
  req('req-u4-1', USER_4, 4, 5, RequestType.Exclude, 'יום הולדת');
  req('req-u4-2', USER_4, 18, 19, RequestType.Prefer, 'זמינה כל היום');
  req('req-u5-1', USER_5, 10, 11, RequestType.Exclude, 'נסיעה עסקית');
  req('req-u5-2', USER_5, 28, 29, RequestType.Prefer, 'מעדיף שמירת לילה');

  await batch.commit();
  console.log('  ✓ requests');
}
```

---

### Task 8: Implement `seedTemplates`

**Files:**
- Modify: `new/server/src/seed.ts`

**Step 1: Add `seedTemplates` function**

```ts
async function seedTemplates() {
  const batch = db.batch();

  batch.set(collections.templates.doc('tmpl-software'), {
    displayName: 'תורנות תוכנה סטנדרטית',
    includedUserCategories: [CAT_SOLDIER, CAT_SERGEANT],
    excludedUserCategories: [],
    points: 10,
    createdAt: new Date(),
  });

  batch.set(collections.templates.doc('tmpl-karin'), {
    displayName: 'תורנות קארין לילה',
    includedUserCategories: [],
    excludedUserCategories: [CAT_OFFICER],
    points: 15,
    createdAt: new Date(),
  });

  batch.set(collections.templates.doc('tmpl-guard'), {
    displayName: 'שמירה סטנדרטית',
    includedUserCategories: [CAT_SERGEANT, CAT_SOLDIER],
    excludedUserCategories: [],
    points: 8,
    createdAt: new Date(),
  });

  await batch.commit();
  console.log('  ✓ templates');
}
```

---

### Task 9: End-to-end run and commit

**Step 1: Run the seed against a clean database**

```bash
cd new/server
npm run seed
```

Expected output:
```
🌱 Seeding database...
  ✓ userCategories
  ✓ groups
  ✓ users
  ✓ shifts
  ✓ shiftAssignments
  ✓ userGroupPoints
  ✓ requests
  ✓ templates
✅ Seed complete.
```

**Step 2: Run again to verify the skip-guard works**

```bash
npm run seed
```

Expected:
```
⚠️  Database already has data — skipping seed. Drop collections manually to reseed.
```

**Step 3: Log in with seeded credentials**

Start both servers (`npm run dev` in `new/server/` and `new/client/`), then visit `http://localhost:5173` and log in:

| Username        | Password  | Expected role        |
|-----------------|-----------|----------------------|
| `admin`         | `admin123`| Global admin         |
| `admin_software`| `admin123`| Group admin (תוכנה)  |
| `admin_karin`   | `admin123`| Group admin (קארין)  |
| `admin_guard`   | `admin123`| Group admin (שמירות) |
| `user1`         | `user123` | Regular user         |

**Step 4: Commit**

```bash
git add new/server/src/seed.ts new/server/package.json
git commit -m "feat(seed): add Firestore seed script with 3 groups, 9 users, 24 shifts"
```
