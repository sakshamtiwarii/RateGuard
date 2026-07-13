# RateGuard

A production-style REST API demonstrating **JWT authentication**, **role-based rate limiting**, and **response caching**, built with Node.js, Express, PostgreSQL, and Redis.

RateGuard sits in front of protected API routes and enforces per-user request quotas using a Redis-backed sliding-window algorithm, tiered by the user's role (`free`, `pro`, `admin`).

## Features

- **JWT auth** — register/login issue short-lived access tokens plus long-lived refresh tokens stored in PostgreSQL. Includes token refresh and logout (token revocation).
- **Role-based rate limiting** — sliding-window limiter in Redis (sorted sets). Per-hour quotas: `free` = 5, `pro` = 10, `admin` = unlimited. Returns `429` with `X-RateLimit-*` and `Retry-After` headers.
- **Response caching** — per-user caching of `GET` responses in Redis with a configurable TTL, surfaced via `X-Cache: HIT|MISS`.
- **Request logging** — every `/api` request (method, endpoint, status, response time, user, IP) is written to a `request_logs` table.
- **Fail-open resilience** — if Redis is unavailable, requests are allowed through rather than blocking the API.
- **Dockerized** — one-command spin-up of the API, PostgreSQL, and Redis via Docker Compose.

## Tech Stack

| Concern          | Technology                     |
| ---------------- | ------------------------------ |
| Runtime / server | Node.js, Express 5             |
| Database         | PostgreSQL (`pg`)              |
| Cache / limiter  | Redis (`ioredis`)             |
| Auth             | `jsonwebtoken`, `bcryptjs`    |
| Config           | `dotenv`                       |
| Containerization | Docker, Docker Compose         |

## Project Structure

```
src/
├── server.js               # Entry point; DB/Redis connection + app.listen
├── app.js                  # Express app, middleware & route wiring
├── config/index.js         # Env-driven config (ports, secrets, rate limits)
├── db/
│   ├── postgres.js         # pg connection pool
│   └── redis.js            # ioredis client
├── routes/
│   ├── auth.js             # /auth routes
│   └── api.js              # /api routes (protected)
├── controllers/
│   ├── authController.js   # register, login, refresh, logout
│   └── apiController.js    # health, getData
├── middleware/
│   ├── auth.js             # Bearer-token verification
│   ├── roles.js            # requireRole(...) guard
│   ├── rateLimiter.js      # Redis sliding-window rate limiter
│   ├── cache.js            # Redis response cache
│   └── requestLogger.js    # Persists request logs to Postgres
└── utils/
    ├── jwt.js              # Sign/verify access & refresh tokens
    └── asyncHandler.js     # Async route error forwarding
migrations/init.sql         # users, refresh_tokens, request_logs schema
docker-compose.yml          # api + postgres + redis
dockerfile                  # API image
```

## Getting Started

### Prerequisites

- [Docker](https://www.docker.com/) & Docker Compose (recommended), **or**
- Node.js 20+, a running PostgreSQL 16, and a running Redis 7 for local development.

### Environment variables

Copy `.env.example` to `.env` and fill in the values:

```env
NODE_ENV=development
PORT=3000

# PostgreSQL
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/rateguard
POSTGRES_PASSWORD=postgres

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT
ACCESS_TOKEN_SECRET=replace-with-a-strong-secret
ACCESS_TOKEN_EXPIRY=30m
REFRESH_TOKEN_SECRET=replace-with-another-strong-secret
REFRESH_TOKEN_EXPIRY=7d
```

### Run with Docker (recommended)

```bash
docker compose up --build
```

This starts the API on `http://localhost:3000`, plus PostgreSQL and Redis. The database schema in `migrations/init.sql` is applied automatically on first boot.

### Run locally

```bash
npm install

# Ensure Postgres & Redis are running, then apply the schema:
psql "$DATABASE_URL" -f migrations/init.sql

npm run dev     # start with nodemon (auto-reload)
# or
npm start       # start with node
```

## API Reference

Base URL: `http://localhost:3000`

### Auth — `/auth`

| Method | Endpoint         | Body                  | Description                                    |
| ------ | ---------------- | --------------------- | ---------------------------------------------- |
| POST   | `/auth/register` | `{ email, password }` | Create a `free`-tier user; returns tokens.     |
| POST   | `/auth/login`    | `{ email, password }` | Authenticate; returns access + refresh token.  |
| POST   | `/auth/refresh`  | `{ refreshToken }`    | Exchange a valid refresh token for a new access token. |
| POST   | `/auth/logout`   | `{ refreshToken }`    | Revoke a refresh token.                        |

> Passwords must be at least 8 characters and are hashed with bcrypt (cost 12).

### Protected API — `/api`

All `/api` routes require an `Authorization: Bearer <accessToken>` header and are subject to rate limiting.

| Method | Endpoint      | Description                                          |
| ------ | ------------- | --------------------------------------------------- |
| GET    | `/api/health` | Returns status and the authenticated user's info.   |
| GET    | `/api/data`   | Sample protected payload; cached per user for 60s.  |
| GET    | `/api/premium`| Premium payload; requires `pro` or `admin` role.    |

### Example

```bash
# 1. Register
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'

# 2. Call a protected route with the returned accessToken
curl http://localhost:3000/api/data \
  -H "Authorization: Bearer <accessToken>"
```

Rate-limit state is returned on protected responses:

```
X-RateLimit-Limit: 5
X-RateLimit-Remaining: 4
X-RateLimit-Reset: 1752384000
```

When the quota is exceeded, the API responds with `429 Too Many Requests`:

```json
{
  "error": "Rate limit exceeded.",
  "code": "RATE_LIMIT_EXCEEDED",
  "limit": 5,
  "resetAt": "2026-07-13T12:00:00.000Z"
}
```

## How It Works

- **Rate limiting** uses a Redis sorted set per user (`ratelimit:user:<id>`). Each request adds a timestamped member; entries older than the 1-hour window are trimmed, and the current count is compared against the role's limit.
- **Caching** stores serialized `GET` responses under `cache:<userId>:<url>` with a TTL, wrapping `res.json` to transparently populate the cache on a miss.
- **Rate limits by role** are defined in [`src/config/index.js`](src/config/index.js):

  ```js
  rateLimits: { free: 5, pro: 10, admin: Infinity }
  ```

## Database Schema

Defined in [`migrations/init.sql`](migrations/init.sql):

- **`users`** — credentials, `role`, `is_active`, timestamps.
- **`refresh_tokens`** — issued refresh tokens with expiry, cascade-deleted with the user.
- **`request_logs`** — per-request audit log (endpoint, method, status, response time).

## Scripts

| Command       | Description                          |
| ------------- | ------------------------------------ |
| `npm start`   | Start the server with Node.          |
| `npm run dev` | Start with nodemon (auto-reload).    |

## License

ISC
