# ShiftHappens — New Architecture

**Stack:** React 18 + Vite + Express.js + Firebase Admin SDK
**Replaces:** Next.js 15 App Router

---

## Quick Start (Development)

### Prerequisites
- Node.js 20+
- Firebase project with Firestore
- Firebase Admin SDK service account key

### 1. Server Setup

```bash
cd server
npm install
cp .env.example .env
# → Edit .env with your Firebase credentials (see below)
npm run dev
# Server runs on http://localhost:4000
```

### 2. Client Setup

```bash
cd client
npm install
npm run dev
# App runs on http://localhost:5173
# API calls to /api/* are proxied to :4000 automatically
```

---

## Firebase Admin SDK Credentials

1. Open [Firebase Console](https://console.firebase.google.com)
2. Go to: **Project Settings → Service accounts → Generate new private key**
3. Download the JSON file
4. Fill `server/.env` from the downloaded JSON:

```env
FIREBASE_PROJECT_ID=       # "project_id" from JSON
FIREBASE_CLIENT_EMAIL=     # "client_email" from JSON
FIREBASE_PRIVATE_KEY=      # "private_key" from JSON (with quotes, keep the \n)
```

---

## Project Structure

```
new/
├── server/                    Express.js API + Firebase Admin
│   └── src/
│       ├── index.ts           Entry point (port 4000)
│       ├── app.ts             Express setup + route mounting
│       ├── types/             Domain models + enums
│       ├── firebase/
│       │   ├── admin.ts       Firebase Admin SDK init
│       │   └── db.ts          Firestore collection refs
│       ├── middleware/
│       │   ├── authenticate   Reads httpOnly cookie → req.user
│       │   └── requireRole    requireGlobalAdmin, requireGroupAdmin
│       ├── services/
│       │   ├── authService    login, register, session cookies
│       │   ├── userService    users, groups, points, shifts
│       │   ├── requestService CRUD for user requests
│       │   └── shiftService   shift CRUD + assignment algorithm
│       └── routes/
│           ├── auth           POST /api/auth/login|register|logout
│           ├── user           GET/POST/DELETE /api/user/*
│           ├── groupAdmin     /api/group-admin/:groupId/*
│           └── globalAdmin    /api/global-admin/*
│
└── client/                    React 18 + Vite SPA
    └── src/
        ├── main.tsx           Entry point
        ├── App.tsx            QueryClient + Router + AuthProvider
        ├── types/             Domain types (no password)
        ├── api/
        │   ├── client.ts      Base fetch (date revival, error handling)
        │   ├── auth.ts        login, logout, register, me
        │   ├── user.ts        all user endpoints
        │   └── groupAdmin.ts  all group-admin endpoints
        ├── contexts/
        │   └── AuthContext    useState<SessionUser> + signOut
        ├── router/
        │   ├── index.tsx      All routes defined once
        │   └── ProtectedRoute Auth + role guard (replaces middleware.ts)
        ├── layouts/           AuthLayout, UserLayout, GroupAdminLayout
        ├── components/
        │   └── sidebar/       Sidebar + nav components
        ├── hooks/
        │   ├── user/          useShifts, usePoints, useRequests, useGroups
        │   └── groupAdmin/    useGroupShifts, useAssignment, useGroupUsers
        └── pages/
            ├── auth/          LoginPage, RegisterPage
            ├── user/          Dashboard, Calendar, Points, Requests, ShiftHistory
            └── group-admin/   Dashboard, CreateShift, UsersManagement
```

---

## API Reference

### Auth
| Method | URL | Description |
|--------|-----|-------------|
| POST | /api/auth/login | Login → sets httpOnly cookie |
| POST | /api/auth/register | Register → sets httpOnly cookie |
| POST | /api/auth/logout | Clears cookie |
| GET | /api/auth/me | Returns current session user |

### User
| Method | URL | Description |
|--------|-----|-------------|
| GET | /api/user/shifts/upcoming | Upcoming shifts |
| GET | /api/user/shifts | All shifts |
| GET | /api/user/groups | User's groups |
| GET | /api/user/points | Points per group |
| GET | /api/user/points/leaderboard/:groupId | Group leaderboard |
| GET | /api/user/rank/:groupId | User rank in group |
| GET | /api/user/stats/:groupId | Weekly/monthly stats |
| GET | /api/user/requests | User's requests |
| POST | /api/user/requests | Create request |
| DELETE | /api/user/requests/:id | Delete request |

### Group Admin (/api/group-admin/:groupId/...)
| Method | URL | Description |
|--------|-----|-------------|
| GET | /shifts | All group shifts |
| POST | /shifts | Create shift |
| PATCH | /shifts/:id | Update shift |
| DELETE | /shifts/:id | Delete shift |
| POST | /assignment/candidates | Get ranked candidates |
| POST | /assignment/auto | Auto-assign users |
| POST | /assignment/replace | Replace one user |
| GET | /users | Group members |
| PATCH | /users/:id/role | Make/remove admin |
| PATCH | /users/:id/categories | Update categories |
| POST | /users/add | Add users to group |
| GET | /leaderboard | Points leaderboard |
| GET | /categories | User categories |

---

## Production Build

```bash
# 1. Build the React SPA
cd client && npm run build   # outputs client/dist/

# 2. Build the Express server
cd server && npm run build   # outputs server/dist/

# 3. Set production env
export NODE_ENV=production

# 4. Start — serves API + React SPA on one port
node server/dist/index.js
# Open http://your-server:4000
```

## Deployment Options

| Platform | Command |
|----------|---------|
| Railway | `railway up` (add env vars in dashboard) |
| Fly.io | `fly deploy` with Dockerfile |
| DigitalOcean App Platform | Point to repo, set env vars |
| VPS | `npm run build` + `pm2 start server/dist/index.js` |

---

## Architecture Decisions

| Decision | Why |
|----------|-----|
| Firebase Admin SDK (server-only) | Keys never reach browser — eliminates client-side Firestore security risk |
| httpOnly cookie session | Same security model as before, no JWT complexity |
| REST endpoints | Standard HTTP — testable with curl, no custom action dispatch |
| Single middleware for auth | `authenticate.ts` replaces duplicated auth checks in every route |
| Single `requireGroupAdmin` | Factory guard replaces copy-pasted permission checks |
| Vite proxy in dev | Zero CORS config — `/api/*` proxied to Express automatically |
| React Router v6 | File-based routing replaced by one `router/index.tsx` |
| No server components | Zero SSR complexity — standard fetch-on-mount |
| React Query (kept) | Already used, excellent caching, hooks unchanged |
