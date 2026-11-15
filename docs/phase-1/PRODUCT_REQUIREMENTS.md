# Daybook Product Requirements

**Status:** Phase 1 specification — proposed, not implemented  
**Baseline:** `9aeb4d54c4e6f2727db6674f4060cfe62a270d0e`  
**Product:** Offline-first personal productivity and life-management application

## 1. Product vision

Daybook is a unified personal operating environment for planning time, managing responsibilities, supporting academic work, maintaining routines and prayer practices, and reviewing measurable progress. It should make the user's day understandable at a glance and make changes to one responsibility visible everywhere they matter.

The product is local-first: core records are available without a network connection, the user's device remains the primary data owner, and cloud synchronisation is not required for the first complete release.

### Product principles
1. One canonical record per real-world item.
2. One scheduling engine for every timetable, agenda, calendar and planner view.
3. Offline access and recoverable local data are core requirements, not enhancements.
4. A suggested plan never silently moves protected commitments.
5. Historical activity is recorded as events, not reconstructed from current state.
6. Progressive complexity: ship reliable core workflows before advanced automation.
7. Web and Android share domain and application logic; platform-specific behaviour is isolated.

## 2. Target users and primary workflows

Primary user: an individual managing personal routines and university responsibilities on a phone, with optional desktop access.

| Workflow | User outcome |
|---|---|
| Plan a day | See commitments, tasks, prayer anchors, free time and the next useful action |
| Weekly timetable | Maintain recurring university classes and routines; inspect a chosen day |
| Academic work | Organise courses, assignments, quizzes, exams and projects |
| Study | Start focus sessions, associate them with a course, and review actual study history |
| Habits | Define recurring habits, check in, inspect missed days and trends |
| Prayer | View five prayer times for a configured location and timezone, with offline fallback |
| Goals | Define measurable targets and see progress against recorded activity |
| Review | Compare daily, weekly and monthly activity without fabricated metrics |
| Reminders | Manage reminders and understand delivery/permission status |
| Offline | Read and edit local records without network access; recover after restart |

## 3. Navigation decision

### Final primary navigation
1. **Home** — daily dashboard.
2. **Explore** — templates, guides and reusable resources.
3. **Schedule** — calendar, agenda, daily and weekly timetable, Smart Planner.
4. **Statistics** — reports and historical progress.
5. **Profile** — preferences, notifications, prayer configuration and data management.

A persistent central **Quick Action** control opens a compact action sheet: add event, add task, start focus, check in habit, add academic assessment. It is an action launcher, not a sixth destination.

### Information architecture
- Calendar, Agenda, Timetable and Smart Planner are contextual views within Schedule. They must not own separate event collections.
- Tasks are a contextual list/filter within Home, Schedule and the task workspace under Explore (or a Schedule subview if task scheduling is the active task). Task records remain one canonical collection.
- Focus is an activity surface reachable from Home, Explore and Quick Action; its timer and session history are shared.
- Prayer is a contextual schedule anchor and a dedicated panel in Home/Profile settings, not a primary tab.
- Goals are created and reviewed in Statistics; goal summaries may appear on Home.
- Academics is an Explore subpage/section, with due work surfaced on Home and Schedule.
- Habits are an Explore subpage and Home check-in card.
- Finance already exists in the baseline. Preserve its records and expose it as an optional Profile/Explore module until a deliberate product decision promotes it.

### Navigation requirements
- Every route/view has a stable identifier and a working back path.
- Current destination is programmatically indicated.
- Deep links and refreshes must resolve to a valid view or Home fallback.
- On compact mobile screens use a five-item bottom navigation with a central action affordance; secondary views live in contextual navigation/sheets.
- Desktop may use a left navigation rail/sidebar, but labels and information architecture remain identical.

## 4. Page specifications

### Home
**Purpose:** answer “what matters today?” within seconds.

Sections: personalised greeting/date; daily progress; next scheduled item; today's unified timeline; priority/overdue tasks; upcoming academic deadlines; next prayer; focus shortcut/timer; habit check-ins; goal snapshot; concise daily metrics.

Data: user preferences, canonical schedule occurrences, tasks, assessments, prayer calculation/cache, habit occurrences, goals, activity records.

Actions: complete/reopen task; open event; add item; start/pause/reset focus; check habit; open deadline; change selected date; refresh.

