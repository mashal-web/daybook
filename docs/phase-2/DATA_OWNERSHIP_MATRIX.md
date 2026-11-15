# Daybook Phase 2 — Data Ownership Matrix

**Repository baseline:** `825c75208fdf577fa666008276e9b1e1f5353153`  
**Inspection target:** `main` at the baseline, with Phase 2 implementation reviewed on `phase-2/canonical-data-compatibility`.  
**Status:** Source-inspected; no database migration performed.

## Ownership principles

- `daybook_schedule_v1` is the canonical owner for schedule events, recurrence exceptions and scheduling tasks.
- Existing feature keys remain authoritative for their non-scheduling records. Schedule entries projected from classes, routines and timed study sessions are compatibility projections, not replacements for their source records.
- Legacy keys are retained. Phase 2 does not remove or rename storage keys.
- The persistence wrapper journals individual writes and exports all `daybook_*` keys except its internal write journal.
- A source adapter must not silently discard a record it cannot normalize. The task synchronizer refuses the whole synchronization if an input task is malformed or duplicate, or contains an unsupported recurrence or invalid weekday/completion-history values, leaving the existing canonical task set unchanged.

## Domain inventory

| Domain | Storage key(s) observed | Owner and actual representation | Read/write and compatibility paths | Risks and ownership decision |
|---|---|---|---|---|
| Events | `daybook_schedule_v1` | `scheduling.js`; `{version, events, exceptions, tasks}`; event records have IDs, local start/end timestamps, recurrence, status, reminders, source and metadata | `DaybookSchedule.create()` creates `window.DaybookScheduleStore`; app event CRUD and schedule views use the instance | Canonical event owner. Do not duplicate event records in feature-specific keys. Events without an end time have unknown duration and must not be treated as bounded availability. |
| Recurrence exceptions | `daybook_schedule_v1.exceptions` | `scheduling.js`; exception records identify series ID, original date, occurrence ID, type and optional override | Instance methods `getExceptions`, `getException`, `createException`, `updateException`, `deleteException`; Agenda queries materialized occurrences | Same transactional document as the series. Deleting a series removes dependent exceptions. Preserve exception identity and reject recurrence edits that orphan exceptions. |
| Tasks | Canonical `daybook_schedule_v1.tasks`; legacy `daybook_tasks`; older `daybook_flexible_activities_v1` | Canonical task schema in `scheduling.js`; legacy app tasks use fields such as `due`, `done`, `durationMinutes`, notes and IDs; flexible legacy records use `duration`, plan/due dates, recurrence and completion data | `app.js` calls `syncLegacy(..., data.tasks)`; `canonicalLegacyTasks()` adapts canonical tasks for legacy task UI. `flexible-activities.js` imports the older flexible key into the same canonical task collection. | Canonical owner is schedule store. Legacy keys remain readable and are not deleted. Explicit mapping and unknown-field retention are required; invalid or duplicate task input now blocks task synchronization. |
| Classes | `daybook_classes`; projected into `daybook_schedule_v1.events` | `app.js` owns legacy weekly class records: ID, weekday, start/end, subject and room. `scheduling.js` projects them to weekly events with source kind `class`. | Timetable CRUD writes `data.classes`; `persist()` calls `syncLegacy`; schedule views query the canonical instance. | Keep class source records for existing forms and subject operations. Projection IDs are derived from legacy identity; do not delete the source key. |
| Routines | `daybook_routine`; `daybook_routineVersion`; projected into schedule events | `app.js` owns legacy routine entries: ID, weekday, time, title, optional end, category and location. Schedule projection uses source kind `routine`. | Routine editor writes legacy array; `syncLegacy` projects to canonical events. Routine version migration runs in `app.js`. | Preserve custom routine entries and version metadata. Do not interpret projected events as a second owner. |
| Study sessions | `daybook_sessions`; timed projections in `daybook_schedule_v1.events` | `app.js` owns historical/planned session records: ID, subject, topic, date, minutes, done, notes, optional startTime and completion timestamp. Only valid dated sessions with a valid start time and duration become timed schedule projections. | Study planner and focus timer write `data.sessions`; `syncLegacy` projects eligible sessions; analytics read historical sessions. | Historical session record remains canonical for study history. Schedule projection is not a substitute for session history. Untimed sessions remain history, not calendar commitments. |
| Subjects | `daybook_subjects`; names also represented in `daybook_academic_courses` | `app.js` owns the simple subject-name list; `upgrade.js` owns academic course records with IDs, name, code and credits. | Subject manager writes names; academic module seeds courses from subjects and notifies app when courses change. | There are two representations. Do not merge or delete either key without a separate, tested academic relationship migration. Session/class subject references are historical strings. |
| Assessments | `daybook_academic_assessments` | `upgrade.js`; records include ID, title, course name, kind, due date and done state. | Academic forms and assessment actions read/write through `upgrade.js`; backup snapshots the key. | Relationship is currently course-name based, not a verified stable course ID. Preserve exact course string until a dedicated relationship migration is approved. |
| Habits | `daybook_habits`; `daybook_habit_checks` | `upgrade.js`; habits are records with ID/name/category; check-ins are date-keyed arrays of habit IDs. | Habit CRUD and check-in UI in `upgrade.js`; dashboard reads both keys. | Keep definition and history separate. Removing a habit currently removes its definition; historical check-in IDs may remain. Do not rewrite history in this phase. |
| Focus | `daybook_focus`; completed sessions in `daybook_sessions` | `app.js`; timer state includes mode, duration, remaining, running and end timestamp. Completed focus intervals append study-session records. | Focus timer reads/writes `daybook_focus`; completed focus sessions append to `data.sessions`. | Timer state and session history are distinct. Do not infer a completed session from a timer state that was only running or paused. |
| Prayer | `daybook_prayer_settings_v1`, `daybook_prayer_cache_v1`, `daybook_prayer_log_v1` | `prayer-times.js`; settings, date/location/method keyed timing cache and prayer log. | Prayer module reads/writes through `DaybookPersistence.storage`; prayer intervals are projected as planner anchors; native reminders are derived from settings/cache. | Prayer cache is derived external data and may be stale/offline. Never treat missing cache as proof of no prayer commitment. Do not overwrite user settings during schedule synchronization. |
| Reminders | `daybook_reminders`; native OS notification state | `app.js` owns reminder records (title/date/time/repeat); `native.js` schedules/cancels Capacitor Local Notifications. | Reminder CRUD writes legacy key; native sync receives reminders plus derived prayer reminders. | OS scheduled notifications are external side effects, not a canonical app storage record. Reconciliation must remain idempotent; this phase does not change native notification semantics. |
| Finance | `daybook_finance` | `upgrade.js`; object with budget and transaction array. Transactions include ID, type, category, amount, note and date. | Finance forms, summary and delete actions read/write through `upgrade.js`. | Existing feature is preserved. No finance key or UI is removed or migrated. |
| Goals | `daybook_goal` | `app.js`; numeric weekly study-hours target (validated 1–100, default 10). | Goal dialog and analytics/dashboard read/write via app persistence helpers. | There is no separate goal-record collection in inspected source. Keep this scalar separate from Finance and scheduling tasks. |

