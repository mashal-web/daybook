# Daybook — Personal Study & Routine Manager

A responsive, light-neumorphic personal planner built with plain HTML, CSS and JavaScript. No framework, build step, or account is required.

## Features
- Weekly university timetable with previous/next week navigation
- Add, edit and delete classes; overlap warning and optional room/location
- Seven-day daily routine with separate activities for each weekday
- Add, edit and delete routine activities
- Study planner with the user's seven course subjects preloaded
- Study sessions with date, topic, duration and completion tracking
- Subject manager to add or remove courses
- Task manager with search, filters, priorities, categories, deadlines and notes
- Progress analytics for completed tasks, study time, subject breakdown and weekly study goal
- Reminders with one-time, daily and weekly repeat options
- Browser notification permission support
- JSON export and import for backups and device transfers
- Local browser storage and installable/offline-capable PWA support
- Responsive layout for desktop, tablet and mobile

## Preloaded subjects
- Applied Physics & Engineering Mechanics
- Engineering Mathematics
- Islamiat
- Functional English
- Quantitative Reasoning
- Engineering Drawing
- Foundation Mathematics

## Preloaded weekly campus blocks
These are editable starting points based on the schedule previously provided:
- Monday: 8:05 AM–3:30 PM
- Tuesday: no campus block
- Wednesday: 8:00–10:30 AM
- Thursday: 8:00 AM–1:00 PM
- Friday: 8:00 AM–1:00 PM
- Saturday: 9:40–11:00 AM (no commute)
- Sunday: no campus block

The routine is also prefilled across all seven days. Edit it to match changes in prayer times, travel, classes and personal commitments.

## Run / publish
Open `index.html` in a modern browser, or publish the repository with GitHub Pages. Service-worker/offline and install features require HTTPS (GitHub Pages provides HTTPS).

## Data, backups and notifications
- Planner data is saved in the current browser using localStorage. It does not automatically sync between browsers or devices.
- Use the download/export button to save a JSON backup. Import it on another device/browser to transfer your data.
- Browser notifications require permission. They are checked while the app is open; the browser or operating system may suspend background tabs, so they are not a guaranteed alarm replacement.
- Clearing browser site data may erase locally saved planner data. Keep a backup.

## Android app build

Daybook is packaged for Android with Capacitor. Every push to `main` that changes the app or Android build files triggers the **Build Daybook Android APK** GitHub Actions workflow. You can also run it manually from the repository's Actions tab. When it succeeds, open the workflow run, then download the `daybook-android-debug` artifact. Install the APK on an Android device (you may need to allow installation from that source). The APK is a debug build for personal testing, not a Play Store release; a signed release AAB/APK requires a private signing key and release configuration.

Android reminders use the native local-notifications plugin. Grant notification permission in Android settings or from the Reminders screen. Android battery restrictions and device settings can still affect delivery. App data remains on that device; export a JSON backup before changing phones or reinstalling.
