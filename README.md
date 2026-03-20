# HabitAI

A full-stack habit tracking application built with Spring Boot and React Native (Expo). HabitAI helps you build and maintain daily habits with streak tracking, activity history, and smart notifications.

## Project Structure
```
HabitAI/
├── backend/          # Spring Boot REST API
└── frontend/         # React Native (Expo) mobile app
```

## Features

- **Authentication** — Secure JWT-based login and registration
- **Habit Management** — Create, edit and delete habits with daily, weekly or monthly schedules
- **Smart Scheduling** — Habits automatically marked as MISSED when target time passes
- **Habit Logging** — Log completions and undo them
- **Streak Tracking** — Current and longest streak per habit
- **Activity Heatmap** — GitHub-style contribution graph per habit
- **Calendar View** — Full monthly calendar with habit status dots
- **Profile Dashboard** — Overall stats, consistency %, top habits
- **Push Notifications** — FCM-powered reminders before habit target time

## Tech Stack

### Backend
- Java 21 + Spring Boot 4.0
- Spring Security + JWT
- PostgreSQL + Spring Data JPA
- Firebase Admin SDK
- Scheduled tasks for automation

### Frontend
- React Native + Expo (SDK 53)
- Expo Router (file-based navigation)
- TypeScript
- AsyncStorage for token persistence
- Firebase Cloud Messaging

## Architecture
```
┌─────────────────────────────────────────┐
│              React Native App            │
│         (Expo Router + TypeScript)       │
└──────────────────┬──────────────────────┘
                   │ REST API (HTTP/JSON)
                   │ JWT Authentication
┌──────────────────▼──────────────────────┐
│           Spring Boot Backend            │
│     (REST API + Security + Scheduler)    │
└──────┬──────────────────────┬───────────┘
       │                      │
┌──────▼──────┐    ┌──────────▼──────────┐
│ PostgreSQL  │    │   Firebase FCM       │
│  Database   │    │  (Push Notifications)│
└─────────────┘    └─────────────────────┘
```

## Getting Started

See individual README files for setup instructions:
- [Backend Setup](./backend/README.md)
- [Frontend Setup](./frontend/README.md)

## API Documentation

Once the backend is running, visit:
```
http://localhost:8080/swagger-ui/index.html
```

## Environment Variables

See [backend/README.md](./backend/README.md) and [frontend/README.md](./frontend/README.md) for required environment variables.