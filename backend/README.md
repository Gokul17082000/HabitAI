# HabitAI — Backend

Spring Boot REST API for the HabitAI habit tracking application. Handles authentication, habit management, AI-powered suggestions and insights, push notifications, and background scheduling.

---

## Prerequisites

| Requirement | Version |
|---|---|
| Java | 25 |
| Maven | 3.9+ |
| PostgreSQL | 14+ |
| Firebase project | — (for push notifications) |
| Groq API key | — (for AI features) |

---

## Local setup

### 1. Clone and enter the backend directory

```bash
git clone https://github.com/yourusername/HabitAI.git
cd HabitAI/backend
```

### 2. Create the PostgreSQL database

```sql
CREATE DATABASE habitai;
```

### 3. Create the `.env` file

Copy the template below and fill in your values. The app reads this file via `spring-dotenv` on startup.

```env
# Database
DB_URL=jdbc:postgresql://localhost:5432/habitai
DB_USERNAME=your_db_username
DB_PASSWORD=your_db_password

# JWT — generate with: openssl rand -base64 32
JWT_SECRET=your_generated_secret_here
JWT_EXPIRATION=900000
JWT_REFRESH_EXPIRATION=2592000000

# Hibernate
DDL_AUTO=validate

# CORS — add your Expo dev client origin(s)
CORS_ORIGINS=http://localhost:8081,http://192.168.x.x:8081

# Firebase
FIREBASE_SERVICE_ACCOUNT=src/main/resources/firebase-service-account.json

# Groq AI
GROQ_API_KEY=gsk_your_groq_key_here
GROQ_API_URL=https://api.groq.com/openai/v1/chat/completions

# Rate limiting
RATE_LIMIT_MAX_REQUESTS=20
RATE_LIMIT_WINDOW_MS=60000
# Comma-separated list of trusted reverse-proxy IPs (leave blank for local dev)
RATE_LIMIT_TRUSTED_PROXIES=
```

Generate a strong JWT secret:

```bash
openssl rand -base64 32
```

### 4. Add the Firebase service account

