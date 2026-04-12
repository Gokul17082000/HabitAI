# HabitAI — Frontend

React Native mobile app (Expo) for HabitAI. File-based navigation with Expo Router, TypeScript throughout, and Firebase Cloud Messaging for push notifications.

---

## Prerequisites

| Requirement | Notes |
|---|---|
| Node.js 20+ | |
| Expo CLI | `npm install -g expo-cli` |
| Expo Go app | For quick device testing (limited — see note below) |
| Android Studio or Xcode | For full native builds |
| EAS CLI | `npm install -g eas-cli` — for cloud builds and OTA updates |

> **Note on Expo Go**: This app uses `@react-native-firebase/messaging` which requires a custom native build. Expo Go will not work. Use a [development build](#development-build) instead.

---

## Local setup

### 1. Install dependencies

```bash
cd HabitAI/frontend
npm install
```

### 2. Configure your local API host

The app reads the backend URL from `app.json`. Open `app.json` and set `extra.devApiHost` to your machine's local IP:

```json
{
  "expo": {
    "extra": {
      "devApiHost": "192.168.x.x"
    }
  }
}
```

Find your IP with `ipconfig` (Windows) or `ifconfig` / `ip a` (macOS/Linux). The backend must be reachable from your device on port `8080`.

In production, the app points to `https://habitai-knma.onrender.com` automatically when `__DEV__` is false.

### 3. Add Firebase config

1. Open the [Firebase Console](https://console.firebase.google.com) → your project → **Project Settings** → **Your apps**
2. Download `google-services.json` (Android) and/or `GoogleService-Info.plist` (iOS)
3. Place them in the `frontend/` root directory

These files are in `.gitignore`. For CI/CD (EAS), base64-encode the file and store it as an EAS secret — the `generate-google-services.js` pre-install script handles decoding automatically:

```bash
# Encode the file
base64 -i google-services.json | tr -d '\n'
# Store the output as EAS secret: GOOGLE_SERVICES_JSON
```

### 4. Create a development build

Development builds include the native Firebase module that Expo Go doesn't support.

**Android (via EAS cloud):**

```bash
eas build --profile development --platform android
```

**Android (local build — requires Android Studio):**

```bash
npx expo run:android
```

**iOS (local build — requires Xcode on macOS):**

```bash
npx expo run:ios
```

Install the resulting `.apk` / `.app` on your device or emulator, then start the dev server:

```bash
npm start
```

---

## Project structure

```
frontend/
├── app/                          # Expo Router screens (file = route)
│   ├── index.tsx                 # Entry — redirects to login or home
│   ├── onboarding.tsx            # First-launch onboarding screen
│   ├── _layout.tsx               # Root layout, token check, push setup
│   ├── auth/
│   │   ├── _layout.tsx
│   │   └── register.tsx          # Registration screen
│   └── (tabs)/                   # Bottom tab navigator
│       ├── _layout.tsx           # Tab bar config
│       ├── home/
│       │   └── index.tsx         # Today's habits — live status, log actions
│       ├── habits/
│       │   ├── index.tsx         # All habits — manage, pause, archive, AI suggest
│       │   ├── create.tsx        # Create habit form
│       │   ├── ai-review.tsx     # AI habit suggestions from goal input
│       │   ├── _layout.tsx
│       │   └── [habitId]/
│       │       ├── edit.tsx      # Edit habit form
│       │       └── activity.tsx  # Per-habit activity log + streak + heatmap
│       ├── calendar/
│       │   └── index.tsx         # Monthly calendar — tap date to see habits
│       └── profile/
│           ├── index.tsx         # Stats dashboard, year heatmap, top habits
│           ├── weekly-review.tsx # This week's performance + AI coaching note
│           └── use-freeze.tsx    # Streak freeze usage
├── components/
│   ├── CelebrationModal.tsx      # Confetti on habit completion
│   ├── Chip.tsx                  # Category/filter pill
│   ├── FormInput.tsx             # Controlled text input with error state
│   ├── HabitCard.tsx             # Today's habit row with log button
│   ├── ManageHabitCard.tsx       # Habit management card (pause, archive, delete)
│   ├── MilestoneBadges.tsx       # Streak milestone badge display
│   ├── PrimaryButton.tsx         # Full-width primary CTA button
│   ├── SecondaryButton.tsx       # Outline secondary button
│   ├── SkeletonCard.tsx          # Loading placeholder
│   └── YearHeatmap.tsx           # 52-week contribution graph
├── constants/
│   ├── api.ts                    # Base URL logic + all endpoint paths
│   └── colors.ts                 # Design tokens
├── services/
│   ├── authService.ts            # Login, register, logout, user stats APIs
│   ├── habitService.ts           # Full habit + habit log API layer
│   └── aiService.ts              # AI suggest + AI insights APIs
├── types/
│   └── habit.ts                  # TypeScript types for habits and logs
└── utils/
    ├── apiHandler.ts             # Central fetch handler, 401 auto-refresh
    ├── authStorage.ts            # SecureStore wrapper for tokens
    ├── formatters.ts             # Date and time formatting helpers
    ├── onboardingStorage.ts      # AsyncStorage for onboarding flag
    ├── pushNotifications.ts      # FCM token registration + permission request
    ├── pushNotifications.web.ts  # Web stub (notifications not supported on web)
    └── validation.ts             # Form validation helpers
```

---

## Navigation

The app uses Expo Router's file-based routing. The flow on launch:

```
app/index.tsx
  ├── No token → app/auth/ (login)
  │   └── No account → app/auth/register
  ├── First launch → app/onboarding.tsx
  └── Authenticated → app/(tabs)/home/
```

Deep links follow the file path: `habitai://habits/123/activity` maps to `app/(tabs)/habits/[habitId]/activity.tsx`.

---

## Auth and token handling

Tokens are stored in `expo-secure-store` (encrypted on-device storage). The `apiHandler.ts` utility wraps every authenticated request with automatic access token refresh on 401:

- A shared `refreshPromise` ensures concurrent 401s don't each trigger a separate refresh — they all await the same single refresh call.
- If the refresh fails (expired or revoked), tokens are cleared and the user is redirected to login.
- Auth endpoints (login, register, refresh) are never retried to avoid refresh loops.

---

## Push notifications

Push notification setup runs in `app/_layout.tsx` on first authenticated load:

1. Requests notification permission from the user
2. Gets the FCM device token via `@react-native-firebase/messaging`
3. Registers the token with the backend at `POST /user/push-token`

The backend then uses this token to send:

- **Habit reminders** — 15 minutes before each habit's target time
- **Weekly digest** — Sunday 8 AM IST with an AI-generated recap

Notifications on web are stubbed out (`pushNotifications.web.ts` exports no-ops).

---

## Key scripts

| Command | Description |
|---|---|
| `npm start` | Start Metro bundler (requires a dev build on device) |
| `npm run android` | Local Android build and launch |
| `npm run ios` | Local iOS build and launch (macOS only) |
| `npm run web` | Start web version (push notifications not supported) |
| `npm run lint` | Run ESLint |
| `eas build --platform android` | Cloud build for Android |
| `eas build --platform ios` | Cloud build for iOS |
| `eas update` | Push an OTA JavaScript update |

---

## Environment and configuration

There are no `.env` files in the frontend. Configuration is handled through:

| Config | Location | Used for |
|---|---|---|
| `extra.devApiHost` | `app.json` | Local backend IP in dev mode |
| `google-services.json` | `frontend/` root | Android Firebase config |
| `GoogleService-Info.plist` | `frontend/` root | iOS Firebase config |
| `GOOGLE_SERVICES_JSON` | EAS secret | Base64 Google Services for CI builds |

The `generate-google-services.js` script decodes the EAS secret back into `google-services.json` during the EAS pre-install step.

---

## Building for production

### Android

```bash
eas build --profile production --platform android
```

### iOS

```bash
eas build --profile production --platform ios
```

Build profiles are defined in `eas.json`. OTA updates (JavaScript-only changes) can be pushed without a new store submission:

```bash
eas update --branch production --message "Fix streak calculation"
```

---

## Files that must never be committed

| File | Contains |
|---|---|
| `google-services.json` | Firebase Android config (includes API keys) |
| `GoogleService-Info.plist` | Firebase iOS config (includes API keys) |

Both are in `.gitignore`. Use EAS secrets for CI/CD instead.