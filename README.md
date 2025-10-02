# Chat System - MEAN Stack Application

A real-time chat application built with MongoDB, Express, Angular, and Node.js, featuring Socket.io for real-time communication and Peer.js for video calling capabilities.

## Features

### User Roles
- **Super Admin**: Can promote users to Group Admin, remove any users, upgrade users to Super Admin, and has all Group Admin functions
- **Group Admin**: Can create groups and channels, remove groups/channels/users they administer, ban users from channels
- **User**: Can create account, join groups (with admin approval), participate in channels, leave groups, delete themselves

### Core Functionality
- Real-time text chat using Socket.io
- Video calling with Peer.js
- User authentication (username/password)
- Group and channel management
- Role-based access control
- Responsive web interface

## Project Structure

```
├── server/                 # Node.js/Express backend
│   ├── data/              # Data storage layer
│   ├── models/            # Data models (User, Group, Channel, Message)
│   ├── routes/            # API routes (auth, users, groups, channels)
│   ├── sockets/           # Socket.io handlers
│   ├── package.json
│   └── server.js          # Main server file
├── client/                # Angular frontend
│   ├── src/
│   │   ├── app/
│   │   │   ├── components/    # Angular components
│   │   │   ├── services/      # Angular services
│   │   │   ├── models/        # TypeScript interfaces
│   │   │   ├── guards/        # Route guards
│   │   │   └── app.routes.ts  # Application routes
│   │   ├── styles.css     # Global styles
│   │   └── index.html     # Main HTML template
│   ├── angular.json       # Angular configuration
│   ├── package.json
│   └── tsconfig.json      # TypeScript configuration
└── README.md
```

## Data Models

### User Model
```typescript
{
  id: number,
  username: string,
  email: string,
  password: string,
  roles: string[],     // ['user', 'group-admin', 'super-admin']
  groups: number[],    // Array of group IDs
  createdAt: Date,
  isActive: boolean
}
```

### Group Model
```typescript
{
  id: number,
  name: string,
  description: string,
  adminId: number,     // Creator admin ID
  admins: number[],    // Array of admin user IDs
  members: number[],   // Array of member user IDs
  channels: number[],  // Array of channel IDs
  createdAt: Date,
  isActive: boolean
}
```

### Channel Model
```typescript
{
  id: number,
  name: string,
  description: string,
  groupId: number,
  adminId: number,
  members: number[],
  bannedUsers: number[],
  messages: Message[],
  createdAt: Date,
  isActive: boolean
}
```

### Message Model
```typescript
{
  id: number,
  channelId: number,
  userId: number,
  username: string,
  content: string,
  type: 'text' | 'image' | 'file' | 'video-call',
  timestamp: Date,
  edited: boolean,
  editedAt?: Date
}
```

## API Routes

### Authentication Routes (`/api/auth`)
- `POST /login` - User login
- `POST /register` - User registration
- `POST /logout` - User logout

### User Routes (`/api/users`)
- `GET /` - Get all users (Super Admin only)
- `GET /:id` - Get user by ID
- `PUT /:id` - Update user
- `DELETE /:id` - Delete user
- `POST /:id/promote` - Promote user role
- `POST /:id/demote` - Demote user role
- `GET /:id/groups` - Get user's groups

### Group Routes (`/api/groups`)
- `GET /` - Get all groups
- `GET /:id` - Get group by ID
- `POST /` - Create new group
- `PUT /:id` - Update group
- `DELETE /:id` - Delete group
- `POST /:id/members` - Add member to group
- `DELETE /:id/members/:userId` - Remove member from group
- `GET /:id/members` - Get group members
- `GET /:id/channels` - Get group channels

### Channel Routes (`/api/channels`)
- `GET /` - Get all channels
- `GET /:id` - Get channel by ID
- `POST /` - Create new channel
- `PUT /:id` - Update channel
- `DELETE /:id` - Delete channel
- `GET /:id/messages` - Get channel messages
- `POST /:id/members` - Add member to channel
- `DELETE /:id/members/:userId` - Remove member from channel
- `POST /:id/ban` - Ban user from channel
- `POST /:id/unban` - Unban user from channel

## Socket Events

### Client to Server
- `authenticate` - Authenticate user with socket
- `join_channel` - Join a specific channel
- `leave_channel` - Leave a channel
- `send_message` - Send message to channel
- `typing_start` - Start typing indicator
- `typing_stop` - Stop typing indicator
- `video_call_offer` - Send video call offer
- `video_call_answer` - Send video call answer
- `ice_candidate` - Send ICE candidate for WebRTC

### Server to Client
- `authenticated` - Confirmation of authentication
- `new_message` - New message received
- `channel_messages` - Channel message history
- `user_typing` - User typing notification
- `user_stopped_typing` - User stopped typing
- `user_joined` - User joined channel
- `user_left` - User left channel
- `video_call_offer` - Incoming video call offer
- `video_call_answer` - Video call answer received
- `ice_candidate` - ICE candidate received
- `error` - Error message

