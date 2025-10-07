## Chat System - Full-Stack

This README documents the repository organization, data structures, client-server responsibilities, REST API, Angular architecture, and the runtime interactions between the Angular client and the Node/Express + MongoDB server with Socket.io realtime.

### 1) Git repository organization and usage

- Top-level folders:
  - `client/`: Angular application (components, services, models, guards, routing)
  - `server/`: Express REST API, Socket.io, MongoDB schema and storage
- Working model during development:
  - Backend and frontend evolve in parallel in their respective folders
  - API contracts stabilized first (under `server/routes/*`); client services consume them
  - Realtime events consolidated in `server/sockets/socketHandler.js` and mirrored in `client/src/app/services/socket.service.ts`
  - Static assets (uploaded avatars and message media) are exposed from `server/uploads/*` under `/uploads/*`

Branching (suggested when collaborating):
- `master/main`: stable code
- `feature/<name>`: feature work, merged via PRs
- Small, focused commits: server vs client changes separated where feasible

Project structure:
```
├── client/
│   ├── angular.json
│   ├── cypress/
│   ├── package.json
│   └── src/
│       ├── app/
│       │   ├── components/
│       │   │   ├── admin/
│       │   │   ├── auth/
│       │   │   ├── chat/
│       │   │   └── dashboard/
│       │   ├── guards/
│       │   ├── models/
│       │   ├── services/
│       │   └── app.routes.ts
│       ├── index.html
│       └── main.ts
├── server/
│   ├── config/
│   │   ├── database.js
│   │   └── schema.js
│   ├── data/
│   │   └── mongoStorage.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── users.js
│   │   ├── groups.js
│   │   └── channels.js
│   ├── sockets/
│   │   └── socketHandler.js
│   ├── uploads/
│   └── server.js
├── README.md
└── .gitignore
```

### 2) Data structures (client and server)

- User (`client/src/app/models/user.model.ts` + persisted in Mongo):

```ts
id: number
username: string
email: string
roles: string[]
groups: number[]
avatarUrl?: string
createdAt: Date
  isActive: boolean
```

- Group (`client/src/app/models/group.model.ts` + persisted in Mongo):

```ts
id: number
name: string
description: string
adminId: number
admins: number[]
members: number[]
channels: number[]
createdAt: Date
isActive: boolean
```

- Channel (`client/src/app/models/channel.model.ts` + persisted in Mongo):

```ts
id: number
name: string
description: string
groupId: number
adminId: number
members: number[]
bannedUsers: number[]
messages: number[]
createdAt: Date
isActive: boolean
```

- Message (`client/src/app/models/channel.model.ts` + persisted in Mongo):

```ts
id: number
channelId: number
userId: number
username: string
content: string
type: 'text' | 'image' | 'video' | 'file' | 'video-call' | 'system'
timestamp: Date
edited: boolean
editedAt?: Date
```

Server persistence helpers: `server/data/mongoStorage.js` with `getNextId` counters and CRUD for users, groups, channels, messages. Indexes and seeds in `server/config/schema.js`.

### 3) Client vs Server responsibilities

- Server (Express + MongoDB):
  - Exposes REST API under `/api/*` for auth, users, groups, channels
  - Validates permissions (e.g., group/channel creation by admins), manages relationships
  - Handles file uploads with Multer: avatars and message media under `server/uploads/*`
  - Emits realtime events with Socket.io; persists messages/images
- Client (Angular):
  - Auth state in `AuthService` using `localStorage`; guards protect routes
  - UI composition, data fetching via `UsersService`, `GroupService`, `ChannelService`
  - Realtime UX via `SocketService` (join channel, receive `new_message`, typing indicators, basic video-call signaling)

### 4) REST routes: paths, params, returns, purpose

Auth (`/api/auth`):
- `POST /login` body `{ username, password }` → `{ success, user, message }`
- `POST /register` body `{ username, email, password }` → `{ success, user, message }`
- `POST /logout` → `{ success, message }`

Users (`/api/users`):
- `GET /` → `User[]` (password omitted)
- `GET /:id` → `User` (password omitted)
- `PUT /:id` body `Partial<User>` (server strips `id`, `password`) → `{ success, user }`
- `DELETE /:id` → `{ success, message }` (cascades membership clean-up; protects id 1)
- `POST /:id/avatar` form-data `avatar` → `{ success, user }` with `avatarUrl`
- `POST /:id/promote` body `{ role: 'group-admin'|'super-admin' }` → `{ success, user }`
- `POST /:id/demote` body `{ role: 'group-admin'|'super-admin' }` → `{ success, user }`
- `GET /:id/groups` → `Group[]` memberships by id

Groups (`/api/groups`):
- `GET /` → `Group[]`
- `GET /:id` → `Group`
- `POST /` body `{ name, description?, adminId }` (admin must have role) → `{ success, group }`
- `PUT /:id` body `Partial<Group>` (server strips `id`, `adminId`) → `{ success, group }`
- `DELETE /:id` → `{ success, message }`
- `POST /:id/members` body `{ userId }` or `{ username }` → `{ success, message, user? }`
- `POST /:id/join` body `{ userId }` → super-admin joins immediately, otherwise pending request → `{ success, message }`
- `POST /:id/join/cancel` body `{ userId }` → `{ success, message }`
- `GET /:id/requests` → `User[]` pending join requests (no passwords)
- `POST /:id/requests/:userId/approve` → `{ success, message }`
- `POST /:id/requests/:userId/reject` → `{ success, message }`
- `DELETE /:id/members/:userId` → `{ success, message }`
- `GET /:id/members` → `User[]`
- `GET /:id/channels` → `Channel[]`

