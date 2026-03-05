# Seed Script Design — 2026-02-21

## Purpose

Populate Firestore with realistic development data so all app routes can be tested
without manually entering data through the UI.

## Location & Execution

- File: `new/server/src/seed.ts`
- Run via: `npm run seed` (new script in `server/package.json` using `tsx`)
- Reuses existing Firebase Admin init and `server/.env`

## Behavior

- **Skip if data exists**: checks if `users` collection is non-empty → exits with
  a message. No destructive wipes.
- Idempotent: safe to run on a fresh database only.

## Data

### Groups (3)
| displayName           | hasPointsTracking | type     |
|-----------------------|-------------------|----------|
| תורנויות תוכנה        | true              | software |
| תורנויות קארין        | true              | karin    |
| שמירות מחנה           | false             | guard    |

### User Categories (3)
| displayName   | pointsMultiplier | multiplierType |
|---------------|-----------------|----------------|
| קצין          | 1.5             | User           |
| סמל           | 1.2             | User           |
| חייל בסיסי    | 1.0             | User           |

### Users (9)
| username      | password   | name            | role                        | groups                      |
|---------------|------------|-----------------|-----------------------------|-----------------------------|
| admin         | admin123   | מנהל מערכת      | globalAdmin                 | all 3 (admin)               |
| admin_software| admin123   | מנהל תוכנה      | groupAdmin                  | תורנויות תוכנה (admin)       |
| admin_karin   | admin123   | מנהל קארין      | groupAdmin                  | תורנויות קארין (admin)       |
| admin_guard   | admin123   | מנהל שמירות     | groupAdmin                  | שמירות מחנה (admin)          |
| user1–user5   | user123    | Hebrew names    | regular                     | spread across groups        |

### Shifts (~8 per group = 24 total)
- Mix of `Finished` (past dates) and `Active` (upcoming dates)
- Fields: groupId, displayName, startDate, endDate, requiredUserCategories,
  forbiddenUserCategories, users[], pointsPerHour, location, status, createdAt
- Some shifts have `shiftAssignments` records (Auto assigned)

### ShiftAssignments
- Created for finished shifts — links userId + shiftId, assignedBy: Auto

### UserGroupPoints
- One record per (userId, groupId) pair for groups with `hasPointsTracking: true`
- Realistic counts based on shift history

### Requests (2 per regular user = 10 total)
- Mix of `Exclude` (type 1) and `Prefer` (type 2)
- Date ranges spread across next 30 days

### Templates (3, one per group)
- Reusable shift templates with included/excluded categories and points value

## File Structure

```
new/server/src/seed.ts     ← single self-contained script
```

## Implementation Notes

- Use `bcrypt.hash` (same as authService) for passwords
- Use Firestore `batch.set` with explicit doc IDs for referential integrity
- Commit in logical order: categories → groups → users → shifts → assignments → points → requests → templates
- All dates as JS `Date` objects (Firestore Admin SDK handles conversion)