## Installation and Setup

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn
- Angular CLI

### Backend Setup
1. Navigate to the server directory:
   ```bash
   cd server
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the server:
   ```bash
   npm start
   ```
   
   For development with auto-reload:
   ```bash
   npm run dev
   ```

The server will run on `http://localhost:3000`

### Frontend Setup
1. Navigate to the client directory:
   ```bash
   cd client
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Install Angular CLI globally (if not already installed):
   ```bash
   npm install -g @angular/cli
   ```

4. Start the Angular development server:
   ```bash
   ng serve
   ```

The client will run on `http://localhost:4200`

## Default Login
- **Username**: super
- **Password**: 123
- **Role**: Super Admin

## Technologies Used

### Backend
- Node.js
- Express.js
- Socket.io (Real-time communication)
- CORS (Cross-origin requests)
- Body-parser (Request parsing)
- File system (Local data storage)

### Frontend
- Angular 16
- TypeScript
- RxJS (Reactive programming)
- Socket.io-client (Real-time communication)
- PeerJS (WebRTC video calling)
- Reactive Forms (Form handling)
- Angular Router (Navigation)

## Development Notes

### Data Storage
Currently using file-based storage on the server (`server/data/storage.json`) and browser `localStorage` for the authenticated user. This will be replaced with MongoDB in a later phase.

### Authentication
Simple username/password authentication. On login success, the user object is stored in `localStorage` and propagated via `AuthService` (`BehaviorSubject`). Logout always clears client state even if the `/logout` request fails (defensive UX).

### Real-time Features
- Socket.io delivers chat messages in real-time
- Typing indicators and presence (join/leave)
- WebRTC signaling scaffolding exists; PeerJS integration deferred

## Angular Architecture Details

### Components
- `LoginComponent`: login form, saves user to `localStorage` on success
- `RegisterComponent`: registration form
- `DashboardComponent`: lists user groups, create group/channel, join channel, leave group, delete account
- `ChatComponent`: real-time messages, typing indicator (video call UI scaffold)
- `AdminComponent`: manage users (super admin) and groups/channels

### Services
- `AuthService`: auth state management, login/register/logout
- `GroupService`: CRUD groups, membership
- `ChannelService`: CRUD channels, membership/ban
- `SocketService`: Socket.io client, message/typing streams, signaling
- `UsersService`: user management (get/update/delete, promote/demote)

### Guards
- `AuthGuard`: requires authentication for protected routes
- `RoleGuard`: requires roles for admin routes (`group-admin`, `super-admin`)

### Routes
Protected: `dashboard`, `chat/:groupId/:channelId` (auth), `admin` (auth + role)

## Node Server Architecture Details

### Modules/Files
- `server.js`: Express app, routes mount, Socket.io init
- `routes/*`: `auth`, `users`, `groups`, `channels`
- `sockets/socketHandler.js`: socket events (auth, join/leave, messaging, typing, signaling)
- `data/dataStorage.js`: JSON persistence; constructs model instances to preserve methods
- `models/*`: `User`, `Group`, `Channel`, `Message`

### Global State
- In-memory `connectedUsers` map in `socketHandler`

## REST API Summary

See sections above; highlights:
- `POST /api/auth/login|register|logout`
- `/api/users`: GET all/one, PUT update, DELETE, POST `/:id/promote|demote`, GET `/:id/groups`
- `/api/groups`: CRUD, members (add/remove), list members and channels
- `/api/channels`: CRUD, messages, members (add/remove), ban/unban

## Client-Server Interaction Flow

1) Login: client posts credentials → server validates against `dataStorage` → client stores user → guards allow access.
2) Dashboard: client loads groups → filters by membership/adminship → can create group → server persists and returns → UI refreshes.
3) Channels: client loads channels per group → create channel via REST → list refreshes.
4) Chat: client authenticates socket, joins channel → server emits history and relays new messages → UI updates via observable.
5) Admin: super admin fetches users, promote/demote/delete via users API → UI reloads list.
6) Leave Group/Delete Account: client hits respective endpoints → updates local state/navigation.

### Responsive Design
The application is designed to work on both desktop and mobile devices with responsive CSS.

## Git Repository Organization

```
├── main branch (stable releases)
├── develop branch (integration branch)
├── feature/ branches (individual features)
└── hotfix/ branches (critical fixes)
```

### Branching Strategy
- `main`: Production-ready code
- `develop`: Integration branch for features
- `feature/*`: Individual feature development
- `hotfix/*`: Critical bug fixes

### Commit Guidelines
- Frequent commits with descriptive messages
- Separate commits for frontend and backend changes
- Use conventional commit format when possible

## Future Enhancements
- MongoDB integration
- JWT authentication
- File upload support
- Message search functionality
- User profile management
- Group discovery
- Mobile app development
