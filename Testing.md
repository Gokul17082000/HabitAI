# HabitAI — Testing Guide

Exhaustive test scenarios covering **every** feature and code path. Each row lists the scenario, steps to reproduce, and the expected result. This is the single source of truth for what must be tested — if a code branch exists, there is a scenario here for it.

Sections marked **[Regression]** cover previously-fixed bugs — these must never break again.
Sections marked **[Security]** cover the hardening fixes and must be verified on every auth change.

---

## Setup

- **Base URL:** your backend URL (e.g. `http://localhost:8080`)
- **Auth:** all requests except `/auth/login`, `/auth/register`, `/auth/refresh`, `/health` require `Authorization: Bearer <accessToken>`
- **Tool:** Postman, curl, or the app UI — steps are written for both where relevant
- **Timezone note:** the backend does all date math in each user's stored timezone (default `Asia/Kolkata`). Where a test says "today"/"yesterday", it means in the user's timezone.

---

## 1. Authentication

### 1.1 Register

| # | Scenario | Steps | Expected |
|---|----------|-------|----------|
| 1.1.1 | Successful registration | `POST /auth/register` `{ "email": "user@test.com", "password": "Password1!" }` | 201, `{ "message": "User Successfully created!" }` |
| 1.1.2 | Email normalized (lowercase + trim) | Register `  User@Test.com  `; then login `user@test.com` | Stored lowercase & trimmed; login resolves to same account |
| 1.1.3 | Duplicate email (pre-check) | Register the same email twice | Second → 409 "User already exists!" (NOT 500) |
| 1.1.4 | **[Regression]** Concurrent duplicate registration | Fire two simultaneous registers with same email (race past the `findByEmail` check) | The DB unique-constraint violation is caught (cause contains "unique"/"duplicate"/"uk_user_email") → 409 "already exists", not 500 |
| 1.1.5 | DB error with unrelated cause | Simulate a `DataIntegrityViolationException` whose cause is NOT a unique violation | 500 "A database error occurred. Please try again." (DatabaseException, not user-exists) |
| 1.1.6 | DB error with null cause message | Same but cause message is null | Falls through to 500 DatabaseException (no NPE) |
| 1.1.7 | Weak password — too short | password `Abc1!` (< 8) | 400 validation error |
| 1.1.8 | Weak password — no uppercase | `password1!` | 400 |
| 1.1.9 | Weak password — no lowercase | `PASSWORD1!` | 400 |
| 1.1.10 | Weak password — no digit | `Password!` | 400 |
| 1.1.11 | Weak password — no special char | `Password1` | 400 |
| 1.1.12 | Missing email | `{ "password": "Password1!" }` | 400 |
| 1.1.13 | Missing password | `{ "email": "user@test.com" }` | 400 |
| 1.1.14 | Invalid email format | `{ "email": "notanemail", ... }` | 400 |
| 1.1.15 | Malformed JSON body | Send `{ "email": ` (broken JSON) | **[Security]** 400 "Malformed request body." (NOT 500) |

### 1.2 Login

| # | Scenario | Steps | Expected |
|---|----------|-------|----------|
| 1.2.1 | Successful login | Valid credentials | 200, `accessToken` + `refreshToken`; any prior refresh tokens for the user are deleted first |
| 1.2.2 | **[Security]** Wrong password | Correct email, wrong password | 401 "Invalid email or password." (`PASSWORD_MISMATCH`) |
| 1.2.3 | **[Security]** Unknown email — no enumeration | Email that isn't registered | 401 with the **identical** message/code as 1.2.2 (NOT 404, NOT a different message) |
| 1.2.4 | **[Security]** Constant-time on unknown email | Unknown email login | A dummy BCrypt comparison still runs so response time matches the found-user path (no timing side-channel) |
| 1.2.5 | Email trimming | Login with `  user@test.com  ` | Succeeds — trimmed |
| 1.2.6 | Case-insensitive email | Login with `USER@TEST.COM` | Succeeds |
| 1.2.7 | Multiple logins invalidate old refresh tokens | Login twice; use the first refresh token | First refresh token → 401 (deleted on second login) |
| 1.2.8 | Missing fields | Empty email or password | 400 validation error |

### 1.3 Token Refresh

| # | Scenario | Steps | Expected |
|---|----------|-------|----------|
| 1.3.1 | Valid refresh | `POST /auth/refresh` with valid refresh token | 200, new `accessToken` + new `refreshToken` |
| 1.3.2 | Rotation invalidates old | Use the new token from 1.3.1; then replay the old one | Old token → 401; new token works |
| 1.3.3 | **[Regression]** Reuse detection | Replay a token already marked used | 401 "already used"; **all** refresh tokens for that user are deleted |
| 1.3.4 | Expired stored token | Stored token past its `expiresAt` | 401 "expired"; that token row is deleted |
| 1.3.5 | Invalid JWT signature/format | Garbage string as refresh token | 401 "Invalid or expired refresh token." (fails `isValidRefreshToken` before DB) |
| 1.3.6 | Valid JWT but not in DB | Well-formed refresh JWT that was never stored (or purged) | 401 "Refresh token not recognised." |
| 1.3.7 | Access token used as refresh | Send an access-type JWT to `/refresh` | 401 (type claim is "access", not "refresh") |
| 1.3.8 | **[Security]** Tokens hashed at rest | Inspect `refresh_tokens.token` in DB after login | Column holds a 64-char SHA-256 hash, NOT the raw JWT; refresh still succeeds (server hashes the incoming token to look it up) |
| 1.3.9 | **[Security]** Deploy invalidates legacy raw tokens | After the V12 migration runs | `refresh_tokens` is cleared once; users must log in again; no raw tokens remain at rest |
| 1.3.10 | User deleted after token issued | Valid, unused refresh token but user row gone | `UserNotFoundException` (404) |

### 1.4 Logout

