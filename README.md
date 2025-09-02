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
Currently using local file-based storage (`server/data/storage.json`) as specified in the assignment requirements. This will be replaced with MongoDB in future phases.

### Authentication
Simple username/password authentication as specified. Production applications should use more secure methods like JWT tokens, password hashing, etc.

### Real-time Features
- All chat messages are delivered in real-time using Socket.io
- Typing indicators show when users are typing
- User presence (join/leave) notifications
- Video calling using WebRTC through PeerJS

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
