# HabitAI — Backend

Spring Boot 4 REST API for HabitAI. Handles habit management, user authentication, push notifications, AI-powered insights, and background scheduling.

---

## Tech Stack

| Technology | Version | Purpose |
|-----------|---------|---------|
| Java | 25 | Runtime |
| Spring Boot | 4.0.0 | Application framework |
| Spring Security | (Boot-managed) | JWT authentication, filter chain |
| Spring Data JPA | (Boot-managed) | ORM and repositories |
| PostgreSQL | 14+ | Primary database |
| Flyway | (Boot-managed) | Schema migrations |
| JJWT | 0.12.6 | JWT generation and validation |
| Firebase Admin SDK | 9.2.0 | Push notifications via FCM |
| Groq API | (HTTP) | LLM for AI features |
| Springdoc OpenAPI | 3.0.2 | Swagger UI (dev only) |
| Lombok | (latest) | Boilerplate reduction |

---

## Prerequisites

- Java 25 (Eclipse Temurin recommended)
- Maven 3.9+ (or use the included `mvnw` wrapper)
- PostgreSQL 14+ running and accessible
- A Groq API key (for AI features)
- A Firebase service account JSON (for push notifications)

---

## Local Setup

### 1. Create the database

```sql
CREATE DATABASE habitai;
```

### 2. Configure environment variables

Copy the example file and fill in your values:

```bash
cp .env.example .env
```

Then edit `.env`:

```dotenv
DB_URL=jdbc:postgresql://localhost:5432/habitai
DB_USERNAME=your_db_user
DB_PASSWORD=your_db_password

JWT_SECRET=your_64_character_or_longer_secret_here
# Optional — defaults shown:
JWT_EXPIRATION=900000        # 15 minutes in ms
JWT_REFRESH_EXPIRATION=604800000  # 7 days in ms

GROQ_API_KEY=your_groq_api_key

# Optional — defaults to src/main/resources/firebase-service-account.json
FIREBASE_SERVICE_ACCOUNT=path/to/firebase-service-account.json

# Optional CORS origin for a dev device
CORS_ORIGIN_3=http://192.168.x.x:8081
```

### 3. Add Firebase service account

Download your Firebase service account JSON from:
**Firebase Console → Project Settings → Service Accounts → Generate new private key**

Place the file at `src/main/resources/firebase-service-account.json` (or the path set in `FIREBASE_SERVICE_ACCOUNT`). This file is in `.gitignore` — never commit it.

### 4. Run the application

```bash
./mvnw spring-boot:run
```

Flyway will run all pending migrations automatically on startup. The API will be available at `http://localhost:8080`.

To verify: `curl http://localhost:8080/health`

---

## Environment Variables Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DB_URL` | Yes | — | JDBC URL for PostgreSQL |
| `DB_USERNAME` | Yes | — | Database username |
| `DB_PASSWORD` | Yes | — | Database password |
| `JWT_SECRET` | Yes | — | HS512 signing secret (min 64 characters) |
| `JWT_EXPIRATION` | No | `900000` | Access token TTL in milliseconds |
| `JWT_REFRESH_EXPIRATION` | No | `604800000` | Refresh token TTL in milliseconds |
| `GROQ_API_KEY` | Yes | — | Groq API key |
| `FIREBASE_SERVICE_ACCOUNT` | No | `src/main/resources/firebase-service-account.json` | Path to Firebase service account JSON |
| `CORS_ORIGIN_3` | No | — | Extra CORS origin (useful for dev device IP) |
| `RATE_LIMIT_TRUSTED_PROXIES` | No | — | Comma-separated trusted reverse proxy IPs |
| `AI_RATE_LIMIT_MAX_REQUESTS` | No | `20` | Max AI requests per user per window |
| `AI_RATE_LIMIT_WINDOW_MS` | No | `60000` | AI rate limit window in ms |
| `SWAGGER_ENABLED` | No | `false` | Enable Swagger UI at `/swagger-ui.html` |

---

## Docker

### Build

```bash
docker build -t habitai-backend .
```

### Run

```bash
docker run -p 8080:8080 --env-file .env habitai-backend
```

The Dockerfile uses a two-stage build: Maven compiles the JAR in a JDK image, then the runtime image uses the leaner JRE variant.

---

## Project Structure

