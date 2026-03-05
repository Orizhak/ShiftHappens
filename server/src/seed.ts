import 'dotenv/config';
import { db } from './firebase/admin';
import { collections } from './firebase/db';
import bcrypt from 'bcryptjs';
import { Gender, ShiftStatus, RequestType, AssignmentType, MultiplierType } from './types';

function daysFromNow(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

// ─── Drop all collections ─────────────────────────────────────────────────────

async function dropCollections() {
  const names = ['users', 'groups', 'shifts', 'shiftAssignments', 'userGroupPoints', 'userCategories', 'requests', 'templates'] as const;
  for (const name of names) {
    const snap = await collections[name].get();
    for (let i = 0; i < snap.docs.length; i += 500) {
      const batch = db.batch();
      snap.docs.slice(i, i + 500).forEach((d) => batch.delete(d.ref));
      await batch.commit();
    }
  }
  console.log('🗑️  Existing data dropped.');
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const force = process.argv.includes('--force');
  const existingUsers = await collections.users.limit(1).get();

  if (!existingUsers.empty) {
    if (!force) {
      console.log('⚠️  Database already has data — skipping seed. Use --force to wipe and reseed.');
      process.exit(0);
    }
    await dropCollections();
  }

  console.log('🌱 Seeding database...');

  // ── 1. User categories ──────────────────────────────────────────────────────
  const [catOfficerId, catSergeantId, catSoldierId] = await Promise.all([
    collections.userCategories.add({ displayName: 'קצין',       pointsMultiplier: 1.5, multiplierType: MultiplierType.User, createdAt: new Date() }).then(r => r.id),
    collections.userCategories.add({ displayName: 'סמל',        pointsMultiplier: 1.2, multiplierType: MultiplierType.User, createdAt: new Date() }).then(r => r.id),
    collections.userCategories.add({ displayName: 'חייל בסיסי', pointsMultiplier: 1.0, multiplierType: MultiplierType.User, createdAt: new Date() }).then(r => r.id),
  ]);
  console.log('  ✓ userCategories');

  // ── 2. Groups ───────────────────────────────────────────────────────────────
  const [groupSoftwareId, groupKarinId, groupGuardId] = await Promise.all([
    collections.groups.add({ displayName: 'תורנויות תוכנה', hasPointsTracking: true,  type: 'software', createdAt: new Date() }).then(r => r.id),
    collections.groups.add({ displayName: 'תורנויות קארין', hasPointsTracking: true,  type: 'karin',    createdAt: new Date() }).then(r => r.id),
    collections.groups.add({ displayName: 'שמירות מחנה',   hasPointsTracking: false, type: 'guard',    createdAt: new Date() }).then(r => r.id),
  ]);
  console.log('  ✓ groups');

  // ── 3. Users ────────────────────────────────────────────────────────────────
  const adminHash = await bcrypt.hash('admin123', 10);
  const userHash  = await bcrypt.hash('user123',  10);

  const [
    globalAdminId, adminSoftwareId, adminKarinId, adminGuardId,
    user1Id, user2Id, user3Id, user4Id, user5Id,
  ] = await Promise.all([
    collections.users.add({
      username: 'admin', password: adminHash, name: 'מנהל מערכת',
      isActive: true, isGlobalAdmin: true, gender: Gender.Male,
      userCategories: [catOfficerId],
      groups: [
        { groupId: groupSoftwareId, isAdmin: true },
        { groupId: groupKarinId,    isAdmin: true },
        { groupId: groupGuardId,    isAdmin: true },
      ],
      createdAt: new Date(),
    }).then(r => r.id),

    collections.users.add({
      username: 'admin_software', password: adminHash, name: 'מנהל תוכנה',
      isActive: true, isGlobalAdmin: false, gender: Gender.Male,
      userCategories: [catOfficerId],
      groups: [{ groupId: groupSoftwareId, isAdmin: true }],
      createdAt: new Date(),
    }).then(r => r.id),

    collections.users.add({
      username: 'admin_karin', password: adminHash, name: 'מנהלת קארין',
      isActive: true, isGlobalAdmin: false, gender: Gender.Female,
      userCategories: [catOfficerId],
      groups: [{ groupId: groupKarinId, isAdmin: true }],
      createdAt: new Date(),
    }).then(r => r.id),

    collections.users.add({
      username: 'admin_guard', password: adminHash, name: 'מנהל שמירות',
      isActive: true, isGlobalAdmin: false, gender: Gender.Male,
      userCategories: [catSergeantId],
      groups: [{ groupId: groupGuardId, isAdmin: true }],
      createdAt: new Date(),
    }).then(r => r.id),

    collections.users.add({
      username: 'user1', password: userHash, name: 'דוד כהן',
      isActive: true, isGlobalAdmin: false, gender: Gender.Male,
      userCategories: [catSoldierId],
      groups: [
        { groupId: groupSoftwareId, isAdmin: false },
        { groupId: groupKarinId,    isAdmin: false },
      ],
      createdAt: new Date(),
    }).then(r => r.id),

    collections.users.add({
      username: 'user2', password: userHash, name: 'מיכל לוי',
      isActive: true, isGlobalAdmin: false, gender: Gender.Female,
      userCategories: [catSergeantId],
      groups: [{ groupId: groupSoftwareId, isAdmin: false }],
      createdAt: new Date(),
    }).then(r => r.id),

    collections.users.add({
      username: 'user3', password: userHash, name: 'יוסי אברהם',
      isActive: true, isGlobalAdmin: false, gender: Gender.Male,
      userCategories: [catSoldierId],
      groups: [
        { groupId: groupKarinId,  isAdmin: false },
        { groupId: groupGuardId,  isAdmin: false },
      ],
      createdAt: new Date(),
    }).then(r => r.id),

    collections.users.add({
      username: 'user4', password: userHash, name: 'רחל ברקוביץ',
      isActive: true, isGlobalAdmin: false, gender: Gender.Female,
      userCategories: [catSoldierId],
      groups: [{ groupId: groupGuardId, isAdmin: false }],
      createdAt: new Date(),
    }).then(r => r.id),

    collections.users.add({
      username: 'user5', password: userHash, name: 'אמיר שפירא',
      isActive: true, isGlobalAdmin: false, gender: Gender.Male,
      userCategories: [catSergeantId],
      groups: [
        { groupId: groupSoftwareId, isAdmin: false },
        { groupId: groupGuardId,    isAdmin: false },
      ],
      createdAt: new Date(),
    }).then(r => r.id),
  ]);
  console.log('  ✓ users');

  // ── 4. Shifts ───────────────────────────────────────────────────────────────
  const shiftDefs = [
    // תורנויות תוכנה
    { groupId: groupSoftwareId, displayName: 'תורנות לילה ראשונה',  startDate: daysFromNow(-20), endDate: daysFromNow(-19), requiredUserCategories: [],              forbiddenUserCategories: [],              users: [user1Id, user2Id],              pointsPerHour: 2, location: 'חדר שרתים',      status: ShiftStatus.Finished, details: '' },
    { groupId: groupSoftwareId, displayName: 'תורנות בוקר',         startDate: daysFromNow(-14), endDate: daysFromNow(-13), requiredUserCategories: [catSergeantId], forbiddenUserCategories: [],              users: [user2Id, user5Id],              pointsPerHour: 1, location: 'חדר שרתים',      status: ShiftStatus.Finished, details: '' },
    { groupId: groupSoftwareId, displayName: 'תורנות סוף שבוע',     startDate: daysFromNow(-7),  endDate: daysFromNow(-6),  requiredUserCategories: [],              forbiddenUserCategories: [],              users: [user1Id, user5Id],              pointsPerHour: 3, location: 'מרכז טכנולוגי', status: ShiftStatus.Finished, details: '' },
    { groupId: groupSoftwareId, displayName: 'תורנות לילה',         startDate: daysFromNow(-3),  endDate: daysFromNow(-2),  requiredUserCategories: [],              forbiddenUserCategories: [],              users: [user1Id, user2Id, user5Id],     pointsPerHour: 2, location: 'חדר שרתים',      status: ShiftStatus.Finished, details: '' },
    { groupId: groupSoftwareId, displayName: 'תורנות מחר',          startDate: daysFromNow(1),   endDate: daysFromNow(2),   requiredUserCategories: [],              forbiddenUserCategories: [],              users: [],                              pointsPerHour: 2, location: 'חדר שרתים',      status: ShiftStatus.Active,   details: 'תורנות תוכנה רגילה' },
    { groupId: groupSoftwareId, displayName: 'תורנות שבוע הבא',     startDate: daysFromNow(7),   endDate: daysFromNow(8),   requiredUserCategories: [catOfficerId],  forbiddenUserCategories: [],              users: [],                              pointsPerHour: 2, location: 'מרכז טכנולוגי', status: ShiftStatus.Active,   details: '' },
    { groupId: groupSoftwareId, displayName: 'תורנות לילה מתוכננת', startDate: daysFromNow(14),  endDate: daysFromNow(15),  requiredUserCategories: [],              forbiddenUserCategories: [],              users: [],                              pointsPerHour: 3, location: 'חדר שרתים',      status: ShiftStatus.Active,   details: '' },
    { groupId: groupSoftwareId, displayName: 'תורנות בוקר מתוכננת', startDate: daysFromNow(21),  endDate: daysFromNow(21),  requiredUserCategories: [],              forbiddenUserCategories: [catOfficerId], users: [],                              pointsPerHour: 1, location: 'חדר שרתים',      status: ShiftStatus.Active,   details: '' },
    // תורנויות קארין
    { groupId: groupKarinId, displayName: 'קארין לילה',            startDate: daysFromNow(-18), endDate: daysFromNow(-17), requiredUserCategories: [],              forbiddenUserCategories: [],              users: [user1Id, user3Id],              pointsPerHour: 2, location: 'קארין', status: ShiftStatus.Finished, details: '' },
    { groupId: groupKarinId, displayName: 'קארין בוקר',            startDate: daysFromNow(-12), endDate: daysFromNow(-11), requiredUserCategories: [],              forbiddenUserCategories: [],              users: [user3Id],                       pointsPerHour: 1, location: 'קארין', status: ShiftStatus.Finished, details: '' },
    { groupId: groupKarinId, displayName: 'קארין סוף שבוע',        startDate: daysFromNow(-5),  endDate: daysFromNow(-4),  requiredUserCategories: [],              forbiddenUserCategories: [],              users: [user1Id, user3Id],              pointsPerHour: 3, location: 'קארין', status: ShiftStatus.Finished, details: '' },
    { groupId: groupKarinId, displayName: 'קארין לילה אחרון',      startDate: daysFromNow(-2),  endDate: daysFromNow(-1),  requiredUserCategories: [catSoldierId], forbiddenUserCategories: [],              users: [user3Id],                       pointsPerHour: 2, location: 'קארין', status: ShiftStatus.Finished, details: '' },
    { groupId: groupKarinId, displayName: 'קארין מחר',             startDate: daysFromNow(2),   endDate: daysFromNow(3),   requiredUserCategories: [],              forbiddenUserCategories: [],              users: [],                              pointsPerHour: 2, location: 'קארין', status: ShiftStatus.Active,   details: '' },
    { groupId: groupKarinId, displayName: 'קארין שבוע הבא',        startDate: daysFromNow(8),   endDate: daysFromNow(9),   requiredUserCategories: [],              forbiddenUserCategories: [],              users: [],                              pointsPerHour: 2, location: 'קארין', status: ShiftStatus.Active,   details: '' },
    { groupId: groupKarinId, displayName: 'קארין לילה מתוכננת',    startDate: daysFromNow(15),  endDate: daysFromNow(16),  requiredUserCategories: [],              forbiddenUserCategories: [],              users: [],                              pointsPerHour: 3, location: 'קארין', status: ShiftStatus.Active,   details: '' },
    { groupId: groupKarinId, displayName: 'קארין בוקר מתוכננת',    startDate: daysFromNow(22),  endDate: daysFromNow(22),  requiredUserCategories: [],              forbiddenUserCategories: [],              users: [],                              pointsPerHour: 1, location: 'קארין', status: ShiftStatus.Active,   details: '' },
    // שמירות מחנה
    { groupId: groupGuardId, displayName: 'שמירת שער',              startDate: daysFromNow(-16), endDate: daysFromNow(-15), requiredUserCategories: [],               forbiddenUserCategories: [],              users: [user3Id, user4Id, user5Id],     pointsPerHour: 1, location: 'שער הכניסה',  status: ShiftStatus.Finished, details: '' },
    { groupId: groupGuardId, displayName: 'שמירת לילה',             startDate: daysFromNow(-10), endDate: daysFromNow(-9),  requiredUserCategories: [],               forbiddenUserCategories: [],              users: [user4Id, user5Id],              pointsPerHour: 2, location: 'היקף המחנה', status: ShiftStatus.Finished, details: '' },
    { groupId: groupGuardId, displayName: 'שמירת יום',              startDate: daysFromNow(-6),  endDate: daysFromNow(-5),  requiredUserCategories: [],               forbiddenUserCategories: [],              users: [user3Id, user4Id],              pointsPerHour: 1, location: 'שער הכניסה',  status: ShiftStatus.Finished, details: '' },
    { groupId: groupGuardId, displayName: 'שמירת לילה אחרונה',      startDate: daysFromNow(-1),  endDate: daysFromNow(0),   requiredUserCategories: [catSergeantId],  forbiddenUserCategories: [],              users: [user5Id],                       pointsPerHour: 2, location: 'היקף המחנה', status: ShiftStatus.Finished, details: '' },
    { groupId: groupGuardId, displayName: 'שמירת שער מחר',          startDate: daysFromNow(1),   endDate: daysFromNow(2),   requiredUserCategories: [],               forbiddenUserCategories: [],              users: [],                              pointsPerHour: 1, location: 'שער הכניסה',  status: ShiftStatus.Active,   details: '' },
    { groupId: groupGuardId, displayName: 'שמירת לילה שבוע הבא',    startDate: daysFromNow(6),   endDate: daysFromNow(7),   requiredUserCategories: [],               forbiddenUserCategories: [],              users: [],                              pointsPerHour: 2, location: 'היקף המחנה', status: ShiftStatus.Active,   details: '' },
    { groupId: groupGuardId, displayName: 'שמירה מתוכננת',           startDate: daysFromNow(13),  endDate: daysFromNow(14),  requiredUserCategories: [],               forbiddenUserCategories: [],              users: [],                              pointsPerHour: 1, location: 'שער הכניסה',  status: ShiftStatus.Active,   details: '' },
    { groupId: groupGuardId, displayName: 'שמירת לילה מתוכננת',      startDate: daysFromNow(20),  endDate: daysFromNow(21),  requiredUserCategories: [],               forbiddenUserCategories: [catOfficerId], users: [],                              pointsPerHour: 2, location: 'היקף המחנה', status: ShiftStatus.Active,   details: '' },
  ];

  const shiftIds = await Promise.all(
    shiftDefs.map(def => collections.shifts.add({ ...def, createdAt: new Date() }).then(r => r.id))
  );
  console.log('  ✓ shifts');

  // ── 5. Shift assignments (finished shifts only) ─────────────────────────────
  // shiftDefs indices: sw=0-7, ka=8-15, gu=16-23
  const assignmentDefs = [
    { shiftIdx: 0,  userId: user1Id }, { shiftIdx: 0,  userId: user2Id },
    { shiftIdx: 1,  userId: user2Id }, { shiftIdx: 1,  userId: user5Id },
    { shiftIdx: 2,  userId: user1Id }, { shiftIdx: 2,  userId: user5Id },
    { shiftIdx: 3,  userId: user1Id }, { shiftIdx: 3,  userId: user2Id }, { shiftIdx: 3, userId: user5Id },
    { shiftIdx: 8,  userId: user1Id }, { shiftIdx: 8,  userId: user3Id },
    { shiftIdx: 9,  userId: user3Id },
    { shiftIdx: 10, userId: user1Id }, { shiftIdx: 10, userId: user3Id },
    { shiftIdx: 11, userId: user3Id },
    { shiftIdx: 16, userId: user3Id }, { shiftIdx: 16, userId: user4Id }, { shiftIdx: 16, userId: user5Id },
    { shiftIdx: 17, userId: user4Id }, { shiftIdx: 17, userId: user5Id },
    { shiftIdx: 18, userId: user3Id }, { shiftIdx: 18, userId: user4Id },
    { shiftIdx: 19, userId: user5Id },
  ];

  const assignBatch = db.batch();
  assignmentDefs.forEach(({ shiftIdx, userId }) => {
    assignBatch.set(collections.shiftAssignments.doc(), {
      shiftId: shiftIds[shiftIdx], userId,
      assignedBy: AssignmentType.Auto, assignedAt: new Date(),
    });
  });
  await assignBatch.commit();
  console.log('  ✓ shiftAssignments');

  // ── 6. User group points (only groups with hasPointsTracking) ───────────────
  const pointsBatch = db.batch();
  [
    { userId: user1Id, groupId: groupSoftwareId, count: 14 },
    { userId: user2Id, groupId: groupSoftwareId, count: 8  },
    { userId: user5Id, groupId: groupSoftwareId, count: 10 },
    { userId: user1Id, groupId: groupKarinId,    count: 10 },
    { userId: user3Id, groupId: groupKarinId,    count: 16 },
  ].forEach(({ userId, groupId, count }) => {
    pointsBatch.set(collections.userGroupPoints.doc(), {
      userId, groupId, count, lastDate: daysFromNow(-1),
    });
  });
  await pointsBatch.commit();
  console.log('  ✓ userGroupPoints');

  // ── 7. Requests ─────────────────────────────────────────────────────────────
  const requestsBatch = db.batch();
  [
    { userId: user1Id, s: 5,  e: 6,  type: RequestType.Exclude, description: 'חופשה משפחתית'       },
    { userId: user1Id, s: 20, e: 21, type: RequestType.Prefer,  description: 'מעדיף תורנות בוקר'   },
    { userId: user2Id, s: 3,  e: 4,  type: RequestType.Exclude, description: 'בדיקה רפואית'         },
    { userId: user2Id, s: 15, e: 16, type: RequestType.Prefer,  description: 'זמינה לכל תורנות'     },
    { userId: user3Id, s: 8,  e: 9,  type: RequestType.Exclude, description: 'אירוע אישי'           },
    { userId: user3Id, s: 25, e: 26, type: RequestType.Prefer,  description: 'תורנות לילה מועדפת'   },
    { userId: user4Id, s: 4,  e: 5,  type: RequestType.Exclude, description: 'יום הולדת'            },
    { userId: user4Id, s: 18, e: 19, type: RequestType.Prefer,  description: 'זמינה כל היום'        },
    { userId: user5Id, s: 10, e: 11, type: RequestType.Exclude, description: 'נסיעה עסקית'          },
    { userId: user5Id, s: 28, e: 29, type: RequestType.Prefer,  description: 'מעדיף שמירת לילה'    },
  ].forEach(({ userId, s, e, type, description }) => {
    requestsBatch.set(collections.requests.doc(), {
      userId, type, description,
      startDate: daysFromNow(s), endDate: daysFromNow(e), createdAt: new Date(),
    });
  });
  await requestsBatch.commit();
  console.log('  ✓ requests');

  // ── 8. Templates ────────────────────────────────────────────────────────────
  const templatesBatch = db.batch();
  [
    { displayName: 'תורנות תוכנה סטנדרטית', includedUserCategories: [catSoldierId, catSergeantId], excludedUserCategories: [],              points: 10 },
    { displayName: 'תורנות קארין לילה',      includedUserCategories: [],                           excludedUserCategories: [catOfficerId],   points: 15 },
    { displayName: 'שמירה סטנדרטית',          includedUserCategories: [catSergeantId, catSoldierId], excludedUserCategories: [],             points: 8  },
  ].forEach(t => {
    templatesBatch.set(collections.templates.doc(), { ...t, createdAt: new Date() });
  });
  await templatesBatch.commit();
  console.log('  ✓ templates');

  console.log('✅ Seed complete.');
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