| # | Scenario | Steps | Expected |
|---|----------|-------|----------|
| 1.4.1 | Successful logout | `POST /auth/logout` with valid access token | 204; all refresh tokens for the user deleted |
| 1.4.2 | Refresh blocked after logout | Logout, then `POST /auth/refresh` with old refresh token | 401 |
| 1.4.3 | Logout without token | No Authorization header | 401 (authenticated endpoint) |

### 1.5 Change Password (`PUT /user/password`)

| # | Scenario | Steps | Expected |
|---|----------|-------|----------|
| 1.5.1 | Successful change | Correct current + valid, different new password | 204; old password no longer logs in; new one does |
| 1.5.2 | Wrong current password | Incorrect `currentPassword` | 400 "Current password is incorrect" |
| 1.5.3 | **[Regression]** New == current | Same value for current and new | 400 "New password must differ from the current password" |
| 1.5.4 | Weak new password | New fails strength (missing upper/lower/digit/special/<8) | 400 |
| 1.5.5 | User not found | Authenticated userId no longer exists | 404 UserNotFound |
| 1.5.6 | UI: empty fields | Submit Settings form empty | Inline errors; no API call |
| 1.5.7 | UI: mismatch confirm | New ≠ confirm in UI | Error shown before API call |
| 1.5.8 | UI: success state | Valid change in UI | Success banner; all three fields clear |

---

## 2. Habit Management

### 2.1 Create Habit

| # | Scenario | Steps | Expected |
|---|----------|-------|----------|
| 2.1.1 | Daily habit | `POST /habits` `frequency: DAILY` | 201 with correct fields |
| 2.1.2 | Weekly habit | `WEEKLY`, `daysOfWeek: ["MONDAY","WEDNESDAY","FRIDAY"]` | 201 |
| 2.1.3 | Monthly habit | `MONTHLY`, `daysOfMonth: [1,15]` | 201 |
| 2.1.4 | Weekly without days | `WEEKLY`, no/empty `daysOfWeek` | 400 |
| 2.1.5 | Monthly without days | `MONTHLY`, no/empty `daysOfMonth` | 400 |
| 2.1.6 | Invalid month day | `daysOfMonth: [0]` or `[32]` | 400 |
| 2.1.7 | Countable habit | `isCountable: true`, `targetCount: 8` | 201; home shows count controls |
| 2.1.8 | Title too long | Title > 100 chars | 400 |
| 2.1.9 | Missing required fields | No title / no frequency | 400 |
| 2.1.10 | `createdAt` set to today | Create and inspect | `createdAt` = today (user zone); habit appears today |

### 2.2 Edit Habit

| # | Scenario | Steps | Expected |
|---|----------|-------|----------|
| 2.2.1 | Change title | `PUT /habits/{id}` new title | 204; reflected in list |
| 2.2.2 | Change frequency DAILY→WEEKLY | Provide `daysOfWeek` | 204; only appears on those days |
| 2.2.3 | Lower targetCount recomputes today | Countable habit logged count ≥ new target | Today's log status recomputed to COMPLETED |
| 2.2.4 | **[IDOR]** Edit another user's habit | Use another user's habitId | 403 |
| 2.2.5 | Edit non-existent habit | `PUT /habits/99999` | 404 |
| 2.2.6 | `createdAt` unchanged | Edit any field | `createdAt` stays the same |

### 2.3 Delete Habit

| # | Scenario | Steps | Expected |
|---|----------|-------|----------|
| 2.3.1 | Delete own habit | `DELETE /habits/{id}` | 204; habit gone; all its logs deleted |
| 2.3.2 | **[IDOR]** Delete another user's habit | Another user's id | 403 |
| 2.3.3 | Delete non-existent | `DELETE /habits/99999` | 404 |

### 2.4 Pause & Resume

| # | Scenario | Steps | Expected |
|---|----------|-------|----------|
| 2.4.1 | Pause habit | `PATCH /habits/{id}/pause` `{ "days": 3 }` | 204; disappears from home; a `HabitPauseHistory` row created |
| 2.4.2 | Paused excluded from today | View home while paused | Not shown |
| 2.4.3 | Resume habit | `PATCH /habits/{id}/resume` | 204; reappears |
| 2.4.4 | **[Regression]** Re-pause extends, not duplicates | Pause Day 1, pause again Day 2 | The existing pause-history row is updated — NOT a second row |
| 2.4.5 | **[Regression]** Paused-then-resumed on calendar | Pause 3 days, resume, view those days | Days show habit excluded, NOT MISSED |
| 2.4.6 | Cannot log a paused habit | Log a paused habit | 400 "Cannot log a paused habit" |
| 2.4.7 | **[IDOR]** Pause another user's habit | Another user's id | 403 |
| 2.4.8 | Invalid pause days | `days: 0` or negative | 400 |

### 2.5 Archive & Unarchive

| # | Scenario | Steps | Expected |
|---|----------|-------|----------|
| 2.5.1 | Archive | `PATCH /habits/{id}/archive` | 204; absent from active list |
| 2.5.2 | Archived excluded from home | View home | Not shown |
| 2.5.3 | View archived | `GET /habits/archived` | Only archived habits |
| 2.5.4 | Unarchive | `PATCH /habits/{id}/unarchive` | 204; back in active list |
| 2.5.5 | **[Regression]** Archive clears pause | Archive a currently-paused habit | Habit becomes unpaused AND archived |
| 2.5.6 | **[IDOR]** Archive another user's habit | Another user's id | 403 |

### 2.6 Sort Order

| # | Scenario | Steps | Expected |
|---|----------|-------|----------|
| 2.6.1 | Reorder | `PATCH /habits/{id}/sort-order` `{ "sortOrder": 2 }` | 204; list re-ordered |
| 2.6.2 | Tie-break by ID | Two habits with same sortOrder | Sorted by ID as tiebreaker |
| 2.6.3 | **[IDOR]** Reorder another user's habit | Another user's id | 403 |

---

## 3. Habit Logging

### 3.1 Binary (Yes/No) Habits