```
src/main/java/com/habitai/
├── HabitAiApplication.java          # @SpringBootApplication entry point
│
├── ai/                              # AI features
│   ├── AiController.java            # POST /ai/suggest, GET /ai/insights
│   ├── AiService.java               # Calls Groq API, formats prompts
│   ├── GoalRequest.java
│   └── InsightResponse.java
│
├── auth/                            # Authentication
│   ├── AuthController.java          # /auth/register, /login, /refresh, /logout
│   ├── AuthService.java             # Registration, login, token rotation
│   ├── JwtService.java              # JWT generation and validation
│   ├── RefreshToken.java            # Entity
│   ├── RefreshTokenRepository.java
│   ├── LoginRequest.java / LoginResponse.java
│   ├── RegisterRequest.java / RegisterResponse.java
│   └── RefreshRequest.java
│
├── common/
│   ├── AppConstants.java            # APP_ZONE (IST), shared constants
│   ├── FirebaseConfig.java          # Firebase Admin SDK bean
│   ├── HabitAiApplicationConfig.java
│   └── security/
│       ├── CurrentUser.java         # @CurrentUser annotation
│       └── UserPrincipal.java       # Spring Security UserDetails + Lombok @Getter
│   └── validation/
│       ├── ValidPassword.java       # Custom annotation
│       ├── PasswordStrengthValidator.java
│       └── HabitAccessValidator.java
│
├── exception/                       # Error handling
│   ├── GlobalExceptionHandler.java  # @RestControllerAdvice — all exception → HTTP
│   ├── ApiErrorResponse.java        # {message, status, code, timestamp}
│   ├── AccessDeniedException.java
│   ├── DatabaseException.java
│   ├── HabitLogNotFoundException.java
│   ├── HabitNotFoundException.java
│   ├── PasswordDoesNotMatchException.java
│   ├── UserAlreadyExistException.java
│   └── UserNotFoundException.java
│
├── habit/                           # Core habit domain
│   ├── Habit.java                   # JPA entity
│   ├── HabitController.java         # Full CRUD + pause/archive/sort
│   ├── HabitService.java
│   ├── HabitScheduleService.java    # Determines if habit is due on a given date
│   ├── HabitRepository.java
│   ├── HabitPauseHistory.java       # Pause history entity
│   ├── HabitPauseHistoryRepository.java
│   ├── HabitCategory.java           # Enum: GENERAL HEALTH WORK FITNESS LEARNING
│   ├── HabitFrequency.java          # Enum: DAILY WEEKLY MONTHLY
│   ├── HabitRequest.java / HabitResponse.java / HabitDTO.java
│   ├── PauseRequest.java
│   └── SortOrderRequest.java
│
├── habitlog/                        # Logging and streaks
│   ├── HabitLog.java                # Entity — upsert by (habit_id, date)
│   ├── HabitLogController.java      # POST /habits/{id}/log, activity, streak
│   ├── HabitLogService.java         # Upsert logic, streak calculation
│   ├── HabitLogRepository.java
│   ├── HabitStatus.java             # Enum: COMPLETED MISSED PENDING PARTIALLY_COMPLETED
│   ├── HabitActivityStatus.java
│   ├── HabitLogRequest.java
│   └── HabitStreakResponse.java
│
├── health/
│   └── HealthController.java        # GET /health — liveness probe
│
├── notification/
│   ├── NotificationService.java     # FCM push via Firebase Admin SDK
│   └── PushTokenRequest.java
│
├── scheduler/                       # Background jobs (@Scheduled)
│   ├── HabitStatusScheduler.java    # Every 5 min — mark overdue habits MISSED
│   ├── SchedulerService.java        # Every 15 min reminders; daily auto-resume & freeze awards
│   └── WeeklyDigestScheduler.java   # Sunday 8 AM IST — AI weekly recap push
│
├── security/                        # Spring Security filter chain
│   ├── SecurityConfig.java          # Filter order, CORS, endpoint permissions
│   ├── JwtAuthenticationFilter.java # Extract and validate JWT; populate SecurityContext
│   ├── RateLimitFilter.java         # Sliding-window IP rate limiter (30 req/min)
│   ├── AiRateLimitFilter.java       # Per-user AI rate limiter (20 req/min)
│   ├── MdcLoggingFilter.java        # MDC requestId + userId for structured logging
│   ├── CorsProperties.java
│   └── RateLimitProperties.java
│
└── user/                            # User domain
    ├── User.java                    # JPA entity
    ├── UserController.java          # GET /user, /stats, /year-pixels, /weekly-review; push token; freeze
    ├── UserService.java             # savePushToken, changePassword
    ├── UserStatsService.java        # Aggregate stats + top habits
    ├── UserRepository.java
    ├── StreakFreezeService.java      # Award and consume streak freezes
    ├── StreakFreezeUsage.java        # Entity
    ├── StreakFreezeUsageRepository.java
    ├── UserDTO.java / UserStatsResponse.java / WeeklyReviewResponse.java
    ├── ChangePasswordRequest.java
    ├── UseFreezeRequest.java
    └── StreakFreezeResponse.java
```

---

## Database Migrations

Flyway runs migrations automatically on startup. All files are in `src/main/resources/db/migration/`.

| Migration | Description |
|-----------|-------------|
| V1 | Core schema: `users`, `habits`, `habit_logs`, `refresh_tokens` |
| V2 | Unique constraint on `(habit_id, date)` in `habit_logs` |
| V3 | Case-insensitive index on `users.email` |
| V4 | `created_at` as `TIMESTAMPTZ` on `users` |
| V5 | `habit_pause_history` table |
| V6 | `archived` column on `habits` |
| V7 | `streak_freeze_usage` table |
| V8 | Move secondary indexes to Hibernate-managed definitions |
| V9 | `notifications_enabled` and `sort_order` columns on `habits` |
| V10 | Rename refresh tokens table |
| V11 | `last_freeze_awarded_at` column on `users` |

