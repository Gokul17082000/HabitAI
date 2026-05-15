# HabitAI

A full-stack habit tracking application with AI-powered insights, streak management, and push notifications. Built with Spring Boot (backend) and React Native / Expo (mobile).

---

## Architecture Overview

```
HabitAI/
├── backend/     # Spring Boot 4 REST API — Java 25, PostgreSQL, Flyway
└── frontend/    # React Native (Expo 54) — TypeScript, Expo Router
```

The mobile app communicates exclusively with the backend REST API. The backend handles all business logic, scheduling, AI calls (via Groq), and push notifications (via Firebase Cloud Messaging).

---

## Features

### Habits
- Create habits with daily, weekly, or monthly frequency
- Schedule habits on specific days of the week or days of the month
- Countable habits with a target count per session
- Pause habits for a set number of days (with auto-resume)
- Archive habits you no longer need
- Drag-to-reorder habit list
- Per-habit notification reminders

### Habit Logging
- Log each habit as Completed, Missed, Pending, or Partially Completed
- Idempotent upsert — re-logging the same day updates in place
- Streak tracking (current and longest)
- Full activity history with date range queries
- Year-view activity heatmap (GitHub-style)

### User Statistics
- Total completions, misses, and days tracked
- Overall consistency percentage
- Top 3 habits by completion rate
- Weekly performance review

### Streak Freezes
- Earn one freeze automatically every month
- Use a freeze to skip a day without breaking a streak
- Maximum of 2 active freezes at any time

### AI (via Groq)
- Habit suggestions based on your stated goal
- AI-generated weekly coaching notes
- Per-user rate limited (20 requests per minute)

### Push Notifications
- Habit reminders 15 minutes before each habit's target time
- Timezone-aware — fires at the right local time for every user
- Weekly AI-generated digest every Sunday at 8 AM IST

### Security
- JWT authentication with 15-minute access tokens
- 7-day refresh tokens with rotation and reuse detection
- Per-IP rate limiting (30 requests per minute)
- Structured error responses with stable error codes
- MDC-based per-request structured logging

---

## Quick Start

### Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| Java | 25 | Eclipse Temurin recommended |
| Maven | 3.9+ | Included via `mvnw` wrapper |
| Node.js | 20+ | |
| PostgreSQL | 14+ | Running locally or via Docker |
| EAS CLI | Latest | `npm install -g eas-cli` — for mobile builds |

### 1. Start the backend

```bash
cd backend
cp .env.example .env          # fill in DB_URL, JWT_SECRET, GROQ_API_KEY, etc.
./mvnw spring-boot:run
```

The API will be available at `http://localhost:8080`.

Full setup details: [backend/README.md](backend/README.md)

### 2. Start the frontend

```bash
cd frontend
npm install
# Edit app.json → extra.devApiHost → your machine's local IP
npm start
```

Full setup details: [frontend/README.md](frontend/README.md)

---

## Environment Variables

### Backend (`.env`)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DB_URL` | Yes | — | PostgreSQL JDBC URL |
| `DB_USERNAME` | Yes | — | Database username |
| `DB_PASSWORD` | Yes | — | Database password |
| `JWT_SECRET` | Yes | — | HS512 secret (min 64 chars) |
| `JWT_EXPIRATION` | No | 900000 | Access token TTL in ms (15 min) |
| `JWT_REFRESH_EXPIRATION` | No | 604800000 | Refresh token TTL in ms (7 days) |
| `GROQ_API_KEY` | Yes | — | Groq API key for AI features |
| `FIREBASE_SERVICE_ACCOUNT` | No | `src/main/resources/firebase-service-account.json` | Path to Firebase service account JSON |
| `CORS_ORIGIN_3` | No | — | Additional CORS origin (e.g. dev device IP) |
| `RATE_LIMIT_TRUSTED_PROXIES` | No | — | Comma-separated trusted proxy IPs |
| `AI_RATE_LIMIT_MAX_REQUESTS` | No | 20 | Max AI requests per window |
| `AI_RATE_LIMIT_WINDOW_MS` | No | 60000 | AI rate limit window in ms |
| `SWAGGER_ENABLED` | No | false | Enable Swagger UI at `/swagger-ui.html` |