| # | Scenario | Steps | Expected |
|---|----------|-------|----------|
| 3.1.1 | Mark COMPLETED | `POST /habits/{id}/log` `{ "date": today, "habitStatus": "COMPLETED" }` | 204; shows completed |
| 3.1.2 | Undo → PENDING (existing log) | After completing, send `PENDING` | 204; log row deleted |
| 3.1.3 | PENDING with no existing log | Send `PENDING` when nothing logged | 204; no-op, no row created |
| 3.1.4 | Mark MISSED (no note) | `habitStatus: MISSED` | 204; shows missed |
| 3.1.5 | Log past date | Yesterday's date | 400 "Cannot update past or future habits" |
| 3.1.6 | Log future date | Tomorrow's date | 400 |
| 3.1.7 | **[IDOR]** Log another user's habit | Another user's id | 403 |

### 3.2 Countable Habits

| # | Scenario | Steps | Expected |
|---|----------|-------|----------|
| 3.2.1 | Below target | `currentCount: 3`, target 8 | Status PARTIALLY_COMPLETED |
| 3.2.2 | Reach target | `currentCount: 8`, target 8 | Status COMPLETED |
| 3.2.3 | Exceed target | `currentCount: 10`, target 8 | COMPLETED, count capped at 8 |
| 3.2.4 | Reset to zero (existing log) | `currentCount: 0` | Log row deleted |
| 3.2.5 | Zero with no existing log | `currentCount: 0` when nothing logged | No-op, no row |
| 3.2.6 | Negative count | `currentCount: -1` | Treated as ≤0 → delete/no-op |
| 3.2.7 | UI +/− controls | Tap `+`/`−` | Count changes; API called each tap; PARTIAL/COMPLETED badge updates |

### 3.3 MISSED-with-note branch

| # | Scenario | Steps | Expected |
|---|----------|-------|----------|
| 3.3.1 | **[Regression]** MISSED with note on binary habit | `habitStatus: MISSED`, `note: "was sick"`, count 0 | Row saved as MISSED with the note — NOT discarded |
| 3.3.2 | **[Regression]** MISSED with note on countable habit | Same on a countable habit | Persisted as MISSED (does not fall into the "count ≤ 0 → delete" path) |
| 3.3.3 | MISSED updates existing log | Already COMPLETED today, then send MISSED+note | Existing row updated to MISSED, note stored, count reset to 0 |

### 3.4 Concurrent Logging

| # | Scenario | Steps | Expected |
|---|----------|-------|----------|
| 3.4.1 | **[Regression]** Simultaneous identical logs | Fire two identical log requests at once | Both succeed; exactly one row in DB. The `DataIntegrityViolationException` triggers `retryAfterConcurrentInsert` (REQUIRES_NEW) which re-reads and updates the winning row |

---

## 4. Streak Tracking

### 4.1 Per-Habit Current Streak (`GET /habits/{id}/streak`)

| # | Scenario | Steps | Expected |
|---|----------|-------|----------|
| 4.1.1 | No completions | Fresh habit | `streak: 0` |
| 4.1.2 | N consecutive completions | Complete 3 scheduled days in a row | `streak: 3` |
| 4.1.3 | Break resets | Complete 3, miss 1 (non-frozen), complete again | Only the most recent run counts |
| 4.1.4 | Today pending (not yet done) | Mid-day, today not completed | Today skipped (not counted, not breaking); counts from yesterday backward |
| 4.1.5 | Non-scheduled days transparent | Weekly habit across unscheduled days | Skipped, don't break streak |
| 4.1.6 | Frozen missed day preserved | Freeze used on a missed day inside the run | Skipped without breaking |
| 4.1.7 | Missed non-frozen past day breaks | Missed day, not today, not frozen | Loop breaks there |
| 4.1.8 | Only PARTIALLY_COMPLETED days | Countable habit only ever partially done | Do NOT count toward streak (COMPLETED-only policy) |
| 4.1.9 | Cursor stops at createdAt | Streak spans back to creation date | Loop ends at `createdAt`, doesn't run forever |
| 4.1.10 | **[IDOR]** Another user's habit streak | Another user's id | 403 |

### 4.2 Per-Habit Longest Streak (`GET /habits/{id}/streak/longest`)