## Persistence and backup boundaries

- `persistence.js` wraps browser `localStorage` with a write journal at `daybook_write_journal_v1` and schema marker `daybook_schema_version`.
- Snapshot enumerates keys beginning `daybook_`, excluding only the journal. Therefore canonical schedule, legacy keys, finance, prayer, focus, academic and habit data are included when present.
- Backup validation accepts app backup versions 1, 2 and 3. Older formats map known top-level legacy fields and extension fields into the `daybook_*` namespace.
- Import replaces keys present in the backup and uses a journal/rollback mechanism. This phase does not alter import/restore semantics.
- The legacy flexible key `daybook_flexible_activities_v1` is not deleted by its adapter and remains in backups.

## Phase 2 ownership changes

1. Canonical task normalization now retains unknown JSON properties and the legacy `duration` alias (except unsafe prototype-related property names) while canonical fields are written explicitly.
2. Legacy task synchronization maps known legacy fields to canonical fields, retains original aliases/custom data, and uses existing canonical values only when the current legacy record omits a field.
3. Invalid or duplicate task records and identity collisions reject synchronization before the canonical write.
4. Flexible-activity legacy conversion spreads the original record first, then explicitly normalizes known fields and retains the legacy key.
5. Agenda and Smart Planner now consume `window.DaybookScheduleStore`, not the `window.DaybookSchedule` factory.

## Limits of this inventory

This matrix records actual storage and consumers visible in the inspected files. It does not claim that every historical device backup has been collected or that all live user data shapes are known. Real-device localStorage contents were not available for inspection.