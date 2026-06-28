# CollabDocs — Local-First Collaborative Document Editor

Enterprise-grade, local-first collaborative rich text editor built with Next.js 16, React 19, TypeScript, and MongoDB.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client (Browser)                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────────────┐ │
│  │ TipTap   │  │ Dexie.js │  │ Zustand  │  │ Socket.io Client│ │
│  │ Editor   │  │ IndexedDB│  │ Store    │  │ (Realtime)      │ │
│  └────┬─────┘  └────┬─────┘  └──────────┘  └────────┬────────┘ │
│       │             │                                 │          │
│       │      ┌──────▼──────┐                          │          │
│       │      │ Sync Engine │◄─────────────────────────┘          │
│       │      │ (Background)│                                     │
│       └──────┤  Pending /  │                                     │
│              │  Failed /   │                                     │
│              │  Retry Queue│                                     │
│              └──────┬──────┘                                     │
└─────────────────────┼───────────────────────────────────────────┘
                      │ HTTP / WebSocket
┌─────────────────────▼───────────────────────────────────────────┐
│                     Next.js 16 App Router                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────────────┐ │
│  │ REST API │  │ Auth.js  │  │ Socket.io│  │ BullMQ Worker   │ │
│  │ Routes   │  │ JWT      │  │ Server   │  │ (Redis Queue)   │ │
│  └────┬─────┘  └────┬─────┘  └──────────┘  └────────┬────────┘ │
│       │             │                                 │          │
│  ┌────▼─────────────▼─────────────────────────────────▼────────┐ │
│  │              Repository Layer (Domain Services)              │ │
│  └──────────────────────────┬──────────────────────────────────┘ │
└─────────────────────────────┼───────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              │               │               │
        ┌─────▼─────┐  ┌─────▼─────┐  ┌─────▼─────┐
        │  MongoDB  │  │   Redis   │  │  OpenAI   │
        │           │  │  (BullMQ) │  │    API    │
        └───────────┘  └───────────┘  └───────────┘
```

## Entity Relationship Diagram

```
┌──────────┐       ┌──────────┐       ┌──────────────┐
│   User   │──1:N──│ Document │──1:N──│   Operation  │
│          │       │          │       │              │
│ - email  │       │ - title  │       │ - operationId│
│ - role   │       │ - content│       │ - vectorClock│
│ - password│      │ - version│       │ - payload    │
└────┬─────┘       └────┬─────┘       └──────────────┘
     │                  │
     │            ┌─────┴─────┐
     │            │           │
     │       ┌────▼────┐ ┌────▼──────────┐
     │       │ Comment │ │ DocumentVersion│
     │       └─────────┘ └───────────────┘
     │
     ├──1:N── Share (documentId, userId, role)
     ├──1:N── Session (refreshToken)
     ├──1:N── Notification
     └──1:N── SyncQueue