Interactions: all cards link to their owning module; progress is derived from source records; no duplicate dashboard-only records.

States: first-run onboarding/empty day with clear add actions; skeleton only for genuinely asynchronous reads; local read failure with retry and data recovery guidance; partial prayer/network failure must not block other content.

Mobile: single-column, prioritised cards, compact timeline, safe-area-aware quick action. Desktop: two-column dashboard with timeline and supporting panels.

Dependencies: Schedule, Tasks, Academics, Focus, Prayer, Habits, Goals, Analytics.

### Explore
**Purpose:** discover reusable methods and manage supporting workspaces without bloating primary navigation.

Sections: academic workspace; task and habit workspaces; focus activities; productivity resources; study techniques; habit/routine templates; saved templates.

Data: resource catalogue (bundled/static initially), courses, assessments, tasks, habits and templates.

Actions: open a resource; preview/apply a template; create a course/assessment/task/habit; launch focus.

Interactions: templates are copied into user-owned records only after confirmation; applying a template never overwrites existing records.

States: empty saved resources; loading catalogue; offline message for remote-only optional resources; invalid template rejection.

Mobile: searchable stacked cards and subpage navigation. Desktop: grouped grid with a persistent subnavigation.

Dependencies: Academics, Tasks, Habits, Focus, Templates.

### Schedule
**Purpose:** a single operational surface for all time-based planning.

Views: day timeline, agenda/list, week timetable, month calendar, Smart Planner and available-time view. All views call the same application query and scheduling domain API.

Data: event series, occurrence exceptions, task schedules/deadlines, prayer/sleep anchors, timezone and week-start preferences.

Actions: create/edit/delete event; edit one occurrence or series; cancel/reschedule occurrence; change date range; switch view; inspect conflict; request available slots; place a flexible activity in a slot.

Interactions: explicit save/confirmation for destructive series operations; conflict warnings show both records; automatic planner may suggest but cannot move protected events without explicit user approval.

States: empty date/week; loading only when adapter is asynchronous; invalid date/range; storage read-only/degraded state; conflict and overlap states.

Mobile: day/week switcher and vertical timeline; month grid may open selected-day agenda rather than compress event details. Desktop: week/month grid plus detail panel.

Dependencies: Scheduling domain, Tasks, Prayer, Preferences, Notifications.

### Statistics
**Purpose:** show evidence-based progress and historical comparisons.

Sections: daily, weekly, monthly summaries; study duration/course breakdown; task completion and overdue trends; habit adherence; goal progress; optional finance summary.

Data: immutable activity/session records, task status history, habit occurrence history, goal targets, assessment results if entered, finance transactions where enabled.

Actions: change period; compare prior period; filter by course/module; inspect source records; export report.

Interactions: missing data displays “not enough history”, never zero/100% by implication; all totals disclose their period and calculation.

States: no history; partial historical coverage; calculation/read errors; long-range query loading.

Mobile: compact metric cards and vertically stacked charts/tables. Desktop: multi-column report panels with accessible data tables.

Dependencies: Activity ledger, Focus, Tasks, Habits, Goals, Academics, optional Finance.

### Profile
**Purpose:** configure the application and protect/manage personal data.

Sections: profile/preferences; appearance and accessibility; time/date and timezone; notifications/permissions; prayer location/method/school/offsets; data export/import/reset; storage health; app/platform/version/about.

Actions: edit preferences; request notification permission; test notification; export backup; preview and restore backup; clear data with explicit confirmation; inspect migration/storage health.

States: permission denied/unavailable; export failure; invalid backup; incompatible backup version; insufficient storage; interrupted migration recovery.

Mobile: grouped settings pages with clear back navigation. Desktop: settings navigation and content pane.

Dependencies: Preferences, Storage, Backup, Prayer, Notification adapters, Platform.

## 5. Feature scope and priorities

Priority meanings: **P0** core reliability and data safety; **P1** first complete release; **P2** advanced/secondary; **P3** optional future.

