# 📌 HabitAI – Habit Tracking & Reminder Backend

HabitAI is a **backend system for habit tracking**, streak calculation, activity visualization, and scheduled reminders.
It is designed with **clean architecture**, **JWT-based authentication**, and **scalable modules**.

---

## 🚀 Features

### ✅ Authentication & Security

* User registration & login
* JWT-based stateless authentication
* Secure access to user-specific resources
* Centralized exception handling

### ✅ Habit Management

* Create, update, delete habits
* Habit frequency support (DAILY, WEEKLY, MONTHLY)
* Per-habit target time
* User-specific habit isolation

### ✅ Habit Logs

* Daily habit status logging
* Prevents duplicate logs per day
* Supported statuses:

    * `COMPLETED`
    * `MISSED`
    * `PENDING`
    * `PARTIALLY_COMPLETED`

### ✅ Streak Tracking

* Calculates **current streak** for a habit
* Automatically breaks streak on missed day

### ✅ Habit Activity Graph

* Returns activity between a date range
* Fills missing dates automatically with `MISSED` / `PENDING`
* Backend-driven consistency (frontend stays simple)

### ✅ Reminder System

* Scheduled reminders before habit time
* Centralized reminder offset (30 minutes)
* Central scheduler with notification abstraction
* Prevents duplicate reminders per day

---

## 🧱 Architecture Overview

```
├── auth            → Authentication & JWT
├── security        → JWT filter & security config
├── habit           → Habit CRUD
├── habitlog        → Logs, streaks, activity
├── notification    → Notification abstraction
├── scheduler       → Reminder scheduler
├── common
│   ├── security    → CurrentUser, UserPrincipal
│   └── validation  → Access validators
└── exception       → Global exception handling
```

---

## 🔐 Authentication Flow

1. User logs in → JWT token issued
2. Token sent in `Authorization` header:

   ```
   Authorization: Bearer <JWT_TOKEN>
   ```
3. `JwtAuthenticationFilter`:

    * Validates token
    * Extracts `userId`
    * Sets authenticated `UserPrincipal`
4. `CurrentUser` provides userId across services

---

## 📦 API Endpoints

### 🔑 Auth

| Method | Endpoint         | Description     |
|--------|------------------|-----------------|
| POST   | `/auth/register` | Register user   |
| POST   | `/auth/login`    | Login & get JWT |

---

### 🧠 Habits

| Method | Endpoint       | Description    |
|--------|----------------|----------------|
| GET    | `/habits`      | Get all habits |
| POST   | `/habits`      | Create habit   |
| PUT    | `/habits/{id}` | Update habit   |
| DELETE | `/habits/{id}` | Delete habit   |

---

### 📊 Habit Logs

| Method | Endpoint                | Description                |
|--------|-------------------------|----------------------------|
| POST   | `/habits/{id}/log`      | Log today’s status         |
| GET    | `/habits/{id}/streak`   | Get current streak         |
| GET    | `/habits/{id}/activity` | Get activity by date range |

---

## ⏰ Reminder System

* Scheduler runs **at the 45th minute of every hour**
* Finds habits whose reminder time falls in current window
* Sends notification

### Reminder Time Formula

```
reminderTime = targetTime - reminderOffsetMinutes
```

---

## 🧪 Validation & Error Handling

* Bean validation on request DTOs
* Centralized `@RestControllerAdvice`
* Consistent error response format:

```json
{
  "message": "Habit not found",
  "status": 404,
  "timestamp": "2025-01-01T10:15:30"
}
```

---

## 🛠 Tech Stack

* **Java 21**
* **Spring Boot 4 (Spring Framework 7)**
* **Spring Security**
* **JWT (jjwt)**
* **Spring Data JPA**
* **Hibernate**
* **PostgreSQL**
* **Lombok**
* **Maven**

---

## 🧩 Design Decisions (Why this way?)

* Records used for immutable responses
* Validators extracted to avoid duplication
* Scheduler decoupled from notification delivery
* Backend controls streak & activity logic
* No unnecessary bidirectional JPA mappings
* No overuse of annotations (`@Transactional` only when needed)

---

## 🔮 Future Enhancements

* User preferred reminder offset time
* Push notifications (FCM)
* Email reminders
* User notification preferences
* Habit analytics dashboard
* Web / Mobile frontend
* Async messaging (Kafka / SQS)
* Caching streaks for performance

---

## 🧠 Author Notes

This project is intentionally built with:

* **Clarity over cleverness**
* **Explicit logic over magic**
* **Scalability without premature optimization**

---