| # | Scenario | Steps | Expected |
|---|----------|-------|----------|
| 4.2.1 | No completions | Fresh habit | `0` |
| 4.2.2 | No scheduled days in range | e.g. monthly habit whose day hasn't occurred since creation | `0` |
| 4.2.3 | Longest run | Multiple runs of different lengths | Returns the maximum run |
| 4.2.4 | Frozen day preserves run | Frozen day inside a run | Run continues (frozen day not counted toward length but doesn't reset) |
| 4.2.5 | Break resets current | Missed non-frozen day mid-run | `current` resets to 0; longest unaffected |
| 4.2.6 | Today pending doesn't reset | Complete 5 in a row, today pending | Longest = 5 |

### 4.3 User-Level Streak (Stats)

| # | Scenario | Steps | Expected |
|---|----------|-------|----------|
| 4.3.1 | All habits completed today | Complete every scheduled habit | Current streak increments |
| 4.3.2 | **[Regression]** Mixed past day (some done, some missed) | Past date: A completed, B missed | Streak NOT broken — day counts (has COMPLETED and… see 4.3.3) |
| 4.3.3 | **[Regression]** Current-vs-longest consistency | A day is COMPLETED but also has a MISSED log | Day counts as a streak day only if `hasCompleted && !hasMissed`, matching longest-streak logic — current can never exceed longest |
| 4.3.4 | Fully missed past day breaks | No completions on a past date | Streak breaks there |
| 4.3.5 | Today only-missed logs | Scheduler marked some missed today; user completed none yet | Streak not broken — today still in progress |
| 4.3.6 | Frozen date continues streak | Freeze on a missed day | Streak continues through it |

### 4.4 Activity View (`GET /habits/{id}/activity?startDate=&endDate=`)

| # | Scenario | Steps | Expected |
|---|----------|-------|----------|
| 4.4.1 | Basic range | Valid range | Status per scheduled day |
| 4.4.2 | startDate before creation clamps | startDate < `createdAt` | Effective start = `createdAt` |
| 4.4.3 | endDate in future clamps | endDate > today | Effective end = today |
| 4.4.4 | Unscheduled days skipped | Weekly habit, range covers Mon–Sun | Only scheduled days present |
| 4.4.5 | Day with matching log | Log exists for a scheduled date | Uses that log's status + note |
| 4.4.6 | **[Regression]** Stale log after frequency change | DAILY→WEEKLY; old daily logs on now-unscheduled dates | Stale logs skipped (index advances); later scheduled days show their correct status, NOT falsely MISSED |
| 4.4.7 | Today, targetTime passed, no log | Today is a scheduled day, past targetTime, unlogged | MISSED (mirrors default status) |
| 4.4.8 | Today, before targetTime / no targetTime | Today scheduled, before targetTime or targetTime null | PENDING |
| 4.4.9 | Past scheduled day, no log | Past scheduled date with no log | MISSED |
| 4.4.10 | Range > 366 days | 367-day span | 400 "must not exceed 366 days" |
| 4.4.11 | Exactly 366 days | 365-day difference (366 inclusive) | Accepted |
| 4.4.12 | startDate after endDate | `startDate > endDate` | 400 "startDate must not be after endDate" |
| 4.4.13 | **[Regression]** Historical paused days | Range covers days the habit was paused | Correct status; not falsely MISSED |
| 4.4.14 | **[IDOR]** Another user's activity | Another user's id | 403 |

---

## 5. Streak Freeze

### 5.1 Using a Freeze (`POST /user/streak-freeze/use`)

| # | Scenario | Steps | Expected |
|---|----------|-------|----------|
| 5.1.1 | Freeze today (MISSED log exists) | Miss habit today; freeze today | 200; freeze count −1; streak preserved |
| 5.1.2 | Freeze yesterday (MISSED log exists) | Miss habit yesterday; freeze yesterday | 200 |
| 5.1.3 | Freeze today via fallback (no MISSED log yet) | Habit's targetTime passed today, unlogged, scheduled, active, after createdAt, not paused-on-date | 200 — fallback detects the miss even before the scheduler runs |
| 5.1.4 | Fallback: targetTime not yet passed | Today, targetTime in the future | Not counted as missed → 400 if nothing else missed |
| 5.1.5 | No miss anywhere | All scheduled habits completed | 400 "No missed habits on this date. Freeze not needed." |
| 5.1.6 | Already frozen (pre-check) | Freeze same date twice | 400 "This date is already frozen." |
| 5.1.7 | **[Regression/Security]** Concurrent freeze same date | Two freeze requests for same date race past the exists-check | Loser hits the `uq_freeze_user_date` constraint → caught → 400 "This date is already frozen." (NOT 500). Freeze count not double-decremented |
| 5.1.8 | Date not today/yesterday | Freeze a date 2+ days ago or in future | 400 "Freeze can only be applied to today or yesterday." |
| 5.1.9 | No freezes available | streakFreezes = 0 | 400 "No streak freezes available." |
| 5.1.10 | **[Regression]** Freeze when habit paused today but active on the date | Miss A yesterday; pause A today; freeze yesterday | Succeeds — historical pause state on the date is evaluated, not the live `isPaused()` flag |
| 5.1.11 | Archived habit excluded from miss check | Only an archived habit is "unlogged" | Not counted → 400 no-miss |
| 5.1.12 | User not found | Authenticated user row gone | 404 |

### 5.2 Earning Freezes (nightly `awardStreakFreezes`)

| # | Scenario | Steps | Expected |
|---|----------|-------|----------|
| 5.2.1 | 7-day daily streak | Complete a daily habit 7 days; run scheduler | Freeze count +1 (cap 2) |
| 5.2.2 | **[Regression]** 7 good days with non-daily habit | WEEKLY (Mon/Wed/Fri) completed every scheduled day | Awarded — days with no active scheduled habit count as satisfied |
| 5.2.3 | Day satisfied by "no active habit" | A day in the window had all habits paused/archived/not-yet-created | That day counts as satisfied |
| 5.2.4 | Not satisfied → no award | One window day had an active scheduled habit with no completion | No freeze |
| 5.2.5 | At max freezes | Already 2 freezes | Stays 2 (`awardFreezeIfEarned` no-ops) |
| 5.2.6 | No duplicate award within 7-day window | Earn freeze; run again next day (`lastFreezeAwardedAt` within 6 days) | No second award until a fresh non-overlapping 7 days |
| 5.2.7 | Empty candidate set | No completed logs in window | Scheduler returns early, no work |

### 5.3 Freeze Status (`GET /user/streak-freeze`)

| # | Scenario | Steps | Expected |
|---|----------|-------|----------|
| 5.3.1 | Get status | `GET /user/streak-freeze` | `{ "availableFreezes": N, "maxFreezes": 2 }` |
| 5.3.2 | User not found | User row gone | 404 |

---

## 6. Calendar & Year View

| # | Scenario | Steps | Expected |
|---|----------|-------|----------|
| 6.1 | Current month summary | `GET /habits/summary?year=2026&month=6` | Map of date → status array for days with scheduled habits |
| 6.2 | Future days excluded | Request current month | Dates after today not included |
| 6.3 | All-completed day | All habits done | All COMPLETED for that date |
| 6.4 | Mixed day | Some completed, some missed | Both statuses appear |
| 6.5 | **[Regression]** Paused habit excluded | Habit paused June 10–14 | Those days omit that habit (not MISSED) |
| 6.6 | Day with no scheduled habits | Empty day | Absent from response |
| 6.7 | Invalid month | `month=13` or `0` | 400 |
| 6.8 | Invalid year | `year=1999` (below allowed) | 400 |
| 6.9 | Year pixels | `GET /user/year-pixels` | 365-day heatmap: COMPLETED / PARTIAL / MISSED / PENDING per day |
| 6.10 | Year pixels — empty account | New user | Returns all-empty/pending map, no error |

---

## 7. User Stats (`GET /user/stats`, `GET /user`)

| # | Scenario | Steps | Expected |
|---|----------|-------|----------|
| 7.1 | Fresh account | No logs | All counts 0; streaks 0 |
| 7.2 | Total habits | 3 active habits | `totalHabits: 3` |
| 7.3 | Archived excluded | Archive 1 of 3 | `totalHabits: 2` |
| 7.4 | Overall consistency | 8 completed, 2 missed | `overallConsistency: 80` |
| 7.5 | Consistency with zero scheduled | No scheduled logs at all | 0 (no divide-by-zero) |
| 7.6 | Top habits | Several habits, varying completions | Top 3 by completion returned |
| 7.7 | Longest ≥ current invariant | Any data set | `longestStreak ≥ currentStreak` always |
| 7.8 | Member since | — | `memberSince` = registration date |
| 7.9 | Get user details | `GET /user` | `{ "email": "..." }` |
| 7.10 | User not found | User row gone | 404 |

---

## 8. Weekly Review & Digest (AI)

### 8.1 Weekly Review (`GET /user/weekly-review`)

| # | Scenario | Steps | Expected |
|---|----------|-------|----------|
| 8.1.1 | No activity this week | No logs in last 7 days | `overallPercent: 0`; insight = "No activity this week yet" |
| 8.1.2 | With activity | Completions in last 7 days | Per-habit stats + AI `aiInsight` paragraph |
| 8.1.3 | AI insight non-empty | Active week | `aiInsight` is a non-empty string |
| 8.1.4 | UI screen | Open Weekly Review | Overall %, per-habit bars, insight text |

### 8.2 Weekly Digest Scheduler (Sunday 8 AM IST)

| # | Scenario | Steps | Expected |
|---|----------|-------|----------|
| 8.2.1 | No push-token users | No users with token | Returns early |
| 8.2.2 | User with no active habits | Only archived habits | Skipped (no digest) |
| 8.2.3 | User with no activity | `totalScheduled == 0` for the week | Skipped |
| 8.2.4 | Normal digest | Activity present | Builds summary, calls `generateWeeklyDigest`, sends push |
| 8.2.5 | Per-user error isolation | One user's processing throws | Error logged; other users still processed |
| 8.2.6 | Percentage rounding | e.g. 2/3 completed | `overallPct` rounded (67) |

### 8.3 AI Service internals

| # | Scenario | Steps | Expected |
|---|----------|-------|----------|
| 8.3.1 | suggestHabits — valid array | Groq returns JSON array | Parsed into `HabitRequest` list |
| 8.3.2 | suggestHabits — non-array | Groq returns an object | RuntimeException "unexpected response format" |
| 8.3.3 | suggestHabits — blank title/desc skipped | One element has empty title | That element skipped |
| 8.3.4 | suggestHabits — targetCount clamped | Groq returns 0 or 500 | Clamped to 1..100 |
| 8.3.5 | suggestHabits — invalid enum/time fallback | Bad category/frequency/targetTime | Defaults GENERAL/DAILY/08:00 |
| 8.3.6 | suggestHabits — weekly days parsed | WEEKLY with `daysOfWeek` incl. an invalid name | Valid days parsed; invalid ignored |
| 8.3.7 | suggestHabits — monthly days parsed | MONTHLY with `daysOfMonth` | Parsed to Set<Integer> |
| 8.3.8 | markdown fences stripped | Groq wraps JSON in ```json fences | Fences stripped before parsing |
| 8.3.9 | stripMarkdownFences null | null input | Returns "" |
| 8.3.10 | callGroq — timeout ret/retry | `ResourceAccessException` twice then success | Retries with backoff, eventually succeeds |
| 8.3.11 | callGroq — timeout exhausted | Timeout on all 3 attempts | RuntimeException "currently unavailable" |
| 8.3.12 | callGroq — 429 retried | HTTP 429 then 200 | Retried, succeeds |
| 8.3.13 | callGroq — 5xx retried | HTTP 503 then 200 | Retried, succeeds |
| 8.3.14 | callGroq — 4xx permanent | HTTP 400/401 (bad key) | No retry; RuntimeException immediately |
| 8.3.15 | callGroq — bad JSON response | 200 but unparseable body | RuntimeException "Failed to read AI response" |
| 8.3.16 | callGroq — interrupted during backoff | Thread interrupted mid-sleep | Interrupt flag restored; RuntimeException |
| 8.3.17 | getInsights | Valid stats | Returns `InsightResponse` with AI text |

> **Coverage gap flag:** there is currently no dedicated `AiServiceTest`. These scenarios should be backed by unit tests mocking the `RestClient`.

---

## 9. Notifications

### 9.1 Push Token Registration

| # | Scenario | Steps | Expected |
|---|----------|-------|----------|
| 9.1.1 | Token saved on launch (native) | Grant permission, open app | `POST /user/push-token` called; token saved |
| 9.1.2 | **[Regression]** Save with expired access token | Access token expired; FCM rotates token | Request 401 → auto-refresh → retry once → token saved |
| 9.1.3 | Token updated on rotation | FCM `onTokenRefresh` fires | New token sent to server |
| 9.1.4 | Web platform no-op | `registerForPushNotifications()` on web | Returns immediately; no FCM calls |
| 9.1.5 | Android permission denied | Deny POST_NOTIFICATIONS | Alert with "Open Settings"; no token saved |
| 9.1.6 | Save token repo path | `savePushToken` service | User loaded, token set, saved; 404 if user missing |

### 9.2 Habit Reminders (`sendHabitReminder`, every 15 min)

| # | Scenario | Steps | Expected |
|---|----------|-------|----------|
| 9.2.1 | Reminder in window | Habit targetTime within next 15 min in user's zone, scheduled today, unlogged | Push sent |
| 9.2.2 | **[Regression]** No reminder after completion | Habit already logged today | Filtered out — no push |
| 9.2.3 | Paused habit | Paused | No push |
| 9.2.4 | Archived habit | Archived | No push |
| 9.2.5 | Notifications disabled | `notificationsEnabled: false` | No push |
| 9.2.6 | No targetTime | targetTime null | No push |
| 9.2.7 | Not scheduled today | Weekly habit, today not in its days | No push |
| 9.2.8 | Timezone correctness | Users in different timezones | Each evaluated in their own zone |
| 9.2.9 | Midnight wrap-around window | targetTime 00:03, now 23:52 | `isInWindow` wrap branch → push sent |
| 9.2.10 | No push-token users | None with token | Returns early |
| 9.2.11 | Blank token skipped | User token is "" | Skipped |
| 9.2.12 | Invalid timezone → UTC | User timezone is garbage | `parseZone` falls back to UTC (no crash) |
| 9.2.13 | notify() failure handled | FirebaseMessaging throws | Exception caught + logged; loop continues |
| 9.2.14 | sendDigest() failure handled | FirebaseMessaging throws | Caught + logged |

---

## 10. Scheduler Behaviors

### 10.1 Auto-Mark Missed (`updateMissedHabits`, every 5 min)

| # | Scenario | Steps | Expected |
|---|----------|-------|----------|
| 10.1.1 | Marked MISSED after targetTime | targetTime passed, scheduled, unlogged, active | MISSED log inserted |
| 10.1.2 | Completed not overwritten | Already logged today (any status) | Skipped |
| 10.1.3 | No targetTime | targetTime null | Never marked |
| 10.1.4 | Before targetTime | now ≤ targetTime | Skipped |
| 10.1.5 | Paused habit | paused | Excluded by query (`findByPausedFalseAndArchivedFalse`) |
| 10.1.6 | Archived habit | archived | Excluded by query |
| 10.1.7 | Not scheduled today | Weekly, today not scheduled | Skipped |
| 10.1.8 | Before creation date | today < createdAt | Skipped |
| 10.1.9 | Orphan habit (user missing) | user not in map | Skipped (continue) |
| 10.1.10 | Dedup within a run | Same habit/date twice | Only one insert |
| 10.1.11 | Empty active set | No active habits | Returns early |
| 10.1.12 | Invalid timezone → UTC | Bad user timezone | UTC fallback |

### 10.2 Auto-Resume (`autoResumeHabits`, midnight IST)

| # | Scenario | Steps | Expected |
|---|----------|-------|----------|
| 10.2.1 | Pause expired | `pausedUntil ≤ today` | Resumed: `paused=false`, `pausedUntil=null` |
| 10.2.2 | Still paused | `pausedUntil` in future | Unchanged |

### 10.3 Housekeeping

| # | Scenario | Steps | Expected |
|---|----------|-------|----------|
| 10.3.1 | Purge expired refresh tokens | `purgeExpiredRefreshTokens` nightly | Rows with `expiresAt < now` deleted |

---

## 11. Habit Scheduling Logic (`isScheduledForDate`)

| # | Scenario | Steps | Expected |
|---|----------|-------|----------|
| 11.1 | Daily always scheduled | DAILY, any date | true |
| 11.2 | Weekly match | WEEKLY, date's weekday in `daysOfWeek` | true |
| 11.3 | Weekly no match | Weekday not in set | false |
| 11.4 | Weekly null days | `daysOfWeek` null | false |
| 11.5 | Monthly match | `daysOfMonth` contains day | true |
| 11.6 | Monthly null/empty | null or empty `daysOfMonth` | false |
| 11.7 | Monthly clamp day 31 → 30 | `daysOfMonth: [31]`, April | Fires April 30 |
| 11.8 | Monthly clamp day 29 → 28 | `daysOfMonth: [29]`, non-leap February | Fires Feb 28 |
| 11.9 | Monthly leap day | `daysOfMonth: [29]`, leap February | Fires Feb 29 |
| 11.10 | `isHabitPausedOnDate` | Date within a pause window | true (delegates to repo exists query) |

---

## 12. Security & Authorization

### 12.1 JWT Authentication Filter

| # | Scenario | Steps | Expected |
|---|----------|-------|----------|
| 12.1.1 | No Authorization header | Call protected endpoint | Unauthenticated → 401 (chain continues without auth) |
| 12.1.2 | Non-Bearer header | `Authorization: Basic ...` | Ignored → 401 |
| 12.1.3 | Invalid/expired/tampered JWT | Bad token | `isValidJwtToken` false → unauthenticated → 401 |
| 12.1.4 | Valid token, user exists | Good access token | Auth set with userId + timezone from DB |
| 12.1.5 | Valid token, user deleted | Good JWT but user row gone | timezone null → treated unauthenticated → 401 (liveness check) |
| 12.1.6 | Non-numeric subject | JWT subject not a long | `NumberFormatException` caught → unauthenticated |
| 12.1.7 | Refresh token on protected endpoint | Send refresh-type JWT as access | Rejected (type ≠ "access") |

### 12.2 IDOR / Ownership

| # | Scenario | Steps | Expected |
|---|----------|-------|----------|
| 12.2.1 | Access another user's habit | Any `/habits/{id}` op with another user's id | 403 AccessDenied |
| 12.2.2 | Access another user's logs/streak/activity | `/habits/{othersId}/streak` etc. | 403 |
| 12.2.3 | Non-existent habit | Valid user, unknown id | 404 HabitNotFound |

### 12.3 Rate Limiting

| # | Scenario | Steps | Expected |
|---|----------|-------|----------|
| 12.3.1 | Auth endpoints filtered | `/auth/login`, `/register`, `/refresh` | Rate limiter active |
| 12.3.2 | Non-auth path not filtered | Any other path | `shouldNotFilter` true — bypassed |
| 12.3.3 | Under limit | Requests below `maxRequests` | Pass through |
| 12.3.4 | Over limit | Exceed `maxRequests` in window | 429 JSON "Too many requests." |
| 12.3.5 | Window reset | Wait past `windowMs`, retry | Counter resets; allowed again |
| 12.3.6 | Eviction sweep | Send `EVICTION_INTERVAL` requests | Stale windows evicted (no unbounded growth) |
| 12.3.7 | **[Security]** Trusted proxy XFF honored | Request from a configured trusted proxy IP with `X-Forwarded-For` | Leftmost XFF IP used as client key |
| 12.3.8 | **[Security]** Untrusted XFF ignored | XFF from a non-trusted remote addr | Header ignored; `remoteAddr` used (can't spoof to bypass) |
| 12.3.9 | No trusted proxies configured | Empty trusted set | XFF ignored; `remoteAddr` used |
| 12.3.10 | Blank XFF | Trusted proxy but blank header | Falls back to `remoteAddr` |

### 12.4 AI Rate Limiting (`/ai/*`, per user)

| # | Scenario | Steps | Expected |
|---|----------|-------|----------|
| 12.4.1 | Under per-user limit | < 20/min | Pass |
| 12.4.2 | Over per-user limit | > 20/min for one user | 429 |
| 12.4.3 | Non-/ai path bypassed | Other endpoints | `shouldNotFilter` true |
| 12.4.4 | Runs after JWT | Unauthenticated `/ai` call | 401 before rate-limit logic |

### 12.5 CORS / Security Config

| # | Scenario | Steps | Expected |
|---|----------|-------|----------|
| 12.5.1 | Allowed origin | Request from configured origin | CORS headers present |
| 12.5.2 | Disallowed origin | Random origin | Rejected by CORS |
| 12.5.3 | Public endpoints permit-all | `/auth/login`, `/register`, `/refresh`, `/health` | Reachable without token |
| 12.5.4 | Logout NOT permit-all | `/auth/logout` without token | 401 |

---

## 13. Exception Handling (`GlobalExceptionHandler`)

| # | Scenario | Trigger | Expected |
|---|----------|---------|----------|
| 13.1 | UserAlreadyExist | Duplicate register | 409 `USER_ALREADY_EXISTS` |
| 13.2 | UserNotFound | Missing user | 404 `USER_NOT_FOUND` |
| 13.3 | PasswordDoesNotMatch | Bad credentials/current pwd | 401 `PASSWORD_MISMATCH` |
| 13.4 | HabitNotFound | Unknown habit | 404 `HABIT_NOT_FOUND` |
| 13.5 | HabitLogNotFound | Unknown log | 404 `HABIT_LOG_NOT_FOUND` |
| 13.6 | AccessDenied | IDOR attempt | 403 `ACCESS_DENIED` |
| 13.7 | DatabaseException | DB failure path | 500 `DB_ERROR` |
| 13.8 | IllegalState | Business rule violation | 400 `INVALID_STATE` |
| 13.9 | IllegalArgument | Bad argument | 400 `INVALID_ARGUMENT` |
| 13.10 | MethodArgumentNotValid | `@Valid` body failure | 400 `VALIDATION_ERROR` (first field message) |
| 13.11 | ConstraintViolation | Param constraint failure | 400 `VALIDATION_ERROR` |
| 13.12 | MethodArgumentTypeMismatch | e.g. `year=abc` | 400 `INVALID_ARGUMENT` |
| 13.13 | **[Security]** HttpMessageNotReadable | Malformed JSON body | 400 `MALFORMED_REQUEST` (NOT 500) |
| 13.14 | Generic Exception | Any unmapped error | 500 `INTERNAL_ERROR` "Something went wrong" (no internal detail leaked); logged server-side |

---

## 14. Password Strength Validator

| # | Scenario | Input | Expected |
|---|----------|-------|----------|
| 14.1 | Null | `null` | invalid |
| 14.2 | Valid | `Password1!` | valid |
| 14.3 | No lowercase | `PASSWORD1!` | invalid |
| 14.4 | No uppercase | `password1!` | invalid |
| 14.5 | No digit | `Password!` | invalid |
| 14.6 | No special | `Password1` | invalid |
| 14.7 | Too short | `Pass1!` | invalid |
| 14.8 | Disallowed char | `Password1!<` | invalid (only `@$!%*?&` allowed) |
| 14.9 | Parity with frontend | Same rules as `validation.ts isStrongPassword()` | Backend + frontend agree |

---

## 15. Frontend UI — Critical Paths

### 15.1 Onboarding & Login

| # | Scenario | How to Test | Expected |
|---|----------|-------------|----------|
| 15.1.1 | First launch | Fresh install | Onboarding shown before login |
| 15.1.2 | Returning user, valid token | Stored unexpired token | Skip login → Home |
| 15.1.3 | Returning user, expired token | Token past exp | Token cleared; Login shown |
| 15.1.4 | Token validity check | `isTokenValid` with exp 30s away | Treated invalid (30s safety margin) |
| 15.1.5 | Malformed stored token | Not 3 JWT parts / bad base64 | `isTokenValid` false (no crash; pure-JS base64url decode) |
| 15.1.6 | Login error shown | Wrong password | Red error under password field |
| 15.1.7 | Loading state | Tap Login | Spinner; re-tap does nothing |
| 15.1.8 | Client-side validation | Empty/invalid email, short/long password | Inline errors; no API call |

### 15.2 Home Screen

| # | Scenario | How to Test | Expected |
|---|----------|-------------|----------|
| 15.2.1 | Today's habits only | Open Home | Only today's scheduled, non-paused, non-archived habits |
| 15.2.2 | Mark complete (optimistic) | Tap card | Instant update; confirmed by server |
| 15.2.3 | Undo | Tap completed card | Reverts to pending |
| 15.2.4 | Countable controls | `+`/`−` | Count changes; badge updates |
| 15.2.5 | Streak display | Complete habit | Streak number updates |
| 15.2.6 | Re-focus refresh | Navigate away and back | List refreshes from server |

### 15.3 Habit Create / Edit Form

| # | Scenario | How to Test | Expected |
|---|----------|-------------|----------|
| 15.3.1 | Create daily | Fill + DAILY | Appears on Home |
| 15.3.2 | Weekly requires a day | Select WEEKLY, no day | Cannot submit |
| 15.3.3 | Edit title | Change + save | Updated everywhere |
| 15.3.4 | Delete with confirm | Delete + confirm | Habit + history removed |

### 15.4 Settings

| # | Scenario | How to Test | Expected |
|---|----------|-------------|----------|
| 15.4.1 | Dark mode toggle | Toggle theme | Switches immediately app-wide |
| 15.4.2 | Password change success | Valid inputs | Success banner; fields cleared |
| 15.4.3 | Password mismatch | New ≠ confirm | Error before API call |
| 15.4.4 | New == current | Same as current | Error "must differ" |
| 15.4.5 | All fields required | Empty submit | "All fields required" error |

### 15.5 Token Refresh (Auto — `apiHandler`)

| # | Scenario | How to Test | Expected |
|---|----------|-------------|----------|
| 15.5.1 | Seamless refresh | Access token expires mid-use | Transparent refresh; no interruption |
| 15.5.2 | Refresh fails → redirect | Invalidate refresh server-side | Tokens cleared; redirect to login (`/`) |
| 15.5.3 | **[Regression]** Concurrent 401s | Two calls 401 at once | Single shared refresh (`refreshPromise`); both retry with new token |
| 15.5.4 | Retry once only | Refresh succeeds but retried call still 401 | Does not loop; surfaces error |

### 15.6 Cross-Platform Responsive Shell

| # | Scenario | How to Test | Expected |
|---|----------|-------------|----------|
| 15.6.1 | Desktop web constrained | Open in browser, width > 640 | Centered 640px column with backdrop + hairline borders |
| 15.6.2 | Mobile web full-bleed | Browser width ≤ 640 | Column fills screen; no backdrop |
| 15.6.3 | Native app unaffected | iOS/Android | Always full-bleed (never constrained) |
| 15.6.4 | Resize reflow | Drag browser across 640px | Switches between constrained/full cleanly |

---

## 16. Edge Cases & Boundary Conditions

| # | Scenario | How to Test | Expected |
|---|----------|-------------|----------|
| 16.1 | Habit created today | Create; view Home | Shown (createdAt = today inclusive) |
| 16.2 | Leap day monthly (`[29]`) | Non-leap year | Fires Feb 28 |
| 16.3 | Day-31 monthly | April | Fires April 30 |
| 16.4 | Empty account everywhere | Stats, calendar, year pixels, review | All empty/zero; no errors |
| 16.5 | Note at 500-char limit | Log note = 500 chars | Saved |
| 16.6 | Note over limit | > 500 chars | 400 validation |
| 16.7 | All categories | One habit per `HabitCategory` | Each stored |
| 16.8 | Activity exactly 366 days | 365-day span | Accepted |
| 16.9 | Activity 367 days | 366-day span | 400 |
| 16.10 | Null/invalid user timezone | User timezone null/garbage | Schedulers & date math fall back to UTC; no 401/500 |
| 16.11 | JWT secret from env | Missing `JWT_SECRET` | App fails to start (no insecure default) |

---

## 17. Regression Checklist

Run after every significant change:

- [ ] Duplicate registration → 409, not 500 (both pre-check and concurrent race)
- [ ] **[Security]** Login: unknown email and wrong password return the identical 401 (no user enumeration)
- [ ] **[Security]** Refresh tokens are stored SHA-256-hashed; refresh still works; V12 cleared legacy rows
- [ ] **[Security]** Malformed JSON body → 400, not 500
- [ ] Re-pausing a habit updates the existing pause-history row (no duplicate)
- [ ] Calendar/activity exclude historically paused habits (not MISSED)
- [ ] User-level current streak not broken by a mixed day; current ≤ longest always
- [ ] MISSED-with-note persists (not silently dropped for countable habits)
- [ ] Concurrent identical log → one row (REQUIRES_NEW retry)
- [ ] Concurrent same-date freeze → friendly 400, not 500; count not double-decremented
- [ ] Weekly/Monthly users can earn freezes after 7 good days
- [ ] Activity view skips stale logs after a DAILY→WEEKLY frequency change
- [ ] Push not sent for already-completed habits; reminders correct across timezones incl. midnight wrap
- [ ] FCM token rotation saves even with an expired access token
- [ ] Responsive shell: constrained on desktop web only; full-bleed on mobile web & native
- [ ] All backend unit tests pass (`./mvnw test`)

---

## 18. Known Test-Suite Coverage Gaps

Areas where scenarios above are **not yet backed by dedicated automated tests** — prioritize adding these:

| Class | Gap |
|-------|-----|
| `AuthService` | Add: refresh-token lookup uses the **hashed** value; register DB-error branches (null cause / non-unique cause) |
| `StreakFreezeService` | No dedicated test class — all of §5.1/§5.2 (fallback miss detection, paused-on-date, concurrent-race 400, award window) |
| `UserStatsService` | Only 2 tests — cover §4.3, §7 (consistency math, streak invariants, year pixels, weekly review) |
| `AiService` | No test class — cover all of §8.3 (mock `RestClient`) |
| `WeeklyDigestScheduler` | No test class — cover §8.2 (per-user error isolation, skip conditions) |
| `HabitScheduleService` | Cover §11 directly (month-day clamping, null/empty days) |
| `RateLimitFilter` / `AiRateLimitFilter` / `MdcLoggingFilter` | Cover §12.3/§12.4 (over-limit 429, eviction, trusted-proxy XFF) |
| `GlobalExceptionHandler` | Add the new `HttpMessageNotReadableException` → 400 case (§13.13) |
| `PasswordStrengthValidator` | Cover §14 branch-by-branch |
</content>
</invoke>