| Feature | Priority | Scope |
|---|---|---|
| Canonical schedule ownership and shared read API | P0 | One event/task source, no split-brain views |
| Storage integrity, backup and safe restore | P0 | Validated, recoverable, non-destructive migration |
| Event CRUD and recurrence/exception preservation | P0 | Existing daily/weekly behaviour retained |
| Correct Agenda/Smart Planner integration | P0 | Shared schedule API only |
| Task CRUD and completion/deadline integrity | P0 | Legacy records retained |
| Web/Android build and asset parity | P0 | Reproducible builds and packaged assets |
| Automated domain and storage regression tests | P0 | Run in CI |
| Unified day/week/agenda views | P1 | Shared canonical queries |
| Academic courses and assessments | P1 | Course relationships and deadline surfacing |
| Focus timer and session history | P1 | Recovery-safe timer and actual sessions |
| Habit recurrence/check-ins/history | P1 | Per-occurrence completion |
| Prayer times/settings/cache | P1 | Five prayers, local timezone, offline fallback |
| Notifications | P1 | Web in-app/foreground and Android local adapter with limits explained |
| Goals and measurable progress | P1 | Daily/weekly/monthly and long-term targets |
| Statistics and comparisons | P1 | Derived from actual records |
| Explore resources/templates | P2 | Bundled templates first |
| Finance workspace | P2 | Preserve current data and capability; optional module |
| Advanced recurrence (monthly/custom rules) | P2 | Only after daily/weekly correctness |
| Cloud sync and multi-device conflict resolution | P3 | Explicit opt-in, separate project |
| Shared calendars, collaboration, AI auto-planning | P3 | Deferred |

## 6. P0/P1 acceptance criteria

### P0
- **Canonical ownership:** create/update/delete an event once; Home, Agenda, Smart Planner, Calendar and Timetable show the same result after refresh and restart.
- **Legacy compatibility:** migration imports every valid supported legacy record exactly once; legacy source data is not deleted; rerunning migration is idempotent.
- **Scheduling regression:** daily/weekly recurrence, stable occurrence IDs, cancelled/modified/rescheduled exceptions and series edits retain existing supported semantics.
- **Task integrity:** task changes persist once; legacy tasks map to canonical IDs without duplicate display or loss of completion/deadline/notes.
- **Backup:** invalid, unsupported, corrupt or oversized backup is rejected before writes; cancellation leaves current data byte-for-byte unchanged; restore is atomic; failed restore rolls back; export includes every canonical and retained legacy dataset.
- **Storage recovery:** interrupted writes are detected; app enters safe read-only/recovery mode rather than overwriting unreadable records.
- **Android/web parity:** all runtime assets exist in built output; CI checks required files; native module imports resolve; service-worker cache includes versioned assets.
- **Testing:** domain/storage tests run in CI and fail the build on regression; no network is required for core domain tests.

### P1
- **Schedule views:** day, week, agenda and month use identical event occurrences and filters; switching view does not mutate records.
- **Academic records:** assessment belongs to a valid course or is explicitly unassigned; deadlines appear on Home and Schedule.
- **Focus:** pause/resume/reload preserves elapsed time accurately; only completed focus sessions are counted; interrupted sessions are not falsely recorded as complete.
- **Habits:** check-in is unique per habit/date; editing recurrence does not rewrite historical check-ins; missed occurrences remain distinguishable from unchecked future occurrences.
- **Prayer:** five named prayers are displayed for configured location/date/timezone; sunrise is not counted as a prayer; calculation method, Asr school and offsets are persisted; cached timings work offline with visible freshness.
- **Notifications:** denied permissions are represented accurately; scheduling is idempotent; stale notifications are cancelled/reconciled; app does not claim guaranteed background delivery.
- **Goals/statistics:** progress is calculated from source activity and target; historical reports are deterministic for a selected timezone/date range; insufficient data is labelled.
- **Preferences:** theme/time format/week start/timezone survive reload and backup restore.
- **Accessibility:** all controls keyboard/touch accessible, labels exposed, focus visible, contrast verified, reduced-motion respected.

## 7. Non-functional requirements
- Offline-first reads and writes for core modules.
- No silent destructive actions or automatic deletion of legacy data.
- Core interface usable on 360px-wide Android devices and desktop.
- No mandatory login or cloud service.
- No heavy UI framework unless migration ADR proves value.
- Avoid blocking startup with nonessential remote resources.
- Data export remains user-accessible and documented.

## 8. Out of scope for first complete release
Real-time multi-device sync, collaboration, AI scheduling, social features, public resource marketplace, guaranteed alarm-clock reliability, and advanced arbitrary recurrence rules. These require separate product and risk decisions.
