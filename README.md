# Daybook — Personal Study & Routine Manager

Daybook is a responsive, dark liquid-glass personal planner built with HTML, CSS and JavaScript. It runs as a web app and can be packaged as an Android app with Capacitor.

## Visual system
- Android-first bottom navigation with a dedicated More sheet for secondary workspaces
- Unified design tokens with separately art-directed midnight graphite and soft porcelain themes
- Persistent dark/light appearance preference, safe-area-aware layouts, touch-friendly controls and reduced-motion support

## Features
- Unified schedule engine for fixed commitments, recurring events, deadline tasks, flexible activities and prayer/sleep anchors
- Four timetable modes: chronological timeline, daily agenda, flexible task list and seven-day weekly overview
- Add, edit and delete classes and routine activities
- Study planner with editable course subjects and study sessions
- Task manager with search, filters, priorities, categories, deadlines and notes
- Focus timer with completed sessions recorded in study history
- Progress analytics for task completion, study time, subject breakdown, weekly study goal, habit consistency and spending overview
- Academic command center with course register, credits, assignments, quizzes, exams and completion tracking
- Daily habit tracker with check-ins, completion rate and streak estimates
- Personal finance tracker for PKR budgets, income, expenses and category-based transactions
- Smart planning suggestions using open tasks and approximate free windows from the timetable
- Daily and weekly date navigation, conflict detection, available-time windows and priority-aware flexible task ordering
- Location-aware five-prayer timetable using AlAdhan, with Karachi defaults, Hanafi/Shafi Asr selection, calculation methods, manual adjustments and cached offline timings
- Prayer-aware conflict hints, optional prayer completion marks, and configurable prayer / bedtime notifications
- Canonical flexible activities with estimated durations, optional work, date-only deadlines, daily/selected-weekday repeats, per-occurrence completion and postponement
- Complete JSON backup and restore for core and new module data
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
- Wind down and sleep at 10:30 PM
- University blocks Monday, Wednesday, Thursday and Friday
- No university on Saturday; Tuesday and Sunday are non-class days
- Library blocks on Wednesday, Thursday and Friday

The default sleep schedule is 10:30 PM–5:30 AM. All timetable entries are editable. Existing saved routine entries are preserved when the routine data version is upgraded; the previous 9:30 PM sleep entry is migrated to 10:30 PM.

Prayer times default to Karachi (Asia/Karachi), the Karachi calculation method and Hanafi Asr. Change city coordinates, timezone, calculation method, Asr school, manual minute offsets and reminder preferences in Settings. Prayer times are retrieved from AlAdhan and cached locally for offline fallback. Flexible activities share the canonical schedule store but remain a separate planning category. Suggestions account for fixed events and prayer windows; fixed university classes and appointments are never moved automatically.

## Unified scheduling (Phase 6)
- One canonical schedule store now persists timed events, recurring series, occurrence exceptions, flexible activities and deadline tasks in schema version 3.
- The day-plan API combines fixed events, task instances, prayer/sleep anchors, conflict pairs and available time intervals. It never moves a fixed commitment automatically.
- The timetable workspace offers Timeline, Daily agenda, Flexible tasks and Weekly overview modes over the same schedule data.
- Daily and selected-weekday recurring events support stable occurrence IDs, per-date edits, skips and series-level changes while retaining existing exception records.
- Flexible activities support estimated duration, priority, optional deadlines, selected weekdays, completion history, postponement and optional start/end assignments.
- Settings retain the preferred week start and default activity estimate. Prayer anchors are fetched and cached for the selected date and the displayed week when connectivity is available.

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
- Use Export backup to save a JSON file, then Import backup on the destination device. The complete backup includes academic courses and assessments, habits and check-ins, and finance transactions and budget.
- Clearing browser or app data can erase local planner data. Keep a backup.
- Web notifications are checked while Daybook is open; background browser suspension can delay or prevent delivery.
- Android reminders use local notifications. Daily and weekly repeats are pre-scheduled as individual occurrences (30 daily or 12 weekly) and refreshed when Daybook opens, resumes or saves data. Keep opening the app periodically so the rolling schedule can refresh.
- Android 12+ exact delivery also depends on the system Alarms & reminders access. Daybook requests this through Android settings after notification permission is granted. Doze, battery management and device settings can still delay delivery; do not treat reminders as a guaranteed emergency alarm.

## Run and publish
Open `index.html` in a modern browser, or publish the repository with GitHub Pages. HTTPS is required for service workers and install features.

## Android build
The Android APK is built with Capacitor through GitHub Actions. Pushes to `main` that change app or build files trigger the **Build Daybook Android APK** workflow. A successful workflow uploads an installable debug APK artifact. The debug APK is for personal testing, not a Play Store release; a signed release requires a private signing key and release configuration.
