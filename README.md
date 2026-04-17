# Kanban Board

Real-time collaborative kanban board with live cursors, drag & drop, and multi-user editing.

## Tech Stack

**Backend:** NestJS, Prisma, PostgreSQL, Socket.IO, JWT, bcrypt

**Frontend:** React, TypeScript, Vite, TipTap, Yjs (CRDT), Socket.IO Client, Axios

## Features

- JWT authentication (register, login, refresh tokens)
- Create and manage boards
- Invite users to boards / remove them
- Kanban columns: Pending, In Progress, Completed
- Drag & drop tasks between columns
- Real-time updates via WebSocket (task created/updated/deleted)
- Collaborative task editing with live cursors (Yjs + TipTap)
- Online presence indicators (who's on the board)
- Optimistic locking for concurrent edits
- Kick notification (redirects removed user in real-time)

## Project Structure

```
upwork/
├── kanban_board/        # NestJS backend
│   ├── src/
│   │   ├── auth/        # JWT auth, guards, strategy
│   │   ├── board/       # Board CRUD, WebSocket gateway
│   │   ├── task/        # Task CRUD with optimistic locking
│   │   ├── user/        # User search
│   │   └── prisma/      # Prisma service
│   └── prisma/
│       └── schema.prisma
│
└── kanban_frontend/     # React frontend
    └── src/
        ├── api/         # Axios instance, Socket.IO client
        ├── components/  # Header, PrivateRoute, CustomSelect, CollabEditor
        └── pages/       # LoginPage, BoardsPage, BoardPage
```

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL (or use Prisma local dev server)

### Backend

```bash
cd kanban_board
npm install

# Start local Prisma Postgres
npx prisma dev

# Push schema to database
npx prisma db push

# Generate Prisma client
npx prisma generate

# Start dev server
npm run start:dev
```

Backend runs on `http://localhost:3000`

### Frontend

```bash
cd kanban_frontend
npm install
npm run dev
```

Frontend runs on `http://localhost:5173`

### Environment Variables

Create `.env` in `kanban_board/`:

```
JWT_SECRET="your-secret-key"
DATABASE_URL="prisma+postgres://localhost:51213/..."
DIRECT_DATABASE_URL="postgres://postgres:postgres@localhost:51214/template1?sslmode=disable"
```

## API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /auth/register | Register new user |
| POST | /auth/login | Login |
| POST | /auth/refresh | Refresh tokens |
| POST | /auth/logout | Logout |

### Boards
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /board | List user's boards |
| POST | /board | Create board |
| GET | /board/:id | Get board with tasks |
| PATCH | /board/:id | Update board |
| DELETE | /board/:id | Delete board |
| POST | /board/:id/invite | Invite user to board |
| DELETE | /board/:id/kick/:userId | Remove user from board |

### Tasks (nested under board)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /board/:boardId/task | Create task |
| GET | /board/:boardId/task | List tasks for board |
| PATCH | /board/:boardId/task/:id | Update task (with optimistic locking) |
| DELETE | /board/:boardId/task/:id | Delete task |

### Users
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /user/search?q=... | Search users by email/name |

## WebSocket Events

Gateway namespace: `/board`

| Event | Direction | Description |
|-------|-----------|-------------|
| joinBoard / leaveBoard | Client -> Server | Board presence room |
| joinTask / leaveTask | Client -> Server | Task editing room |
| taskCreated / taskUpdated / taskDeleted | Server -> Client | Real-time board updates |
| presenceUpdate | Server -> Client | Online users on board |
| boardInvited / boardKicked | Server -> Client | Invitation notifications |
| yjsUpdate | Bidirectional | Yjs document sync |
| yjsAwareness | Bidirectional | Cursor positions |
| yjsSyncRequest / yjsSyncResponse | Bidirectional | Initial state sync |

## Database Schema

- **User** - id, email, password, name
- **Board** - id, name, owner (User), subscribedUsers (User[])
- **Task** - id, title, description, priority (LOW/MEDIUM/HIGH), status (PENDING/IN_PROGRESS/COMPLETED), board
- **RefreshToken** - id, token, user, expiresAt