### Frontend

No `.env` files. Configuration lives in `app.json` and EAS secrets — see [frontend/README.md](frontend/README.md).

---

## Deployment

### Backend (Docker → Render)

```bash
cd backend
docker build -t habitai-backend .
docker run -p 8080:8080 --env-file .env habitai-backend
```

The production backend is deployed on Render at `https://habitai-knma.onrender.com`.

### Frontend (EAS)

```bash
cd frontend
eas build --profile production --platform android
eas build --profile production --platform ios
```

OTA JavaScript-only updates:

```bash
eas update --branch production --message "your message"
```

---

## API Reference

Swagger UI is available in development when `SWAGGER_ENABLED=true`:

```
http://localhost:8080/swagger-ui.html
```

### Endpoint Summary

| Group | Endpoints |
|-------|-----------|
| Auth | `POST /auth/register` `POST /auth/login` `POST /auth/refresh` `POST /auth/logout` |
| Habits | `GET/POST /habits` `GET/PUT/DELETE /habits/{id}` `PUT /habits/{id}/pause` `PUT /habits/{id}/resume` `PUT /habits/{id}/archive` `PUT /habits/sort-order` |
| Habit Logs | `POST /habits/{id}/log` `GET /habits/{id}/activity` `GET /habits/{id}/streak` |
| User | `GET /user` `GET /user/stats` `GET /user/year-pixels` `GET /user/weekly-review` `POST /user/push-token` |
| Streak Freeze | `GET /user/streak-freeze` `POST /user/streak-freeze/use` |
| AI | `POST /ai/suggest` `GET /ai/insights` |
| Health | `GET /health` |

All authenticated endpoints expect `Authorization: Bearer <access_token>`.

---

## Repository Structure

```
HabitAI/
├── README.md                  # This file
├── backend/
│   ├── README.md
│   ├── Dockerfile
│   ├── pom.xml
│   └── src/
│       └── main/
│           ├── java/com/habitai/
│           │   ├── ai/            # AI suggestions and insights
│           │   ├── auth/          # JWT auth, refresh token rotation
│           │   ├── common/        # Config, security principals, validation
│           │   ├── exception/     # Global exception handler
│           │   ├── habit/         # Habit CRUD, scheduling, pause/archive
│           │   ├── habitlog/      # Logging, streaks, activity
│           │   ├── health/        # Health check endpoint
│           │   ├── notification/  # Firebase Cloud Messaging
│           │   ├── scheduler/     # Cron jobs — reminders, auto-resume, freezes
│           │   ├── security/      # JWT filter, rate limiters, MDC logging
│           │   └── user/          # User info, stats, streak freezes
│           └── resources/
│               └── db/migration/  # Flyway SQL migrations (V1–V11)
└── frontend/
    ├── README.md
    ├── app/                   # Expo Router screens
    ├── components/            # Reusable UI components
    ├── constants/             # API endpoints, color tokens
    ├── context/               # React contexts (theme)
    ├── services/              # API layer
    ├── types/                 # TypeScript types
    └── utils/                 # Auth storage, API handler, formatters
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Mobile | React Native 0.81, Expo 54, Expo Router, TypeScript 5.9 |
| Backend | Spring Boot 4.0, Java 25, Spring Security, Spring Data JPA |
| Database | PostgreSQL 14+, Flyway (schema migrations) |
| Auth | JWT (JJWT 0.12), BCrypt password hashing |
| AI | Groq LLM API |
| Push Notifications | Firebase Cloud Messaging (FCM) |
| Build (mobile) | EAS (Expo Application Services) |
| Build (backend) | Maven, Docker (Eclipse Temurin JDK 25) |
| Hosting | Render (backend + database) |
