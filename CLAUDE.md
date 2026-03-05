# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Military unit shift management app (Hebrew/RTL). Three roles: Regular User, Group Admin, Global Admin. This is the **new codebase** replacing the Next.js 15 app in `../src/`.

## Development Commands

### Server (Terminal 1)
```bash
cd server
npm install        # first time
npm run dev        # tsx watch on :4000
npm run build      # tsc → server/dist/
npm start          # node dist/index.js (production)
```

### Client (Terminal 2)
```bash
cd client
npm install        # first time
npm run dev        # vite on :5173, proxies /api → :4000
npm run build      # tsc + vite build → client/dist/
npm run lint       # eslint src
```

No test runner is configured yet. No root-level package.json — run commands from `server/` or `client/` directories.

## Architecture

**Client:** React 18 + Vite + React Router v6 + React Query + Tailwind + Shadcn/Radix UI
**Server:** Express.js + Firebase Admin SDK (Firestore)
**Auth:** httpOnly cookie session — no JWT, no client-side Firebase SDK

### Request Flow
1. Client calls `apiGet`/`apiPost`/etc from `client/src/api/client.ts` (auto `credentials: 'include'`)
2. Vite dev proxy forwards `/api/*` → Express on :4000
3. `authenticate` middleware reads session cookie → `req.user`
4. `requireGroupAdmin(groupId)` or `requireGlobalAdmin()` guards protected routes
5. Service layer queries Firestore via collection refs in `server/src/firebase/db.ts`

### Key Architectural Files
- `server/src/app.ts` — Express setup, all route mounting
- `server/src/middleware/authenticate.ts` — cookie → req.user
- `server/src/middleware/requireRole.ts` — role guards
- `server/src/services/shiftService.ts` — assignment algorithm (fitness scoring 0-100)
- `client/src/App.tsx` — QueryClientProvider + BrowserRouter + AuthProvider
- `client/src/contexts/AuthContext.tsx` — auth state, calls `/api/auth/me` on mount
- `client/src/router/index.tsx` — all routes in one file
- `client/src/router/ProtectedRoute.tsx` — auth + role guard via Outlet
- `client/src/api/client.ts` — base fetch with date revival and Hebrew error messages

### Data Layer Patterns
- **Server services** (`server/src/services/`) contain all business logic — routes are thin
- **Client API** (`client/src/api/`) — one file per domain: `auth.ts`, `user.ts`, `groupAdmin.ts`
- **React Query hooks** (`client/src/hooks/user/`, `client/src/hooks/groupAdmin/`) — one hook per query/mutation, invalidate related queries on mutation success
- **Types** are defined separately in both `server/src/types/` and `client/src/types/` (client uses ISO strings for dates, server uses Date/Timestamp)

### API Route Structure
- `/api/auth/*` — login, register, logout, me (public)
- `/api/user/*` — shifts, groups, points, requests (requires auth)
- `/api/group-admin/:groupId/*` — shifts CRUD, assignment, users, leaderboard (requires group admin)
- `/api/global-admin/*` — reserved for future use

### UI Patterns
- All UI is Hebrew RTL (`dir="rtl"` on layouts)
- Shadcn components live in `client/src/components/ui/` (copied from old codebase `loveable/` directory)
- Three layouts: `AuthLayout`, `UserLayout`, `GroupAdminLayout`
- Sidebar is role-aware with group switcher for multi-group admins
- Toast notifications via sonner (RTL configured)
- Dark theme with Tailwind CSS variables

## Firebase Collections
`users`, `groups`, `shifts`, `requests`, `userGroupPoints`, `shiftAssignments`, `userCategories`, `templates`

Collection refs defined in `server/src/firebase/db.ts`. Use `convertTimestamps()` helper when reading Firestore docs.

## Environment
Server requires `server/.env` with `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`. See `server/.env.example`.

## Path Aliases
Client uses `@/*` → `src/*` (configured in tsconfig and vite). Server uses standard Node resolution.
