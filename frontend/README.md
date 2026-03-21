# HabitAI Frontend

React Native mobile app for HabitAI built with Expo and TypeScript.

## Prerequisites

- Node.js 18+
- Expo CLI
- Expo Go app (for development)
- Android Studio or Xcode (for native builds)

## Getting Started

### 1. Clone the repository
```bash
git clone https://github.com/yourusername/HabitAI.git
cd HabitAI/frontend
```

### 2. Install dependencies
```bash
npm install
```

### 3. Add Firebase config files
- Download `google-services.json` from Firebase Console → Android app
- Download `GoogleService-Info.plist` from Firebase Console → iOS app
- Place both in the `frontend/` root directory

### 4. Update API base URL
In `constants/api.ts`, update the IP address to your machine's local IP:
```typescript
case "ios":
case "android":
  return "http://YOUR_LOCAL_IP:8080";
```

Find your local IP:
```bash
ifconfig | grep "inet " | grep -v 127.0.0.1
```

### 5. Start the app
```bash
npx expo start
```

- Press `w` for web browser
- Press `i` for iOS simulator
- Press `a` for Android emulator
- Scan QR code with Expo Go on physical device

## Project Structure
```
frontend/
├── app/                    # Expo Router screens
│   ├── index.tsx           # Login screen
│   ├── auth/               # Auth screens
│   │   └── register.tsx    # Register screen
│   └── (tabs)/             # Tab navigation
│       ├── home/           # Today's habits
│       ├── habits/         # Habit management
│       │   ├── create.tsx  # Create habit
│       │   └── [habitId]/  # Habit detail
│       │       ├── edit.tsx
│       │       └── activity.tsx
│       ├── calendar/       # Calendar view
│       └── profile/        # Profile & stats
├── components/             # Reusable components
│   ├── FormInput.tsx
│   ├── PrimaryButton.tsx
│   ├── SecondaryButton.tsx
│   ├── Chip.tsx
│   └── HabitCard.tsx
├── constants/              # App constants
│   ├── colors.ts           # Color palette
│   └── api.ts              # API endpoints
├── services/               # API service layer
│   ├── authService.ts      # Auth API calls
│   └── habitService.ts     # Habit API calls
├── types/                  # TypeScript types
│   └── habit.ts
└── utils/                  # Utility functions
    ├── authStorage.ts      # Token storage
    ├── formatters.ts       # Date/time formatters
    ├── validation.ts       # Form validation
    └── pushNotifications.ts # FCM registration
```

## App Flow

### Authentication Flow
```
App Launch
    ↓
Check stored JWT token
    ↓
Token exists? → Home screen
No token? → Login screen
    ↓
Login/Register → Save JWT → Home screen
```

### Habit Flow
```
Create Habit → Set frequency (Daily/Weekly/Monthly)
    ↓
Habit appears on Today screen
    ↓
Tap status badge → Mark COMPLETED
    ↓
Scheduler marks remaining habits MISSED after target time
    ↓
Activity screen shows history + heatmap
```

### Notification Flow
```
Login → Request notification permission
    ↓
Get FCM device token
    ↓
Save token to backend
    ↓
Backend scheduler sends reminders 15 mins before habit time
    ↓
Device receives push notification
```

## Screens

| Screen | Path | Description |
|--------|------|-------------|
| Login | `/` | JWT login with validation |
| Register | `/auth/register` | New user registration |
| Today | `/home` | Today's habits with status |
| Habits | `/habits` | All habits management |
| Create Habit | `/habits/create` | Create new habit |
| Edit Habit | `/habits/[id]/edit` | Edit existing habit |
| Activity | `/habits/[id]/activity` | Heatmap + streak history |
| Calendar | `/calendar` | Monthly calendar view |
| Profile | `/profile` | Stats dashboard |

## Environment Variables

No `.env` file needed for frontend. Configure directly in:
- `constants/api.ts` — API base URL
- `app.json` — Firebase config file paths

## Building for Production

Using EAS Build:
```bash
npm install -g eas-cli
eas login
eas build --platform ios
eas build --platform android
```

## Important Files (Never Commit)

The following files contain secrets and must NEVER be committed to GitHub:

| File | Description |
|---|---|
| `.env` | Environment variables (if used) |
| `google-services.json` | Firebase Android config |
| `GoogleService-Info.plist` | Firebase iOS config |

All are already in `.gitignore`. To set up locally:
1. Go to Firebase Console → Project Settings
2. Download `google-services.json` for Android app
3. Download `GoogleService-Info.plist` for iOS app
4. Place both in the `frontend/` root directory