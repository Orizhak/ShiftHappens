# ShiftHappens — Assignment Algorithm

## Overview

The assignment algorithm calculates a **fitness score** (0–100) for each user in a group, determining their suitability for a specific shift. The algorithm considers conflicts, fairness, categories, and user requests.

---

## Pipeline

### `getUsersForAssignment(groupId, shiftData)`

Full pipeline that produces ranked candidates:

1. **Load data in parallel:**
   - All non-admin users in the group
   - All shifts in the group (for conflict detection)
   - All points records for the group (for fairness)
   - All requests for group users (Exclude/Prefer)

2. **For each user:** run `calculateUserFitness()`

3. **Return:** `{ users: UserFitness[], totalUsers, fitUsers }`

---

## Fitness Scoring

### Base Score: **100**

Each penalty or bonus is applied additively:

| Check | Score Impact | Makes Unfit? |
|-------|-------------|-------------|
| Exclude request covers shift date | **-80** | Yes |
| Same-day shift conflict | **-50** | Yes |
| Required categories missing | **-40** | No* |
| Weekly hours would exceed 40h | **-30** | No* |
| Forbidden categories present | **-60** | Yes |
| Points fairness penalty | **-min(30, floor(points/5))** | No |
| Prefer request covers shift date | **+10** | No |

*These reduce the score but don't hard-block. The user becomes unfit only if the final score drops below 50.

### `isFit` Determination

A user is marked as **fit** (`isFit = true`) when ALL of these conditions hold:
1. `fitnessScore >= 50`
2. No same-day shift conflict (`hasSameDayShift == false`)
3. No active Exclude request covering the shift date
4. No forbidden categories match

The final score is clamped to `[0, 100]`.

---

## Detailed Checks

### 1. Exclude/Prefer Requests

```
For each of the user's requests:
  If shift.startDate falls within [request.startDate, request.endDate]:
    - Exclude: score -= 80, isFit = false
    - Prefer:  score += 10
```

Requests are loaded in batch (Firestore `in` queries, batched by 30) and grouped by userId for efficient lookup.

### 2. Same-Day Shift Conflict

```
Find existing shifts where:
  - Same calendar day as new shift's startDate
  - User is in shift.users[]
  - Shift status is not Cancelled

If any found:
  - score -= 50
  - hasSameDayShift = true
  - conflictingShift = first match (for UI display)
```

### 3. Weekly Hours Check

```
Calculate week boundaries (Sunday–Saturday) around shift date
Sum hours of all shifts in that week where user is assigned
If (weeklyHours + newShiftDuration) > 40:
  - score -= 30
  - unfitReason: "חורג ממגבלת שעות שבועיות"
```

### 4. Category Checks

**Required categories** (shift requires at least one):
```
If shift has requiredUserCategories AND user has none of them:
  - score -= 40
  - unfitReason: "חסרות קטגוריות נדרשות"
```

**Forbidden categories** (shift forbids specific categories):
```
If user has any of shift's forbiddenUserCategories:
  - score -= 60
  - isFit = false
  - unfitReason: "יש קטגוריות אסורות"
```

### 5. Points Fairness Penalty

```
penalty = min(30, floor(currentPoints / 5))
score -= penalty
```

Users with more accumulated points get penalized, ensuring fair distribution. A user with 150 points gets the maximum -30 penalty. A user with 0 points gets no penalty.

---

## Auto-Assignment Selection

### `selectAutoAssignment(candidates, numUsers)`

1. **Filter** to only `isFit` users
2. **Sort** by:
   - Primary: `fitnessScore` descending (highest score first)
   - Tiebreaker: `currentPoints` ascending (fewer points = higher priority)
3. **Select** top `numUsers` candidates

This ensures the most suitable AND least-burdened users are selected.

---

## User Replacement

### `replaceUserInAssignment(groupId, shiftData, currentUsers, userToReplace)`

1. Run full assignment pipeline
2. Exclude all current users AND the user being replaced from candidates
3. Select the best single replacement from remaining candidates
4. Return updated user list with replacement swapped in

---

## Per-Slot Categories (Client-Side)

When a shift has multiple slots with **different** category requirements:

- The server computes global fitness (ignoring per-slot requirements)
- The client adjusts fitness per slot:
  - If a user lacks a slot's required categories: **-40** to that slot's score
- Each slot gets its own candidate list, sorted by slot-adjusted fitness

This allows the same shift to have, e.g., Slot 1 requiring "Officer" and Slot 2 requiring "Sergeant".

**Normal mode** (single list) is used when:
- All slots have the same categories, OR
- No slots have specific requirements

---

## Data Structures

### `UserFitness`
```typescript
{
  user: User;
  fitnessScore: number;    // 0–100
  isFit: boolean;
  unfitReasons: string[];  // Hebrew explanations
  hasSameDayShift: boolean;
  conflictingShift?: Shift;
  weeklyHours: number;
  currentPoints: number;
}
```

### `AssignmentShiftData`
```typescript
{
  numUsers: number;
  requiredUserCategories: string[];
  forbiddenUserCategories: string[];
  startDate: string;       // ISO date
  startHour: string;       // "HH:mm"
  duration: number;        // hours
}
```

---

## Example Scenario

**Shift:** Monday, 8 hours, requires "Sergeant", 2 points/hour

| User | Points | Categories | Same-Day? | Exclude? | Score | Fit? |
|------|--------|-----------|-----------|----------|-------|------|
| David | 0 | Soldier | No | No | 100 - 40 (missing cat) = 60 | Yes* |
| Michal | 8 | Sergeant | No | No | 100 - 1 (points) = 99 | Yes |
| Yossi | 16 | Soldier | Yes | No | 100 - 50 (conflict) - 40 (missing cat) - 3 (points) = 7 | No |
| Rachel | 0 | Soldier | No | Yes (Exclude) | 100 - 80 (exclude) - 40 (missing cat) = -20 → 0 | No |
| Amir | 10 | Sergeant | No | No | 100 - 2 (points) = 98 | Yes |

*David is technically fit (score >= 50) but lacks required categories, so the score is reduced.

**Auto-assignment (2 users):** Michal (99, 8pts) and Amir (98, 10pts) — sorted by fitness then by points.