Channels (`/api/channels`):
- `GET /` → `Channel[]`
- `GET /:id` → `Channel`
- `POST /` body `{ name, description?, groupId, adminId }` (admin must be super or group admin of owning group) → `{ success, channel }`
- `PUT /:id` body `Partial<Channel>` (server strips `id`, `adminId`, `groupId`) → `{ success, channel }`
- `DELETE /:id` → `{ success, message }` (also updates owning group `channels`)
- `GET /:id/messages` → `Message[]`
- `POST /:id/messages/image` form-data `image`; body includes `userId`, `username` → `{ success, message }`
- `POST /:id/messages/video` form-data `video`; body includes `userId`, `username` → `{ success, message }`
- `POST /:id/members` body `{ userId }` (must be member/admin of group) → `{ success, message }`
- `DELETE /:id/members/:userId` → `{ success, message }`
- `POST /:id/ban` body `{ userId }` → `{ success, message }`
- `POST /:id/unban` body `{ userId }` → `{ success, message }`

Static files:
- Served under `/uploads/*` for avatars and message media

### 5) Angular architecture

- Components: `auth/login`, `auth/register`, `dashboard`, `chat`, `admin`
- Services: `auth.service.ts`, `users.service.ts`, `group.service.ts`, `channel.service.ts`, `socket.service.ts`
- Models: `user.model.ts`, `group.model.ts`, `channel.model.ts`
- Guards: `auth.guard.ts`, `role.guard.ts`
- Routes: defined in `app.routes.ts`: `login`, `register`, `dashboard` (auth), `chat/:groupId/:channelId` (auth), `admin` (auth + role)

### 6) Client–Server interaction details

- Login flow:
  - Client calls `POST /api/auth/login`; on success, stores user in `localStorage` via `AuthService` and emits `authenticate` over Socket.io on connect.
  - Guards (`AuthGuard`, `RoleGuard`) read refreshed user state to allow/deny access.
- Dashboard:
  - Client fetches `GET /api/groups` and `GET /api/users/:id/groups` as needed; create group via `POST /api/groups` then refresh lists; UI reflects changes immediately.
- Channels + Chat:
  - Client loads channels per group `GET /api/groups/:id/channels`.
  - Join a channel via Socket.io `join_channel` (server validates membership); server emits `channel_messages` followed by realtime `new_message` events.
  - Send text via Socket.io `send_message`; upload images/videos via REST endpoints, which also emit `new_message` server-side.
- Administration:
  - Admin views users `GET /api/users`, promotes/demotes via `POST /api/users/:id/(promote|demote)`, deletes via `DELETE /api/users/:id`; client updates lists accordingly.
- File/media lifecycle:
  - Avatars: `POST /api/users/:id/avatar` saves to `/uploads/avatars/*` and updates `avatarUrl` on user.
  - Images/Videos: `POST /api/channels/:id/messages/(image|video)` saves to `/uploads/messages/*`, persists message record, emits `new_message` to channel room.

### Setup & run

- Server:
  - `cd server && npm install && npm start` (listens on `http://localhost:3000`)
- Client:
  - `cd client && npm install && ng serve` (serves at `http://localhost:4200`)
- Default account: username `super`, password `123` (Super Admin)

Notes: Passwords are stored in plain text for coursework only; do not use in production. CORS is enabled for the local Angular client; uploads are served from `/uploads/*`.

### Getting started (from clone to running client and server)

1. Prerequisites
   - Install Node.js (LTS recommended)
   - Install Angular CLI globally: `npm install -g @angular/cli`
   - Install and start MongoDB locally (default URL `mongodb://localhost:27017`)
     - Ensure the MongoDB service is running before starting the server

2. Clone the repository
   - `git clone <your-repo-url>.git`
   - `cd SoftwareFrameworkAssignment1`

3. Backend setup (terminal A)
   - `cd server`
   - `npm install`
   - Optional: set environment variables if needed
     - `MONGODB_URL` (default: `mongodb://localhost:27017`)
     - `MONGODB_DB` (default: `chat_system`)
   - Start the server: `npm start`
   - Expected: Console shows MongoDB connection and "Server running on port 3000"

4. Frontend setup (terminal B)
   - `cd client`
   - `npm install`
   - Start the dev server: `ng serve`
   - Open `http://localhost:4200`

5. Log in with the seeded Super Admin
   - Username: `super`
   - Password: `123`

Troubleshooting
- If the server fails to start, verify MongoDB is running and reachable at `MONGODB_URL`
- If uploads fail, ensure the `server/uploads/avatars` and `server/uploads/messages` folders are writable (they are auto-created on startup)
- If CORS errors appear, confirm the client is served from `http://localhost:4200` and the server from `http://localhost:3000`

### Testing

- Server tests (Jest):
  - One-time setup: `cd server && npm install`
  - Run all tests: `npm test`
  - Run in watch mode: `npm run test:watch` (if defined) or `npx jest --watch`
  - Run a single file: `npx jest tests/auth.test.js`
  - Environment: the server automatically switches to a separate database when `NODE_ENV=test`.
    - `server/server.js` sets `process.env.MONGODB_DB = 'chat_system_test'` by default in test mode.
    - You can also override by exporting `MONGODB_URL` / `MONGODB_DB` before running tests.

- Client E2E tests (Cypress):
  - One-time setup: `cd client && npm install`
  - Make sure the backend and frontend are running:
    - Backend: `cd server && npm start` (http://localhost:3000)
    - Frontend: `cd client && ng serve` (http://localhost:4200)
  - Open Cypress runner: `cd client && npx cypress open`
  - Headless run: `cd client && npx cypress run`
  - Tests live under `client/cypress/e2e/*.cy.ts`. Base URL is configured in `client/cypress.config.ts`.
