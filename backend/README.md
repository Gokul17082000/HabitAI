# HabitAI Backend

Spring Boot REST API for the HabitAI habit tracking application.

## Prerequisites

- Java 21+
- PostgreSQL 14+
- Maven 3.8+
- Firebase project with Admin SDK credentials

## Getting Started

### 1. Clone the repository
```bash
git clone https://github.com/yourusername/HabitAI.git
cd HabitAI/backend
```

### 2. Create PostgreSQL database
```sql
CREATE DATABASE habitai;
```

### 3. Create `.env` file
```env
DB_URL=jdbc:postgresql://localhost:5432/habitai
DB_USERNAME=your_db_username
DB_PASSWORD=your_db_password
JWT_SECRET=your_generated_secret
JWT_EXPIRATION=86400000
DDL_AUTO=update
CORS_ORIGIN_1=http://localhost:8081
CORS_ORIGIN_2=http://your_local_ip:8081
CORS_ORIGIN_3=http://your_local_ip:19006
FIREBASE_SERVICE_ACCOUNT=src/main/resources/firebase-service-account.json
```

Generate a strong JWT secret:
```bash
openssl rand -base64 32
```

### 4. Add Firebase service account
- Go to Firebase Console → Project Settings → Service Accounts
- Click **Generate new private key**
- Save as `src/main/resources/firebase-service-account.json`

### 5. Run the application
```bash
mvn spring-boot:run
```

The server starts on `http://localhost:8080`

## API Documentation

Swagger UI available at:
```
http://localhost:8080/swagger-ui/index.html
```

## Project Structure
```
src/main/java/com/habitai/
├── auth/              # Authentication (login, register, JWT)
├── common/            # Shared utilities (CurrentUser, FirebaseConfig)
│   ├── security/      # UserPrincipal, CurrentUser
│   └── validation/    # HabitAccessValidator
├── exception/         # Global exception handling
├── habit/             # Habit CRUD
├── habitlog/          # Habit logging, streaks, activity
├── notification/      # FCM push notifications
├── scheduler/         # Scheduled jobs (MISSED status, reminders)
├── security/          # JWT filter, Spring Security config
└── user/              # User profile, stats
```

## API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/register` | Register new user |
| POST | `/auth/login` | Login and get JWT token |

### Habits
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/habits` | Get habits for a date |
| GET | `/habits/all` | Get all habits |
| GET | `/habits/{id}` | Get habit by ID |
| POST | `/habits` | Create habit |
| PUT | `/habits/{id}` | Update habit |
| DELETE | `/habits/{id}` | Delete habit |

### Habit Logs
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/habits/{id}/log` | Log habit status |
| GET | `/habits/{id}/streak` | Get current streak |
| GET | `/habits/{id}/streak/longest` | Get longest streak |
| GET | `/habits/{id}/activity` | Get activity history |

### User
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/user` | Get user details |
| GET | `/user/stats` | Get user stats dashboard |
| POST | `/user/push-token` | Save FCM push token |

## Scheduled Jobs

| Job | Schedule | Description |
|-----|----------|-------------|
| `updateMissedHabits` | Every 5 minutes | Marks overdue habits as MISSED |
| `sendHabitReminder` | Every 15 minutes | Sends FCM push notifications |

## Environment Variables Reference

| Variable | Description | Default |
|----------|-------------|---------|
| `DB_URL` | PostgreSQL connection URL | `jdbc:postgresql://localhost:5432/habitai` |
| `DB_USERNAME` | Database username | `gokulbj` |
| `DB_PASSWORD` | Database password | _(empty)_ |
| `JWT_SECRET` | JWT signing secret | _(required)_ |
| `JWT_EXPIRATION` | JWT expiration in ms | `86400000` (24h) |
| `DDL_AUTO` | Hibernate DDL mode | `update` |
| `CORS_ORIGIN_1` | Allowed CORS origin 1 | `http://localhost:8081` |
| `FIREBASE_SERVICE_ACCOUNT` | Path to Firebase service account JSON | `src/main/resources/firebase-service-account.json` |

## Important Files (Never Commit)

The following files contain secrets and must NEVER be committed to GitHub:

| File | Description |
|---|---|
| `.env` | Environment variables |
| `src/main/resources/firebase-service-account.json` | Firebase Admin SDK credentials |

Both are already in `.gitignore`. To set up locally:
1. Create `.env` from the template below
2. Download Firebase service account from Firebase Console → Project Settings → Service Accounts → Generate new private key
3. Save as `src/main/resources/firebase-service-account.json`