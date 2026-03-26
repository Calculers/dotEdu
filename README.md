# CampusConnect

A college-centered social platform where verified students post achievements, events, feedback, and reviews. Everyone can browse; only verified members can publish. Each college operates as an isolated community (similar to subreddits), with high-engagement posts surfacing to a global discover feed.

---

## Table of Contents

1. [Product Overview](#product-overview)
2. [System Architecture](#system-architecture)
3. [Service Breakdown](#service-breakdown)
4. [Database Schema (High-Level)](#database-schema-high-level)
5. [Verification Pipeline](#verification-pipeline)
6. [Feed System](#feed-system)
7. [Content Moderation](#content-moderation)
8. [Notification System](#notification-system)
9. [Multi-Tenancy Model](#multi-tenancy-model)
10. [Auth Flow](#auth-flow)
11. [API Design](#api-design)
12. [Infrastructure and Deployment](#infrastructure-and-deployment)
13. [Tech Stack](#tech-stack)
14. [MVP Roadmap](#mvp-roadmap)
15. [Directory Structure](#directory-structure)

---

## Product Overview

### Problem

Students lack a trustworthy, centralized platform to share college-specific content. Prospective students and parents have no reliable way to evaluate campus culture from real, verified voices.

### Solution

CampusConnect provides a verified social feed per college. Students prove their affiliation through ID verification and email domain confirmation. Posts live within college-scoped feeds, and high-engagement content bubbles up to a global discover feed visible to everyone.

### Key Personas

| Persona | Can View | Can Post | Special Abilities |
|---|---|---|---|
| Verified Student | All public feeds | Own college feed | Create posts, comment, like, RSVP events |
| Prospective Student / Parent | All public feeds | No | Follow colleges, browse, search |
| Moderator | All feeds + reports queue | Own college feed | Hide/remove posts, warn/ban users |
| Platform Admin (AI-assisted) | Everything | N/A | Verify students, manage colleges, system config |

---

## System Architecture

```
                                    +------------------+
                                    |   Mobile Clients |
                                    | (Kotlin / Swift) |
                                    +--------+---------+
                                             |
                                    +--------+---------+
                                    |   Web Client     |
                                    |   (Next.js)      |
                                    +--------+---------+
                                             |
                                             | HTTPS / WSS
                                             v
                                    +------------------+
                                    |   API Gateway /  |
                                    |   Load Balancer  |
                                    +--------+---------+
                                             |
                    +------------------------+------------------------+
                    |                        |                        |
           +--------v-------+     +----------v--------+    +---------v--------+
           |  Auth Service  |     |   Core API        |    |  Media Service   |
           |  (JWT + OTP)   |     |   (Node.js / TS)  |    |  (Upload/Process)|
           +--------+-------+     +----------+--------+    +---------+--------+
                    |                        |                        |
                    |              +---------+---------+              |
                    |              |                   |              |
                    |     +--------v------+   +--------v------+      |
                    |     | Feed Service  |   | Verification  |      |
                    |     | (Ranking +    |   | Service       |      |
                    |     |  Generation)  |   | (OCR + AI)    |      |
                    |     +--------+------+   +--------+------+      |
                    |              |                   |              |
         +----------v--------------v-------------------v--------------v----+
         |                         Message Queue (BullMQ / Redis)          |
         +----------+------------------+------------------+----------------+
                    |                  |                  |
           +--------v------+  +--------v------+  +--------v-------+
           | Notification  |  | Moderation    |  | Background     |
           | Worker (FCM)  |  | Worker (AI)   |  | Workers        |
           +--------+------+  +--------+------+  +--------+-------+
                    |                  |                  |
         +----------v------------------v------------------v----------------+
         |                        Supabase (PostgreSQL)                    |
         +----------+------------------+-----------------------------------+
                    |                  |
           +--------v------+  +--------v------+
           | Cloudinary    |  | Redis         |
           | (Media CDN)   |  | (Cache +      |
           +---------------+  |  Sessions)    |
                              +---------------+
```

### Data Flow Summary

1. Client sends request through API Gateway.
2. API Gateway routes to the appropriate service.
3. Synchronous operations (read feed, get profile) return directly.
4. Asynchronous operations (verification, moderation, notifications) are dispatched to the message queue.
5. Background workers consume queue jobs and write results back to the database.
6. Feed service reads from PostgreSQL + Redis cache, applies ranking, and returns paginated results.

---

## Service Breakdown

### Auth Service

- Handles phone OTP login via Firebase Authentication (free tier).
- Issues JWT access tokens (short-lived, 15 min) and refresh tokens (long-lived, 30 days).
- Stores refresh tokens in PostgreSQL with device fingerprint for revocation.
- Rate-limits OTP requests per phone number (5 per hour).

### Core API

- RESTful API built with Node.js + TypeScript.
- Handles CRUD for posts, comments, likes, follows, profiles, colleges.
- Validates requests with Zod schemas.
- Enforces authorization: only verified students can create posts within their college scope.

### Media Service

- Accepts image uploads (max 10MB), generates thumbnails (320px, 640px, 1080px).
- Uploads to Cloudinary (free tier: 25GB storage, 25GB bandwidth/month).
- Returns CDN URLs stored in the posts table.
- Future: short video support with transcoding via background worker.

### Verification Service

- Processes college ID card images using OCR (Google Vision API or Tesseract).
- Extracts: student name, college name, student ID number, expiry date.
- Cross-references extracted college name against the colleges table.
- Sends email verification link to the student's .edu email address.
- Verification status: `pending` -> `email_verified` -> `id_verified` -> `fully_verified`.
- Optional: selfie-to-ID photo match using a face comparison model.

### Feed Service

- Two-stage pipeline: candidate generation + ranking (detailed below).
- Serves paginated feeds: college feed, personal feed, discover feed.
- Caches hot feeds in Redis with 60-second TTL.

### Notification Worker

- Consumes notification jobs from BullMQ.
- Sends push notifications via Firebase Cloud Messaging (FCM).
- Notification types: like, comment, follow, verification status, moderation action.
- Batches notifications to avoid spam (max 1 notification per event type per 5 min).

### Moderation Worker

- Scans new posts for policy violations using AI content classification.
- Checks for: nudity/sexual content, extreme violence, spam, off-topic content.
- Auto-flags posts exceeding confidence thresholds (>0.85 for removal, >0.6 for review queue).
- Human moderators review flagged posts through the moderation dashboard.

---

## Database Schema (High-Level)

```
users
  id              UUID PK
  phone           VARCHAR UNIQUE
  display_name    VARCHAR
  avatar_url      VARCHAR
  bio             TEXT
  verification    ENUM(unverified, email_verified, id_verified, fully_verified)
  college_id      UUID FK -> colleges.id (nullable)
  created_at      TIMESTAMPTZ
  updated_at      TIMESTAMPTZ

colleges
  id              UUID PK
  name            VARCHAR UNIQUE
  slug            VARCHAR UNIQUE
  city            VARCHAR
  state           VARCHAR
  email_domain    VARCHAR (e.g., "harvard.edu")
  logo_url        VARCHAR
  description     TEXT
  is_active       BOOLEAN DEFAULT true
  created_at      TIMESTAMPTZ

posts
  id              UUID PK
  author_id       UUID FK -> users.id
  college_id      UUID FK -> colleges.id
  content         TEXT
  media_urls      JSONB (array of CDN URLs)
  post_type       ENUM(achievement, event, feedback, review, general)
  visibility      ENUM(college, public)
  like_count      INT DEFAULT 0
  comment_count   INT DEFAULT 0
  share_count     INT DEFAULT 0
  is_flagged      BOOLEAN DEFAULT false
  is_removed      BOOLEAN DEFAULT false
  created_at      TIMESTAMPTZ

comments
  id              UUID PK
  post_id         UUID FK -> posts.id
  author_id       UUID FK -> users.id
  content         TEXT
  parent_id       UUID FK -> comments.id (nullable, for nested replies)
  created_at      TIMESTAMPTZ

likes
  user_id         UUID FK -> users.id
  post_id         UUID FK -> posts.id
  created_at      TIMESTAMPTZ
  PK(user_id, post_id)

follows
  follower_id     UUID FK -> users.id
  following_id    UUID FK -> users.id (nullable)
  college_id      UUID FK -> colleges.id (nullable)
  created_at      TIMESTAMPTZ
  CHECK(following_id IS NOT NULL OR college_id IS NOT NULL)

verification_requests
  id              UUID PK
  user_id         UUID FK -> users.id
  college_id      UUID FK -> colleges.id
  id_card_url     VARCHAR
  selfie_url      VARCHAR (nullable)
  student_number  VARCHAR
  email           VARCHAR
  email_verified  BOOLEAN DEFAULT false
  ocr_result      JSONB
  ai_decision     ENUM(pending, approved, rejected, needs_review)
  reviewer_notes  TEXT
  created_at      TIMESTAMPTZ
  resolved_at     TIMESTAMPTZ

reports
  id              UUID PK
  reporter_id     UUID FK -> users.id
  post_id         UUID FK -> posts.id (nullable)
  user_id         UUID FK -> users.id (nullable)
  reason          ENUM(spam, harassment, nudity, violence, misinformation, other)
  description     TEXT
  status          ENUM(pending, reviewed, actioned, dismissed)
  created_at      TIMESTAMPTZ

events
  id              UUID PK
  college_id      UUID FK -> colleges.id
  created_by      UUID FK -> users.id
  title           VARCHAR
  description     TEXT
  location        VARCHAR
  starts_at       TIMESTAMPTZ
  ends_at         TIMESTAMPTZ
  rsvp_count      INT DEFAULT 0
  created_at      TIMESTAMPTZ

notifications
  id              UUID PK
  user_id         UUID FK -> users.id
  type            ENUM(like, comment, follow, verification, moderation, event)
  payload         JSONB
  is_read         BOOLEAN DEFAULT false
  created_at      TIMESTAMPTZ
```

### Key Indexes

- `posts(college_id, created_at DESC)` -- college feed queries
- `posts(created_at DESC) WHERE visibility = 'public'` -- discover feed
- `posts(author_id, created_at DESC)` -- profile feed
- `likes(post_id)` -- like count aggregation
- `comments(post_id, created_at)` -- comment threads
- `follows(follower_id)` -- user's following list
- `notifications(user_id, is_read, created_at DESC)` -- notification inbox

---

## Verification Pipeline

```
User submits:
  1. College email address
  2. College ID card photo
  3. Student number
  4. Selfie (optional)
         |
         v
+------------------+
| Email Verification|
| Send link to      |
| user@college.edu  |
+--------+---------+
         |
         | (email confirmed)
         v
+------------------+
| OCR Processing   |
| Extract text from|
| ID card image    |
+--------+---------+
         |
         v
+------------------+
| AI Validation    |
| Match extracted  |
| data against:    |
| - College name   |
| - Student name   |
| - Expiry date    |
| - Student number |
+--------+---------+
         |
    +----+----+
    |         |
    v         v
 PASS       FAIL / UNCERTAIN
    |         |
    v         v
 Auto-      Route to
 approve    manual review
    |         queue
    v         |
 User gets   Moderator
 "verified"  reviews and
 badge       decides
```

### Verification Rules

1. Email domain must match the college's registered `email_domain`.
2. OCR-extracted college name must fuzzy-match (>85% similarity) the college record.
3. ID card expiry date must be in the future.
4. If selfie is provided, face similarity score must exceed 0.75.
5. If any check fails but others pass, route to manual review instead of auto-reject.
6. Rate limit: 3 verification attempts per user per 24 hours.

---

## Feed System

### Architecture

```
Client requests feed
         |
         v
+-------------------+
| Feed Service      |
| 1. Check Redis    |
|    cache (60s TTL)|
+--------+----------+
         |
    cache miss
         |
         v
+-------------------+
| Candidate Gen     |
| Pull candidates   |
| from PostgreSQL   |
| (max 500 posts)   |
+--------+----------+
         |
         v
+-------------------+
| Scoring / Ranking |
| Apply ranking     |
| formula to each   |
| candidate         |
+--------+----------+
         |
         v
+-------------------+
| Return top-K      |
| (paginated, 20    |
|  per page)        |
+-------------------+
```

### Candidate Generation (Stage 1)

For a verified student viewing their personal feed:

| Source | Priority | Max Candidates |
|---|---|---|
| Own college posts (last 48h) | Highest | 200 |
| Followed students' posts | High | 100 |
| Followed colleges' posts | Medium | 100 |
| Trending posts in same city | Low | 50 |
| Trending posts globally | Lowest | 50 |

For the discover feed (any user):

| Source | Priority | Max Candidates |
|---|---|---|
| Posts with visibility = public | -- | 300 |
| Trending posts (last 7 days) | -- | 200 |

### Ranking Formula (Stage 2)

```
score = w1 * recency + w2 * social + w3 * quality + w4 * personalization

Where:
  recency        = 1 / (1 + hours_since_posted / 24)
  social         = log(1 + likes) * log(1 + comments) + 0.5 * shares
  quality        = ai_engagement_probability (0 to 1, default 0.5 for MVP)
  personalization = cosine_similarity(user_interests, post_tags)

Default weights (MVP):
  w1 = 0.4
  w2 = 0.3
  w3 = 0.15
  w4 = 0.15
```

### Post Promotion to Public Feed

A post starts with `visibility = college`. It gets promoted to `visibility = public` when:

- `like_count >= 20` AND `comment_count >= 5`, OR
- `like_count >= 50`, OR
- A moderator manually promotes it.

Promotion is evaluated by a background worker that runs every 5 minutes scanning recent posts.

---

## Content Moderation

### Automated Pipeline

```
New post created
       |
       v
+------------------+
| Text Analysis    |
| - Profanity      |
| - Hate speech    |
| - Spam detection |
+--------+---------+
       |
       v
+------------------+
| Image Analysis   |
| (if media exists)|
| - NSFW detection |
| - Violence       |
+--------+---------+
       |
       v
+------------------+
| Decision Engine  |
| confidence > 0.85|
|   -> auto-remove |
| confidence > 0.60|
|   -> flag for    |
|      review      |
| confidence < 0.60|
|   -> publish     |
+------------------+
```

### Moderation Actions

| Action | Trigger | Effect |
|---|---|---|
| Auto-remove | AI confidence > 0.85 | Post hidden, author notified |
| Flag for review | AI confidence 0.60-0.85 | Post visible but queued for moderator |
| Manual remove | Moderator action | Post hidden, author notified with reason |
| User ban (temp) | 3 removed posts in 30 days | 7-day posting suspension |
| User ban (perm) | Repeated violations | Account restricted to read-only |

### Content Policy (Enforced by AI + Moderators)

Disallowed content:
- Nudity, sexual content, or graphic violence.
- Targeted harassment or doxxing.
- Spam, advertisements, or off-topic promotional content.
- Misinformation about college policies presented as fact.
- Content unrelated to college/academic life.

---

## Notification System

```
Event occurs (like, comment, follow, etc.)
       |
       v
+------------------+
| Core API enqueues|
| notification job |
| to BullMQ        |
+--------+---------+
       |
       v
+------------------+
| Notification     |
| Worker           |
| - Dedup check    |
| - Batch window   |
|   (5 min)        |
| - Build payload  |
+--------+---------+
       |
       v
+------------------+
| FCM Push         |
| Send to device   |
| tokens           |
+--------+---------+
       |
       v
+------------------+
| Store in         |
| notifications    |
| table            |
+------------------+
```

### Notification Types

| Type | Trigger | Message Template |
|---|---|---|
| like | Someone likes your post | "{user} liked your post" |
| comment | Someone comments on your post | "{user} commented on your post" |
| follow | Someone follows you | "{user} started following you" |
| verification | Verification status changes | "Your verification is {status}" |
| moderation | Post removed or flagged | "Your post was removed: {reason}" |
| event | Event you RSVP'd to is starting | "{event} starts in 1 hour" |

---

## Multi-Tenancy Model

CampusConnect is NOT blockchain-decentralized. It is a single platform where each college operates as an isolated community (analogous to subreddits).

```
Platform (CampusConnect)
  |
  +-- College A (slug: /c/mit)
  |     +-- College Feed (only MIT verified students can post)
  |     +-- Members (verified MIT students)
  |     +-- Events
  |     +-- Moderators (delegated)
  |
  +-- College B (slug: /c/stanford)
  |     +-- College Feed
  |     +-- Members
  |     +-- Events
  |     +-- Moderators
  |
  +-- Global Discover Feed
        +-- Promoted posts from all colleges
        +-- Visible to everyone (no login required)
```

### Isolation Rules

- A user can only be verified for ONE college at a time.
- Posts are scoped to `college_id`. A user posts only to their verified college.
- College feeds are readable by anyone. Write access requires verification.
- Each college can have delegated moderators (post-MVP) who manage their own feed.
- The global discover feed aggregates promoted posts across all colleges.

---

## Auth Flow

```
+-------------------+
| User opens app    |
+--------+----------+
         |
         v
+-------------------+
| Enter phone number|
+--------+----------+
         |
         v
+-------------------+
| Firebase sends OTP|
| (SMS)             |
+--------+----------+
         |
         v
+-------------------+
| User enters OTP   |
+--------+----------+
         |
         v
+-------------------+
| Firebase verifies  |
| OTP, returns       |
| Firebase ID token  |
+--------+----------+
         |
         v
+-------------------+
| Backend validates  |
| Firebase token     |
+--------+----------+
         |
    +----+----+
    |         |
    v         v
 New user   Existing user
    |         |
    v         v
 Create     Lookup
 user       user
 record     record
    |         |
    +----+----+
         |
         v
+-------------------+
| Issue JWT access   |
| token (15 min) +   |
| refresh token      |
| (30 days)          |
+-------------------+
         |
         v
+-------------------+
| If unverified,     |
| prompt college     |
| verification flow  |
+-------------------+
```

### Token Structure

```
Access Token (JWT):
{
  "sub": "user_uuid",
  "college_id": "college_uuid" | null,
  "verification": "fully_verified" | "unverified" | ...,
  "role": "student" | "moderator" | "admin",
  "iat": timestamp,
  "exp": timestamp (15 min)
}

Refresh Token:
  - Stored in DB with device_id, user_agent, created_at, expires_at.
  - Rotated on each use (old token invalidated).
  - Revocable per-device or all-devices.
```

---

## API Design

### Conventions

- Base URL: `https://api.campusconnect.app/v1`
- Auth: Bearer token in `Authorization` header.
- Pagination: cursor-based (`?cursor=<post_id>&limit=20`).
- Errors: consistent JSON structure `{ "error": { "code": "...", "message": "..." } }`.
- Rate limiting: 100 req/min for authenticated users, 30 req/min for anonymous.

### Key Endpoints

```
AUTH
  POST   /auth/otp/send          Send OTP to phone number
  POST   /auth/otp/verify        Verify OTP, return tokens
  POST   /auth/token/refresh     Refresh access token
  POST   /auth/logout             Revoke refresh token

USERS
  GET    /users/me                Get current user profile
  PATCH  /users/me                Update profile
  GET    /users/:id               Get user by ID
  GET    /users/:id/posts         Get user's posts

COLLEGES
  GET    /colleges                List/search colleges
  GET    /colleges/:slug          Get college detail
  GET    /colleges/:slug/feed     Get college feed (paginated)
  GET    /colleges/:slug/events   Get college events

VERIFICATION
  POST   /verification/email      Start email verification
  POST   /verification/email/confirm   Confirm email token
  POST   /verification/id-card    Upload ID card for OCR verification
  GET    /verification/status     Get current verification status

POSTS
  POST   /posts                   Create post (verified users only)
  GET    /posts/:id               Get single post
  DELETE /posts/:id               Delete own post
  POST   /posts/:id/like          Like a post
  DELETE /posts/:id/like          Unlike a post
  GET    /posts/:id/comments      Get comments for a post
  POST   /posts/:id/comments      Add comment
  POST   /posts/:id/report        Report a post

FEED
  GET    /feed/personal           Personalized feed (auth required)
  GET    /feed/discover           Global discover feed (public)

FOLLOWS
  POST   /follows/users/:id       Follow a user
  DELETE /follows/users/:id       Unfollow a user
  POST   /follows/colleges/:id    Follow a college
  DELETE /follows/colleges/:id    Unfollow a college

EVENTS (post-MVP)
  POST   /events                  Create event
  GET    /events/:id              Get event detail
  POST   /events/:id/rsvp         RSVP to event
  DELETE /events/:id/rsvp         Cancel RSVP

NOTIFICATIONS
  GET    /notifications           Get notifications (paginated)
  PATCH  /notifications/read      Mark notifications as read

MODERATION (moderator/admin only)
  GET    /moderation/queue        Get flagged posts
  POST   /moderation/:post_id/action   Take action on flagged post
```

---

## Infrastructure and Deployment

```
+--------------------------------------------------+
|                  Docker Compose                   |
|                                                   |
|  +-------------+  +-------------+  +----------+  |
|  | api-gateway |  | core-api    |  | feed-svc |  |
|  | (nginx)     |  | (node:20)   |  | (node:20)|  |
|  +------+------+  +------+------+  +-----+----+  |
|         |                |               |        |
|  +------+------+  +------+------+  +-----+----+  |
|  | auth-svc    |  | media-svc   |  | verify-  |  |
|  | (node:20)   |  | (node:20)   |  | svc      |  |
|  +-------------+  +-------------+  +----------+  |
|                                                   |
|  +-------------+  +-------------+                 |
|  | redis       |  | bullmq      |                 |
|  | (cache +    |  | workers     |                 |
|  |  queue)     |  | (node:20)   |                 |
|  +-------------+  +-------------+                 |
+--------------------------------------------------+
         |
         v
  External Services:
  - Supabase (PostgreSQL)
  - Cloudinary (Media CDN)
  - Firebase (OTP + FCM)
  - Google Vision API (OCR)
```

### Environment Configuration

```
# .env.example
DATABASE_URL=postgresql://user:pass@db.supabase.co:5432/campusconnect
REDIS_URL=redis://localhost:6379
JWT_SECRET=<random-256-bit-key>
JWT_REFRESH_SECRET=<random-256-bit-key>
FIREBASE_PROJECT_ID=campusconnect
FIREBASE_SERVICE_ACCOUNT=<base64-encoded-json>
CLOUDINARY_CLOUD_NAME=campusconnect
CLOUDINARY_API_KEY=<key>
CLOUDINARY_API_SECRET=<secret>
GOOGLE_VISION_API_KEY=<key>
FCM_SERVER_KEY=<key>
NODE_ENV=production
PORT=3000
```

### Deployment Strategy

- **Development:** Docker Compose on local machine.
- **Staging:** Single VPS (4 vCPU, 8GB RAM) running Docker Compose.
- **Production:** Container orchestration (Docker Swarm or Kubernetes) with horizontal scaling on core-api and feed-svc. Supabase and Cloudinary remain managed services.

---

## Tech Stack

| Layer | Technology | Rationale |
|---|---|---|
| Mobile (Android) | Kotlin | Native performance, modern Android development |
| Mobile (iOS) | Swift | Native performance, modern iOS development |
| Web | Next.js | SSR for SEO on public feeds, React ecosystem |
| Backend API | Node.js + TypeScript | Fast development, strong typing, async I/O |
| Database | Supabase (PostgreSQL) | Managed Postgres, built-in auth helpers, free tier |
| Cache + Queue | Redis + BullMQ | In-memory speed for feeds, reliable job queue |
| Media Storage | Cloudinary | Free tier (25GB), built-in transformations, CDN |
| Auth (OTP) | Firebase Authentication | Free SMS OTP, reliable delivery |
| Push Notifications | Firebase Cloud Messaging | Free, cross-platform push |
| OCR | Google Vision API | High accuracy, handles diverse ID card formats |
| Content Moderation | Google Cloud Vision SafeSearch + custom model | NSFW and violence detection |
| Containerization | Docker + Docker Compose | Consistent environments, easy local development |
| Reverse Proxy | Nginx | Load balancing, SSL termination, rate limiting |

---

## MVP Roadmap

### Phase 0 -- Research and Specs (Week 1-2)

- Finalize feature list and data flows.
- Design database schema and API contracts.
- Set up project repositories and CI/CD pipeline.
- Configure Supabase, Firebase, and Cloudinary accounts.

### Phase 1 -- Core MVP (Week 3-8)

- Auth service: phone OTP login, JWT issuance, token refresh.
- Verification pipeline: email verification + ID card OCR.
- College CRUD and search.
- Post creation (text + image) scoped to verified college.
- College feed with basic chronological ordering.
- Like, comment, follow functionality.
- Basic report flow (user reports, admin reviews).
- Mobile app skeleton (Kotlin + Swift) with auth and feed screens.
- Web app skeleton (Next.js) with public discover feed.

### Phase 2 -- Feed and Moderation (Week 9-12)

- Two-stage feed ranking (candidate generation + scoring formula).
- Post promotion system (college -> public based on engagement).
- Automated content moderation (AI text + image analysis).
- Moderation dashboard for manual review.
- Notification system (FCM push + in-app notifications).
- Profile pages with achievement sections and verified badges.

### Phase 3 -- Growth Features (Week 13-16)

- Events module (create, RSVP, reminders).
- Delegated college moderators.
- Advanced search (hashtags, filters by post type, date range).
- Analytics dashboard for colleges (engagement metrics, trending topics).
- Feed personalization improvements (A/B test ranking weights).

### Phase 4 -- Scale and Optimize (Week 17+)

- ML re-ranker for feed (train on engagement logs).
- Private messaging (1:1 and groups).
- College clubs and sub-communities.
- Performance optimization (query tuning, CDN caching, read replicas).
- Security audit and penetration testing.

---

## Directory Structure

```
campusconnect/
|-- docker-compose.yml
|-- docker-compose.prod.yml
|-- .env.example
|
|-- packages/
|   |-- api-gateway/
|   |   |-- nginx.conf
|   |   |-- Dockerfile
|   |
|   |-- core-api/
|   |   |-- src/
|   |   |   |-- config/           # Environment, DB, Redis config
|   |   |   |-- middleware/        # Auth, rate-limit, error handler
|   |   |   |-- modules/
|   |   |   |   |-- auth/         # OTP, JWT, token refresh
|   |   |   |   |-- users/        # Profile CRUD
|   |   |   |   |-- colleges/     # College CRUD, search
|   |   |   |   |-- posts/        # Post CRUD, like, comment
|   |   |   |   |-- feed/         # Feed generation, ranking
|   |   |   |   |-- verification/ # Email + ID card verification
|   |   |   |   |-- moderation/   # Report handling, mod actions
|   |   |   |   |-- notifications/# Notification CRUD
|   |   |   |   |-- events/       # Event CRUD, RSVP
|   |   |   |   |-- follows/      # Follow users/colleges
|   |   |   |-- utils/            # Shared helpers
|   |   |   |-- app.ts            # Express app setup
|   |   |   |-- server.ts         # Server entry point
|   |   |-- prisma/
|   |   |   |-- schema.prisma
|   |   |   |-- migrations/
|   |   |-- tests/
|   |   |-- Dockerfile
|   |   |-- package.json
|   |   |-- tsconfig.json
|   |
|   |-- workers/
|   |   |-- src/
|   |   |   |-- notification.worker.ts
|   |   |   |-- moderation.worker.ts
|   |   |   |-- feed-promotion.worker.ts
|   |   |   |-- verification.worker.ts
|   |   |-- Dockerfile
|   |   |-- package.json
|   |
|   |-- media-service/
|   |   |-- src/
|   |   |   |-- upload.ts
|   |   |   |-- transform.ts
|   |   |-- Dockerfile
|   |   |-- package.json
|
|-- apps/
|   |-- web/                      # Next.js web client
|   |   |-- src/
|   |   |-- package.json
|   |   |-- next.config.js
|   |
|   |-- android/                  # Kotlin mobile app
|   |   |-- app/
|   |   |-- build.gradle.kts
|   |
|   |-- ios/                      # Swift mobile app
|       |-- CampusConnect/
|       |-- CampusConnect.xcodeproj
|
|-- docs/
|   |-- api-spec.yaml             # OpenAPI 3.0 spec
|   |-- architecture.md
|   |-- verification-flow.md
```
