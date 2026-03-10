# ShiftHappens — Project Flows & Automatic Processes

## Overview

This document describes all system flows, automatic processes, and lifecycle management in the ShiftHappens app.

---

## 1. Authentication Flow

1. User submits username + password
2. Server validates credentials (bcrypt hash comparison)
3. Server sets httpOnly cookie (7-day expiry)
4. Client stores user in AuthContext
5. On app load: `GET /api/auth/me` restores session from cookie
6. On logout: cookie cleared, React Query cache purged, redirect to login

**Security:** No JWT, no client-side Firebase SDK. Cookie is httpOnly — inaccessible to JavaScript.

---

## 2. Shift Lifecycle

### States
- **Active** — shift is scheduled, awaiting completion
- **Finished** — shift has completed, points awarded
- **Cancelled** — shift was cancelled by admin

### Valid Transitions
```
Active → Finished  (auto or manual)
Active → Cancelled (admin cancels)
Cancelled → Active (admin reactivates)
Finished → ✗       (terminal — points already awarded)
```

### Automatic Completion (Lazy Evaluation)
Shifts are **automatically completed** when their `endDate` passes. Instead of a cron job, the system checks for expired shifts on every relevant API call:

**Trigger points:**
- `GET /api/group-admin/:groupId/shifts` — admin views shifts
- `GET /api/group-admin/:groupId/leaderboard` — admin views leaderboard
- `GET /api/user/shifts/upcoming` — user views upcoming shifts
- `GET /api/user/shifts` — user views all shifts
- `GET /api/user/points` — user views points
- `GET /api/user/points/leaderboard/:groupId` — user views leaderboard

**Process (`completeExpiredShifts`):**
1. Query all Active shifts for the group
2. Filter where `endDate < now()`
3. For each expired shift:
   - Update status → `Finished`
   - Award points to all assigned users (see Points Awarding below)
4. Return count of completed shifts

### Manual Completion
Admin can click "Mark as Finished" button on any Active shift. The server:
1. Validates the status transition (Active → Finished)
2. Updates the shift status
3. Awards points to assigned users

### Cancellation
Admin clicks cancel button on Active shifts. No points are awarded or removed.

---

## 3. Points Awarding System

### When Points Are Awarded
- **Automatic shift completion** — when a shift's endDate passes
- **Manual shift completion** — when admin clicks "Mark as Finished"
- **Manual adjustment** — admin can directly add/subtract points via leaderboard

### Points Calculation (`awardPointsForShift`)
```
basePoints = shift.pointsPerHour × durationHours
```

**Category multiplier:**
- Load all UserCategory definitions
- For each category the user belongs to, check its `pointsMultiplier`
- Use the **highest** applicable multiplier (not compounded)
- `finalPoints = round(basePoints × maxMultiplier)`

**Example:**
- Shift: 8 hours, 2 points/hour → basePoints = 16
- User has "Officer" category (1.5x multiplier) → finalPoints = 24

### Points Storage
Each user-group combination has a `userGroupPoints` document:
- `count` — cumulative point total
- `lastDate` — when points were last updated
- Created automatically on first award, incremented thereafter

### Leaderboard
- Sorted by points ascending (lowest points = highest rank = most fairness)
- User PointsPage shows "Best Rank" across all groups

---

## 4. Request System (Exclude/Prefer)

### Request Types
- **Exclude** — user requests exemption from shifts during a date range
- **Prefer** — user indicates preference for shifts during a date range

### How Requests Affect Assignment
Requests are loaded during the assignment pipeline and directly affect fitness scoring:

- **Exclude request overlapping shift date:**
  - Fitness score: **-80** (effectively blocks assignment)
  - Adds unfit reason: "יש בקשת פטור לתאריך זה"
  - `isFit` = false (exclude requests hard-block the user)

- **Prefer request overlapping shift date:**
  - Fitness score: **+10** (boosts the user in rankings)

### Request Lifecycle
1. User creates request with date range, type, and description
2. Admin can view all group members' requests
3. Admin can delete any request
4. User can delete their own requests
5. Requests are considered during every assignment operation

---

## 5. Assignment Flow

### Admin Creates a Shift
1. Fill basic info (name, date, time, location, points, number of users)
2. Set category requirements (required/forbidden, per-slot optional)
3. Go to Assignment step:
   - System computes fitness for each eligible user
   - **Normal mode:** when all slots have same/no categories
   - **Per-slot mode:** when slots have different category requirements
4. Admin can:
   - **Auto-assign:** system picks best candidates
   - **Manual select:** admin picks users from ranked list
   - **Replace:** swap one user for the next best candidate
5. Review and submit

### What the Algorithm Considers
(See `ASSIGNMENT_ALGORITHM.md` for full details)

- Same-day shift conflicts
- Weekly hours limit (40h)
- Required/forbidden categories
- Points fairness (users with fewer points ranked higher)
- Exclude/Prefer requests
- Per-slot category requirements (client-side adjustment)

---

## 6. Cascade Cleanup

### User Removed from Group
When an admin removes a user from a group, the system automatically:
1. Removes group from user's `groups[]` array
2. Finds all **future Active** shifts in that group containing the user
3. Removes the user from each shift's `users[]` array
4. Deletes the user's `userGroupPoints` record for that group

### Shift Deleted
When an admin deletes a shift:
- The shift document is removed from Firestore
- No cascade needed (ShiftAssignment model was removed)

---

## 7. Status Validation

The PATCH endpoint for shifts enforces valid status transitions:

| Current Status | Allowed Transitions |
|---------------|-------------------|
| Active | → Finished, → Cancelled |
| Cancelled | → Active |
| Finished | (none — terminal) |

Invalid transitions return HTTP 400 with "מעבר סטטוס לא חוקי".

When transitioning to Finished, points are awarded automatically.

---

## 8. Data Flow Summary

```
Client (React + React Query)
  │
  ├── API Layer (client/src/api/*.ts)
  │     └── fetch with credentials: 'include'
  │
  ├── Vite Dev Proxy (/api/* → :4000)
  │
  └── Express Server (:4000)
        ├── authenticate middleware (cookie → req.user)
        ├── requireGroupAdmin middleware (role guard)
        ├── Route handlers (thin)
        │     └── Auto-complete expired shifts (lazy)
        └── Service layer (business logic)
              └── Firestore (Firebase Admin SDK)
```

### React Query Patterns
- Each entity has its own query key: `['group-shifts', groupId]`, `['user', 'points']`, etc.
- Mutations invalidate related queries on success
- Assignment candidates use `staleTime: 0` (always fresh)

---

## 9. Template System

Templates are reusable shift configurations:
- Stored per group in Firestore
- Include: name, categories, points, number of users, location, details
- Admin selects a template when creating a shift → fields auto-fill
- Templates don't auto-create shifts — they just pre-fill the form

---

## 10. Category System

UserCategories are global definitions (e.g., "Officer", "Sergeant", "Soldier"):
- Each has a `pointsMultiplier` for points calculation
- Users are tagged with categories by group admins
- Shifts can require or forbid specific categories
- Per-slot category requirements allow different slots in the same shift to need different categories