1. Open the [Firebase Console](https://console.firebase.google.com) → your project → **Project Settings** → **Service Accounts**
2. Click **Generate new private key** and download the JSON file
3. Save it as `src/main/resources/firebase-service-account.json`

This file is already in `.gitignore`. Never commit it.

### 5. Run the application

```bash
./mvnw spring-boot:run
```

The server starts at `http://localhost:8080`. Flyway will apply any pending migrations automatically on startup.

### 6. Verify

```
GET http://localhost:8080/health
→ 200 OK
```

Swagger UI: `http://localhost:8080/swagger-ui/index.html`

---

## Project structure

```
src/main/java/com/habitai/
├── ai/                    # Groq LLM integration
│   ├── AiController       # POST /ai/suggest, GET /ai/insights
│   └── AiService          # Habit suggestions + weekly insight generation
├── auth/                  # Authentication
│   ├── AuthController     # POST /auth/register, /login, /refresh, /logout
│   ├── AuthService        # Register, login, refresh token rotation
│   └── JwtService         # Token generation and validation
├── common/
│   ├── security/          # CurrentUser, UserPrincipal
│   └── validation/        # HabitAccessValidator, PasswordStrengthValidator
├── exception/             # Custom exceptions + GlobalExceptionHandler
├── habit/                 # Habit CRUD
│   ├── HabitController    # CRUD + pause/resume/archive endpoints
│   ├── HabitService       # Business logic, scheduling, month summary
│   └── HabitScheduleService # Schedule matching + pause history queries
├── habitlog/              # Habit logging
│   ├── HabitLogController # POST /habits/{id}/log, GET streak + activity
│   └── HabitLogService    # Log upsert, countable habits, concurrent safety
├── notification/          # Firebase Cloud Messaging
│   └── NotificationService # Per-habit reminder + weekly digest push
├── scheduler/             # Background jobs
│   ├── HabitStatusScheduler  # Every 5 min — mark overdue habits MISSED
│   ├── SchedulerService      # Every 15 min — send FCM reminders
│   │                         # Daily midnight — auto-resume paused habits
│   │                         # Daily midnight — award streak freezes
│   └── WeeklyDigestScheduler # Sunday 8 AM IST — AI-generated weekly recap
├── security/              # Spring Security
│   ├── SecurityConfig     # JWT stateless filter chain, CORS, rate limiter
│   ├── JwtAuthenticationFilter
│   └── RateLimitFilter    # In-memory sliding window, trusted-proxy-aware
└── user/                  # User profile and stats
    ├── UserController     # GET /user, /stats, /year-pixels, /weekly-review
    │                      # POST /push-token, /streak-freeze/use
    ├── UserStatsService   # Streaks, consistency %, top habits, year pixels
    └── StreakFreezeService # Freeze allocation and usage
```

---

## API reference

All endpoints except `/auth/*` and `/health` require an `Authorization: Bearer <token>` header.

### Authentication

| Method | Endpoint | Body | Description |
|---|---|---|---|
| POST | `/auth/register` | `{email, password}` | Create account |
| POST | `/auth/login` | `{email, password}` | Returns `accessToken` + `refreshToken` |
| POST | `/auth/refresh` | `{refreshToken}` | Rotate refresh token, returns new pair |
| POST | `/auth/logout` | — | Invalidates all refresh tokens for the user |

### Habits

| Method | Endpoint | Description |
|---|---|---|
| GET | `/habits?date=YYYY-MM-DD` | Today's habits with live status |
| GET | `/habits/all` | All active habits (no status) |
| GET | `/habits/archived` | Archived habits |
| GET | `/habits/{id}` | Single habit detail |
| GET | `/habits/summary?year=&month=` | Month summary map `{date → [statuses]}` |
| POST | `/habits` | Create a habit |
| PUT | `/habits/{id}` | Update a habit |
| DELETE | `/habits/{id}` | Permanently delete a habit and all its logs |
| PATCH | `/habits/{id}/pause` | Pause for N days `{days: int}` |
| PATCH | `/habits/{id}/resume` | Resume immediately |
| PATCH | `/habits/{id}/archive` | Soft-archive (history preserved) |
| PATCH | `/habits/{id}/unarchive` | Restore from archive |

**Habit request body:**

```json
{
  "title": "Morning run",
  "description": "30 minutes outdoors",
  "category": "FITNESS",
  "frequency": "WEEKLY",
  "daysOfWeek": ["MONDAY", "WEDNESDAY", "FRIDAY"],
  "daysOfMonth": null,
  "targetTime": "07:00:00",
  "targetCount": 1,
  "isCountable": false
}
```

`category` values: `GENERAL`, `HEALTH`, `FITNESS`, `WORK`, `LEARNING`  
`frequency` values: `DAILY`, `WEEKLY`, `MONTHLY`

### Habit logs

| Method | Endpoint | Description |
|---|---|---|
| POST | `/habits/{id}/log` | Log or update today's status |
| GET | `/habits/{id}/streak` | Current streak |
| GET | `/habits/{id}/streak/longest` | All-time longest streak |
| GET | `/habits/{id}/activity` | Full activity history |

**Log request body:**

```json
{
  "date": "2025-04-12",
  "habitStatus": "COMPLETED",
  "note": "Felt great today",
  "currentCount": 1
}
```

`habitStatus` values: `PENDING`, `COMPLETED`, `PARTIALLY_COMPLETED`, `MISSED`  
Set `habitStatus: PENDING` to undo a log.

### User

| Method | Endpoint | Description |
|---|---|---|
| GET | `/user` | Email and account info |
| GET | `/user/stats` | Dashboard: streaks, consistency %, top habits |
| POST | `/user/push-token` | Register FCM device token `{token: string}` |
| GET | `/user/year-pixels` | 365-day heatmap `{date → COMPLETED/MISSED/PARTIAL/PENDING}` |
| GET | `/user/weekly-review` | This week's per-habit stats + AI coaching note |
| GET | `/user/streak-freeze` | Available and max freeze count |
| POST | `/user/streak-freeze/use` | Use a freeze on a date `{date: "YYYY-MM-DD"}` |

### AI

| Method | Endpoint | Description |
|---|---|---|
| POST | `/ai/suggest` | Suggest habits for a goal `{goal: string}` |
| GET | `/ai/insights` | Personalised coaching insight based on your stats |

---

## Background jobs

| Job | Schedule | What it does |
|---|---|---|
| `updateMissedHabits` | Every 5 minutes | Marks habits as MISSED if their target time has passed and they have no log for today |
| `sendHabitReminder` | Every 15 minutes | Sends FCM push to users whose habit target time falls in the next 15-minute window |
| `autoResumeHabits` | Daily midnight IST | Resumes habits whose `pausedUntil` date has passed |
| `awardStreakFreezes` | Daily midnight IST | Awards freeze tokens to users with a 7-day streak |
| `sendWeeklyDigest` | Sunday 8 AM IST | Generates an AI coaching recap and sends it as a push notification |

---

## Security

- **JWT access tokens** expire in 15 minutes by default (`JWT_EXPIRATION`)
- **Refresh tokens** expire in 30 days (`JWT_REFRESH_EXPIRATION`) and are single-use (rotation on every refresh)
- **Token reuse detection**: if a used refresh token is replayed, all tokens for that user are immediately invalidated
- **Rate limiting**: auth endpoints are protected by an in-memory sliding window rate limiter. Set `RATE_LIMIT_TRUSTED_PROXIES` to your reverse proxy IP in production to prevent header-spoofing bypass
- **Password validation**: enforced at registration via `@ValidPassword`
- **CORS**: configure `CORS_ORIGINS` to exactly the origins your app uses — wildcards are not allowed in production

---

## Database migrations

Migrations live in `src/main/resources/db/migration/` and are applied automatically by Flyway on startup. Use `DDL_AUTO=validate` in production (the default) so Hibernate never modifies the schema directly.

To create a new migration:

```
V{next_number}__{description_with_underscores}.sql
```

Example: `V8__add_streak_freeze_usage_table.sql`

---

## Running tests

```bash
./mvnw test
```

The test suite covers auth, habit CRUD, habit logging, user stats, security filters, and the scheduler service. Tests use `@SpringBootTest` with an in-memory H2 database — no real PostgreSQL or Firebase connection required.

---

## Docker

A `Dockerfile` is included in this directory. Build and run:

```bash
docker build -t habitai-backend .
docker run -p 8080:8080 --env-file .env habitai-backend
```

---

## Environment variables reference

| Variable | Required | Default | Description |
|---|---|---|---|
| `DB_URL` | Yes | — | PostgreSQL JDBC URL |
| `DB_USERNAME` | Yes | — | Database user |
| `DB_PASSWORD` | Yes | — | Database password |
| `JWT_SECRET` | Yes | — | HS512 signing secret (min 64 chars) |
| `JWT_EXPIRATION` | No | `900000` | Access token TTL in ms (15 min) |
| `JWT_REFRESH_EXPIRATION` | No | `2592000000` | Refresh token TTL in ms (30 days) |
| `DDL_AUTO` | No | `validate` | Hibernate DDL mode — use `validate` in prod |
| `CORS_ORIGINS` | Yes | — | Comma-separated allowed origins |
| `FIREBASE_SERVICE_ACCOUNT` | Yes | — | Path to Firebase Admin SDK JSON |
| `GROQ_API_KEY` | Yes | — | Groq Cloud API key |
| `GROQ_API_URL` | No | Groq default | Override for self-hosted LLM |
| `RATE_LIMIT_MAX_REQUESTS` | No | `20` | Max requests per window per IP |
| `RATE_LIMIT_WINDOW_MS` | No | `60000` | Rate limit window in ms |
| `RATE_LIMIT_TRUSTED_PROXIES` | No | — | Comma-separated trusted proxy IPs |

---

## Files that must never be committed

| File | Contains |
|---|---|
| `.env` | All secrets and connection strings |
| `src/main/resources/firebase-service-account.json` | Firebase Admin private key |

Both are already listed in `.gitignore`. Double-check before pushing.