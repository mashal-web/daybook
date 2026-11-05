# Daybook — Personal Study & Routine Manager

Daybook is a responsive, dark liquid-glass personal planner built with HTML, CSS and JavaScript. It runs as a web app and can be packaged as an Android app with Capacitor.

## Features
- One combined weekly timetable: one timing column plus all seven days
- Classes and daily activities shown together in chronological time rows
- Add, edit and delete classes and routine activities
- Study planner with editable course subjects and study sessions
- Task manager with search, filters, priorities, categories, deadlines and notes
- Focus timer with completed sessions recorded in study history
- Progress analytics for task completion, study time, subject breakdown and weekly study goal
- One-time, daily and weekly reminders
- Browser notification support while the web app is open
- Android local notifications through Capacitor
- JSON export and import for backups and device transfers
- Local browser storage and offline-capable PWA support
- Responsive desktop and mobile navigation

## Current routine defaults
The initial timetable is based on the user's saved routine. It includes:
- Wake up and Fajr prayer at 5:30 AM
- Tilawat 6:00–6:30 AM
- Exercise 6:30–7:00 AM
- Breakfast 7:00–7:30 AM
- Lunch 1:00–2:00 PM
- Maghrib prayer and Tilawat 6:00–6:30 PM
- Phone time 7:30–8:00 PM
- Dinner 8:00–8:30 PM
- Wind down and sleep at 9:30 PM
- University blocks Monday, Wednesday, Thursday and Friday
- No university on Saturday; Tuesday and Sunday are non-class days
- Library blocks on Wednesday, Thursday and Friday

All timetable entries are editable. Existing saved routine entries are preserved when the routine data version is upgraded; defaults are added only where a day/time slot is not already occupied.

## Courses
- Applied Physics & Electro Mechanical Fundamental
- Engineering Mathematics
- Islamiat
- Functional English
- Quantitative Reasoning
- Engineering Drawing
- Foundation Mathematics

## Data and backups
- Planner data is stored locally in the current browser or Android app. It does not automatically sync between devices.
- Use Export backup to save a JSON file, then Import backup on the destination device.
- Clearing browser or app data can erase local planner data. Keep a backup.
- Web notifications are checked while Daybook is open; background browser suspension can delay or prevent delivery.
- Android reminders use local notifications. Delivery depends on notification permission, Android alarm settings, battery management and device configuration; do not treat them as a guaranteed emergency alarm.

## Run and publish
Open `index.html` in a modern browser, or publish the repository with GitHub Pages. HTTPS is required for service workers and install features.

## Android build
The Android APK is built with Capacitor through GitHub Actions. Pushes to `main` that change app or build files trigger the **Build Daybook Android APK** workflow. A successful workflow uploads an installable debug APK artifact. The debug APK is for personal testing, not a Play Store release; a signed release requires a private signing key and release configuration.
