# HabitAI — Frontend

React Native mobile app (Expo 54) for HabitAI. File-based navigation with Expo Router, TypeScript throughout, dark mode, and Firebase Cloud Messaging for push notifications.

---

## Tech Stack

| Technology | Version | Purpose |
|-----------|---------|---------|
| React Native | 0.81.5 | Mobile UI runtime |
| Expo | ~54.0.33 | Build framework and tooling |
| Expo Router | ~6.0.23 | File-based navigation |
| TypeScript | ~5.9.2 | Static typing |
| Firebase Messaging | ^23.8.8 | Push notifications (FCM) |
| React Navigation | ^7.x | Tab and stack navigation |
| expo-secure-store | ~14.0.1 | Encrypted token storage |
| AsyncStorage | 2.2.0 | Lightweight local state |
| React Native Reanimated | ~4.1.1 | Animations |

---

## Prerequisites

| Requirement | Notes |
|---|---|
| Node.js 20+ | |
| Expo CLI | `npm install -g expo-cli` |
| EAS CLI | `npm install -g eas-cli` — for cloud builds |
| Android Studio or Xcode | For local native builds |

> **Expo Go is not supported.** This app uses `@react-native-firebase/messaging` which requires a custom native build. Use a [development build](#development-build) instead.

---

## Local Setup

### 1. Install dependencies

```bash
cd frontend
npm install
```

### 2. Configure the backend host

Open `app.json` and set `extra.devApiHost` to your machine's local IP address:

```json
{
  "expo": {
    "extra": {
      "devApiHost": "192.168.x.x"
    }
  }
}
```

Find your IP with `ifconfig` (macOS/Linux) or `ipconfig` (Windows). The device must be able to reach your machine on port `8080`.

In production (`__DEV__ === false`), the app automatically uses `https://habitai-knma.onrender.com`.

### 3. Add Firebase config files

1. Open [Firebase Console](https://console.firebase.google.com) → Project Settings → Your apps
2. Download `google-services.json` (Android) and/or `GoogleService-Info.plist` (iOS)
3. Place them in the `frontend/` root directory

These files are in `.gitignore`. For CI/CD builds via EAS, encode the file as a secret:

```bash
# Encode
base64 -i google-services.json | tr -d '\n'
# Store the output as EAS secret: GOOGLE_SERVICES_JSON
```

The `generate-google-services.js` pre-install script decodes it back automatically during EAS builds.

### 4. Create a development build

Development builds include the native Firebase module that Expo Go lacks.

**Via EAS (cloud build — recommended):**

```bash
eas build --profile development --platform android
eas build --profile development --platform ios
```

**Local Android build (requires Android Studio):**

```bash
npx expo run:android
```

**Local iOS build (requires Xcode, macOS only):**

```bash
npx expo run:ios
```

Install the resulting `.apk` or `.app` on your device or emulator, then start the dev server:

```bash
npm start
```

---

## Project Structure

```
frontend/
├── app/                              # Expo Router screens (file path = route)
│   ├── index.tsx                     # Entry — redirects to login or home
│   ├── onboarding.tsx                # First-launch onboarding
│   ├── _layout.tsx                   # Root layout: token check, push token setup
│   ├── auth/
│   │   ├── _layout.tsx
│   │   └── register.tsx              # Login and registration screen
│   └── (tabs)/                       # Bottom tab navigator
│       ├── _layout.tsx               # Tab bar config
│       ├── home/
│       │   └── index.tsx             # Today's habits — live status, log actions
│       ├── habits/
│       │   ├── index.tsx             # All habits — manage, pause, archive, AI suggest
│       │   ├── create.tsx            # Create habit form
│       │   ├── ai-review.tsx         # Review and edit AI-suggested habits
│       │   ├── _layout.tsx
│       │   └── [habitId]/
│       │       ├── edit.tsx          # Edit habit form
│       │       └── activity.tsx      # Per-habit activity log + streak + heatmap
│       ├── calendar/
│       │   └── index.tsx             # Monthly calendar — tap date to see habits
│       └── profile/
│           ├── index.tsx             # Stats dashboard, year heatmap, top habits
│           ├── settings.tsx          # Account settings (password change)
│           ├── weekly-review.tsx     # This week's performance + AI coaching note
│           └── use-freeze.tsx        # Streak freeze usage
│
├── components/
│   ├── CelebrationModal.tsx          # Celebration animation on habit completion
│   ├── Chip.tsx                      # Category/filter pill
│   ├── FormInput.tsx                 # Controlled input with error state and password toggle
│   ├── HabitCard.tsx                 # Today's habit row with log button and count controls
│   ├── HabitForm.tsx                 # Shared create/edit form (DRY)
│   ├── ManageHabitCard.tsx           # Habit management card (pause, archive, delete)
│   ├── MilestoneBadges.tsx           # Streak milestone badge display
│   ├── PrimaryButton.tsx             # Full-width primary CTA button
│   ├── SecondaryButton.tsx           # Outline secondary button
│   ├── SkeletonCard.tsx              # Loading placeholder with shimmer
│   └── YearHeatmap.tsx               # 52-week contribution heatmap
│
├── constants/
│   ├── api.ts                        # Base URL logic + all API endpoint paths
│   └── colors.ts                     # Design tokens (light and dark palettes)
│
├── context/
│   └── ThemeContext.tsx              # Dark/light theme state
│
├── services/
│   ├── authService.ts                # Login, register, logout, user stats APIs
│   ├── habitService.ts               # Habit CRUD, logging, streaks, activity
│   └── aiService.ts                  # AI suggest + AI insights APIs
│
├── types/
│   └── habit.ts                      # TypeScript types for habits, logs, enums
│
└── utils/
    ├── apiHandler.ts                 # Central fetch wrapper with 401 auto-refresh
    ├── authStorage.ts                # expo-secure-store wrapper for tokens
    ├── formatters.ts                 # Date and time formatting helpers
    ├── onboardingStorage.ts          # AsyncStorage wrapper for onboarding flag
    ├── pushNotifications.ts          # FCM token registration + permission request
    ├── pushNotifications.web.ts      # Web stub (no-ops — notifications unsupported on web)
    └── validation.ts                 # Form validation helpers
```

---

## Navigation

The app uses Expo Router's file-based routing. The flow on first load:

```
app/index.tsx
  ├── No token found → app/auth/register.tsx    (login / register)
  ├── First launch   → app/onboarding.tsx
  └── Authenticated  → app/(tabs)/home/index.tsx
```

Deep links follow the file path. Example: `habitai://habits/123/activity` maps to `app/(tabs)/habits/[habitId]/activity.tsx`.

---

## Auth and Token Handling

Tokens are stored in `expo-secure-store` (encrypted on-device). Every authenticated request goes through `utils/apiHandler.ts`, which:

1. Attaches the access token to the `Authorization` header
2. On a `401` response, automatically calls `POST /auth/refresh` to get a new token pair
3. Retries the original request once with the new token
4. If refresh fails (expired or revoked), clears storage and redirects to login

A shared `refreshPromise` ensures that if multiple concurrent requests hit a `401`, only one refresh call is made — all requests wait for and share the result.

---

## Push Notifications

Setup runs in `app/_layout.tsx` on first authenticated load:

1. Requests permission from the user
2. Gets the FCM device token via `@react-native-firebase/messaging`
3. Sends the token to the backend at `POST /user/push-token`

The backend then uses this token to send:

- **Habit reminders** — 15 minutes before each habit's target time (timezone-aware per user)
- **Weekly digest** — Sunday 8 AM IST with an AI-generated recap

Notifications are stubbed out on web (`pushNotifications.web.ts` exports no-ops).

---

## Theme and Dark Mode

The app supports system-level dark/light mode via `context/ThemeContext.tsx`. All colors come from `constants/colors.ts` via the `useTheme()` hook — hardcoded color values are never used directly in components. This ensures every screen and component responds correctly to the system theme.

---

## Key Scripts

| Command | Description |
|---|---|
| `npm start` | Start Metro bundler (requires dev build installed on device) |
| `npm run android` | Local Android build and launch |
| `npm run ios` | Local iOS build and launch (macOS only) |
| `npm run web` | Start web version (push notifications not supported) |
| `npm run lint` | Run ESLint |
| `eas build --platform android` | Cloud Android build |
| `eas build --platform ios` | Cloud iOS build |
| `eas update` | Push an OTA JavaScript-only update |

---

## Configuration Reference

There are no `.env` files. Configuration is handled through:

| Config | Location | Used for |
|---|---|---|
| `extra.devApiHost` | `app.json` | Local backend IP in dev mode |
| `google-services.json` | `frontend/` root | Android Firebase config |
| `GoogleService-Info.plist` | `frontend/` root | iOS Firebase config |
| `GOOGLE_SERVICES_JSON` | EAS secret | Base64 Google Services for CI builds |

---

## Building for Production

### Android

```bash
eas build --profile production --platform android
```

### iOS

```bash
eas build --profile production --platform ios
```

Build profiles are defined in `eas.json`. JavaScript-only changes can be shipped without a new store submission:

```bash
eas update --branch production --message "Fix streak calculation"
```

---

## Files That Must Not Be Committed

| File | Contains |
|---|---|
| `google-services.json` | Firebase Android config (includes API keys) |
| `GoogleService-Info.plist` | Firebase iOS config (includes API keys) |

Both are in `.gitignore`. Use EAS secrets for CI/CD instead.