```

## Features

### Authentication
- Register, Login, Forgot Password, Email Verification
- JWT access tokens (15min) + refresh tokens (7 days)
- Role-based access: Owner, Editor, Viewer
- Protected routes via middleware

### Local-First Architecture
- All edits saved to IndexedDB via Dexie.js first
- UI never waits for API responses
- Background sync engine with Pending/Completed/Failed/Retry queues
- Deterministic conflict resolution using vector clocks + CRDT merge

### Rich Text Editor (TipTap)
- Headings, Bold, Italic, Underline, Highlight, Strikethrough
- Tables, Lists, Task Lists, Code Blocks
- Image Upload, Links, Blockquotes
- Keyboard shortcuts (Ctrl+B/I/U/S)
- Autosave with debounce
- Character/word count

### Realtime Collaboration (Socket.io)
- Live cursors, typing indicators, presence
- Realtime content sync, live comments
- Online users display

### Version History
- Create snapshots, restore, timeline view, compare, rollback

### AI Features (OpenAI)
- Summarize, Rewrite, Grammar Fix, Translate
- Generate Title/Tags, Explain Selection
- Continue Writing, Meeting Notes, Action Items
- Chat with Document

### Dashboard
- Recent, Shared, Offline, Favourites, Deleted documents
- Search, dark mode, responsive design

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS |
| State | Zustand, TanStack Query |
| Editor | TipTap |
| Local DB | Dexie.js (IndexedDB) |
| Backend | Next.js Route Handlers, Server Actions |
| Database | MongoDB + Mongoose |
| Queue | Redis + BullMQ |
| Realtime | Socket.io |
| Auth | NextAuth.js + JWT |
| AI | OpenAI SDK |
| Testing | Vitest, Playwright |
| Deploy | Docker, GitHub Actions, Vercel |

## Project Structure

```
src/
├── app/                    # Next.js App Router pages & API routes
│   ├── (auth)/             # Login, Register, Forgot Password
│   ├── (app)/              # Dashboard, Editor (protected)
│   └── api/                # REST API endpoints
├── components/             # Shared UI components
│   ├── ui/                 # Shadcn-style primitives
│   ├── layout/             # App shell, navigation
│   └── providers/          # Context providers
├── features/               # Feature-first modules
│   ├── auth/               # Authentication forms
│   ├── dashboard/          # Dashboard components
│   └── editor/             # Editor, AI, Comments, Versions
├── hooks/                  # Custom React hooks
├── lib/                    # Utilities, auth, API helpers
├── services/               # Business logic & repositories
├── store/                  # Zustand stores
├── schemas/                # Zod validation schemas
├── types/                  # TypeScript type definitions
├── db/                     # MongoDB connection & models
├── workers/                # BullMQ background workers
├── config/                 # Environment configuration
└── middleware.ts           # Auth & security middleware
```

## Setup

### Prerequisites
- Node.js 20+
- MongoDB 7+
- Redis 7+
- OpenAI API key (optional, for AI features)

### Installation

```bash
# Clone and install
git clone <repo-url>
cd task-colaborating-ai
npm install

# Configure environment
cp .env.example .env.local
# Edit .env.local with your values

# Start MongoDB and Redis (via Docker)
docker compose up mongo redis -d

# Run development server
npm run dev
```

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `MONGODB_URI` | MongoDB connection string | Yes |
| `JWT_SECRET` | JWT signing secret (min 32 chars) | Yes |
| `NEXTAUTH_SECRET` | NextAuth secret (min 32 chars) | Yes |
| `NEXTAUTH_URL` | App URL for auth callbacks | Yes |
| `OPENAI_API_KEY` | OpenAI API key for AI features | No |
| `REDIS_URL` | Redis connection for BullMQ | Yes |
| `NEXT_PUBLIC_SOCKET_URL` | Socket.io server URL | Yes |
| `NEXT_PUBLIC_APP_URL` | Public app URL | Yes |

## Docker Deployment

```bash
# Full stack
docker compose up -d

# App only (external MongoDB/Redis)
docker build -t collabdocs .
docker run -p 3000:3000 --env-file .env.local collabdocs
```

## Scripts

```bash
npm run dev          # Development server
npm run build        # Production build
npm run start        # Production server
npm run lint         # ESLint
npm run test         # Vitest unit tests
npm run test:e2e     # Playwright E2E tests
npm run format       # Prettier
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/register` | Register user |
| POST | `/api/login` | Login |
| POST | `/api/forgot-password` | Request password reset |
| POST | `/api/reset-password` | Reset password |
| GET | `/api/verify-email` | Verify email |
| POST | `/api/refresh-token` | Refresh JWT |
| GET/POST | `/api/documents` | List/create documents |
| GET/PATCH/DELETE | `/api/documents/:id` | Document CRUD |
| POST | `/api/documents/:id/share` | Share document |
| GET/POST | `/api/documents/:id/comments` | Comments |
| GET/POST | `/api/documents/:id/versions` | Version history |
| POST | `/api/sync` | Sync operations |
| POST | `/api/ai` | AI features |
| GET | `/api/notifications` | Notifications |

## Security

- Rate limiting (100 req/min per IP)
- CSRF protection via SameSite cookies
- JWT + refresh token rotation
- Input sanitization (DOMPurify + Zod)
- MongoDB injection protection (Mongoose)
- XSS protection headers
- Role-based access control

## Future Improvements

- [ ] End-to-end encryption for documents
- [ ] Yjs CRDT for character-level collaboration
- [ ] Mobile native apps (React Native)
- [ ] Plugin system for custom editor extensions
- [ ] Analytics dashboard with usage metrics
- [ ] Document templates library
- [ ] SAML/SSO enterprise authentication
- [ ] Webhook integrations (Slack, Teams)
- [ ] PDF/DOCX export
- [ ] Figma-style multiplayer cursors with Yjs

## License

MIT
