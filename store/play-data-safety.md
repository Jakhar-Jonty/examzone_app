# Google Play — Data safety form

Play Console → Policy → App content → **Data safety**. Answers below match what the
app and server actually do (checked against the code, Oct 2026) and the privacy
policy at https://exam.zonty.in/privacy. Update this file if collection changes
(e.g. adding Sentry crash reporting → "Crash logs" / "Diagnostics").

## Section 1 — Data collection and security

| Question | Answer |
|---|---|
| Does your app collect or share any of the required user data types? | **Yes** |
| Is all of the user data collected by your app encrypted in transit? | **Yes** (HTTPS only: api.ez.zonty.in, exam.zonty.in) |
| Which account creation methods does your app support? | **Username and password**, **OAuth** (Google), **Other** (one-time code by email) |
| Do you provide a way for users to request that their data is deleted? | **Yes** — in-app (Profile → Delete account) and https://exam.zonty.in/delete-account |
| Delete account URL | https://exam.zonty.in/delete-account |

"Shared" means sent to a third party for its own use. Our service providers (MongoDB
Atlas, AWS, Vercel, Cloudinary, Twilio, Google sign-in, Expo/Firebase push) process data
on our behalf, which Play does **not** count as sharing. So **Shared = No** for every row.

## Section 2 — Data types

Tick only these. Everything not listed (location, contacts, messages, calendar, health,
audio, files, web history, installed apps, crash logs, diagnostics, advertising ID) → **not collected**.

| Category → Data type | Collected | Shared | Optional? | Processed ephemerally? | Purposes |
|---|---|---|---|---|---|
| Personal info → **Name** | Yes | No | Required | No | App functionality, Account management |
| Personal info → **Email address** | Yes | No | Required | No | App functionality, Account management, Developer communications (OTP, account emails) |
| Personal info → **Phone number** | Yes | No | **Optional** | No | Account management (login by phone) |
| Personal info → **User IDs** | Yes | No | Required | No | App functionality, Account management (account ID, Google account ID, referral code) |
| Personal info → **Other info** | Yes | No | **Optional** | No | App functionality, Personalization (date of birth, gender, state/city, bio, exam preference) |
| Financial info → **Purchase history** | Yes | No | **Optional** | No | App functionality (Premium status and orders; card/UPI details are never seen by the app) |
| Photos and videos → **Photos** | Yes | No | **Optional** | No | App functionality (profile photo only, chosen by the user) |
| App activity → **App interactions** | Yes | No | Required | No | App functionality, Analytics, Personalization (tests attempted, answers, scores, streaks, badges) |
| App activity → **Other user-generated content** | Yes | No | **Optional** | No | App functionality (ratings and reviews of tests) |
| Device or other IDs → **Device or other IDs** | Yes | No | **Optional** | No | App functionality (push notification token; user can deny notifications) |

Notes for the form's per-type questions:
- "Is this data collected, shared, or both?" → **Collected** only.
- "Is this data processed ephemerally?" → **No** for all (it is stored).
- "Is collection required or can users choose?" → as in the *Optional?* column.
- Analytics above means our own in-app progress analytics, not a third-party analytics SDK.

## Permissions declared (AndroidManifest)

| Permission | Why |
|---|---|
| CAMERA | Take a profile photo (Edit profile). Requested only when the user taps "Take photo". |
| READ_EXTERNAL_STORAGE / WRITE_EXTERNAL_STORAGE | Pick a profile photo; save PYQ / wrong-book PDFs. Not needed on Android 13+ (system photo picker). |
| POST_NOTIFICATIONS (from expo-notifications) | Test reminders, live mock results. |
| INTERNET | API access. |

If Play flags the storage permissions, they can be removed from `app.json` — the
image picker and PDF sharing work without them on current Android versions.