---

## API Endpoints

All endpoints except `/auth/**` and `/health` require `Authorization: Bearer <access_token>`.

### Auth

| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/register` | Register a new account |
| POST | `/auth/login` | Login — returns access + refresh tokens |
| POST | `/auth/refresh` | Exchange a refresh token for a new token pair |
| POST | `/auth/logout` | Invalidate the current refresh token |

### Habits

| Method | Path | Description |
|--------|------|-------------|
| GET | `/habits` | List all habits for the current user |
| POST | `/habits` | Create a new habit |
| GET | `/habits/{id}` | Get a single habit |
| PUT | `/habits/{id}` | Update a habit |
| DELETE | `/habits/{id}` | Delete a habit |
| PUT | `/habits/{id}/pause` | Pause a habit for N days |
| PUT | `/habits/{id}/resume` | Resume a paused habit immediately |
| PUT | `/habits/{id}/archive` | Archive or unarchive a habit |
| PUT | `/habits/sort-order` | Update display order for multiple habits |

### Habit Logs

| Method | Path | Description |
|--------|------|-------------|
| POST | `/habits/{id}/log` | Log a habit entry (upsert by habit + date) |
| GET | `/habits/{id}/activity?start=&end=` | Habit activity for a date range |
| GET | `/habits/{id}/streak` | Current and longest streak |

### User

| Method | Path | Description |
|--------|------|-------------|
| GET | `/user` | Get current user details |
| POST | `/user/push-token` | Register or update FCM push token |
| PUT | `/user/password` | Change password |
| GET | `/user/stats` | Aggregate stats (streaks, consistency, top habits) |
| GET | `/user/year-pixels` | 365-day completion data for heatmap |
| GET | `/user/weekly-review` | This week's habit performance |

### Streak Freeze

| Method | Path | Description |
|--------|------|-------------|
| GET | `/user/streak-freeze` | Available freeze count |
| POST | `/user/streak-freeze/use` | Use a freeze for a specific date |

### AI

| Method | Path | Description |
|--------|------|-------------|
| POST | `/ai/suggest` | Get AI habit suggestions based on a goal |
| GET | `/ai/insights` | Get AI-generated insights on current habits |

### Health

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Liveness check — returns 200 OK |

---

## Security Design

### Authentication Flow

```
Client                          Server
  │── POST /auth/login ─────────▶ Validate credentials
  │◀─ {accessToken, refreshToken}    (15 min / 7 day TTL)
  │
  │── GET /habits [Bearer accessToken] ──▶ JwtAuthenticationFilter validates
  │◀─ 200 OK
  │
  │── POST /auth/refresh [refreshToken] ──▶ Rotate: invalidate old, issue new pair
  │◀─ {accessToken, refreshToken}
```

Refresh tokens are stored hashed in the database. Reuse of an already-rotated token invalidates **all** tokens for that user — a signal of possible token theft.

### Filter Chain Order

```
RateLimitFilter          (per IP, 30 req/min, sliding window)
  → JwtAuthenticationFilter    (populate SecurityContext)
    → AiRateLimitFilter        (per user, 20 req/min, /ai/** only)
      → MdcLoggingFilter       (set requestId + userId in MDC)
        → Spring MVC dispatcher
```

### Error Response Format

All errors return a consistent JSON body:

```json
{
  "message": "Human-readable description",
  "status": 400,
  "code": "VALIDATION_ERROR",
  "timestamp": "2026-05-05T10:30:00"
}
```

Stable error codes: `USER_ALREADY_EXISTS` `USER_NOT_FOUND` `PASSWORD_MISMATCH` `HABIT_NOT_FOUND` `HABIT_LOG_NOT_FOUND` `ACCESS_DENIED` `DB_ERROR` `INVALID_STATE` `INVALID_ARGUMENT` `VALIDATION_ERROR` `INTERNAL_ERROR`

---

## Background Schedulers

| Scheduler | Schedule | Description |
|-----------|----------|-------------|
| `HabitStatusScheduler` | Every 5 min | Marks overdue habits as MISSED |
| `SchedulerService#sendHabitReminder` | Every 15 min | FCM reminders in each user's local timezone |
| `SchedulerService#autoResumeHabits` | Midnight IST | Resumes habits whose pause period has expired |
| `SchedulerService#awardStreakFreezes` | Midnight IST | Awards a freeze to users with a 7-day completion streak |
| `WeeklyDigestScheduler` | Sunday 8 AM IST | Sends AI-generated weekly recap via FCM |

---

## Swagger UI

Enable Swagger in development by setting `SWAGGER_ENABLED=true`, then open:

```
http://localhost:8080/swagger-ui.html
```

Keep this disabled in production (the default is `false`).

---

## Build

```bash
# Run tests
./mvnw test

# Build JAR
./mvnw clean package -DskipTests

# Build Docker image
docker build -t habitai-backend .
```
