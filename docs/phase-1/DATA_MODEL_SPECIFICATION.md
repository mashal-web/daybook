# Daybook Data Model Specification

**Status:** Proposed canonical target schema; baseline facts are labelled separately.  
**Baseline:** `9aeb4d54c4e6f2727db6674f4060cfe62a270d0e`

## 1. Existing data evidence

### Existing canonical schedule store
`scheduling.js` uses storage key `daybook_schedule_v1`, payload `{version:3, events, exceptions, tasks}`. Schedule version 1 migrates to current events; version 2 adds exceptions and initializes tasks. Invalid data blocks writes and attempts legacy fallback without deleting the unreadable raw record.

**Event fields currently normalized:** id, title, category, type (class/routine/study/event), start, end, allDay, recurrence (frequency daily/weekly/none, weekdays, startDate, endDate), description, notes, location, priority, status, reminder, createdAt, updatedAt, source, metadata.

**Exception fields:** seriesId, occurrenceId, originalDate, type (modified/rescheduled/cancelled), override, modifiedAt. Stable occurrence identity is derived from series ID and original date.

**Flexible task fields:** id, title, category, kind (fixed/flexible/optional/task), priority, durationMinutes, planDate, dueDate, postponedTo, postponedFrom, repeat, weekdays, repeatStart, repeatEnd, completedDates, status, scheduledStart, scheduledEnd, notes, createdAt, updatedAt, source.

### Existing legacy keys
`app.js` stores `daybook_subjects`, `daybook_classes`, `daybook_routine`, `daybook_tasks`, `daybook_sessions`, `daybook_reminders`, `daybook_goal`, `daybook_settings`, plus `daybook_focus`. `upgrade.js` adds `daybook_academic_courses`, `daybook_academic_assessments`, `daybook_habits`, `daybook_habit_checks`, `daybook_finance`.

Existing evidence:
- Subjects are strings; defaults are seven current course names.
- Legacy classes use day (0-6), start/end time, subject, optional room and IDs.
- Routine entries use day, time, title and ID.
- Study sessions include id, subject, topic, date, minutes, done and completedAt.
- Goal is a number (weekly study target default 10).
- Settings include timeFormat, theme, defaultDuration, weekStart, priorityProfile.
- Academic courses are objects initially shaped as {id,name,code,credits}; assessments are object records but detailed full validation is not centralized.
- Habits are {id,name,category}; checks are an object keyed by date to arrays of habit IDs.
- Finance is {budget,transactions}; transactions include id,type,category,amount,date,note.
- Reminder and legacy task shapes require continued field-level audit before schema conversion; do not assume fields not shown here.

## 2. Canonical target model

All IDs are stable opaque strings (UUID preferred). Timestamps are ISO-8601 UTC instants. Calendar dates are `YYYY-MM-DD`; local wall times are `HH:mm`; timezone is an IANA identifier. Use soft deletion for user-facing records where historical references matter; immutable history is retained.

| Entity | Required fields | Optional fields / relationships |
|---|---|---|
| EventSeries | id, title, type, startLocal, timezone, recurrence, status, createdAt, updatedAt | endLocal, allDay, location, description, category, priority, reminderRule, metadata, deletedAt |
| EventException | id/occurrenceId, seriesId, originalLocalDate, kind, modifiedAt | override fields; unique seriesId+originalLocalDate |
| Task | id, title, status, priority, createdAt, updatedAt | dueAt/date, plannedDate, durationEstimate, courseId, assessmentId, category, notes, recurrence, completion records, deletedAt |
| TaskOccurrence | id, taskId, occurrenceDate, status | completedAt, postponedTo, notes; unique taskId+occurrenceDate |
| Course | id, name, createdAt, updatedAt | code, credits, term, instructor, color token |
| Assessment | id, title, kind, dueAt, status, courseId | description, weight, score, reminderRule, createdAt, updatedAt |
| FocusSession | id, startedAt, endedAt, durationSeconds, status | courseId, taskId, mode, interruptionCount, notes |
| Habit | id, name, recurrence, activeFrom, status, createdAt, updatedAt | category, targetPerPeriod, reminderRule, archivedAt |
| HabitOccurrence | id, habitId, localDate, status | completedAt, note; unique habitId+localDate |
| Goal | id, title, period, metric, targetValue, startDate, endDate, status | unit, linkedEntityType/id, createdAt, updatedAt |
| PrayerSettings | id, latitude, longitude, timezone, method, asrSchool, offsets, preparationMinutes, durationMinutes | cityLabel, reminder preferences |
| NotificationRule | id, ownerType, ownerId, channel, offsetMinutes, enabled | recurrence, payload template, createdAt, updatedAt |
| NotificationDelivery | id, ruleId, occurrenceKey, scheduledAt, status | deliveredAt, platformId, failureCode |
| UserPreferences | id, theme, timeFormat, weekStart, timezone, locale | defaultDuration, priorityProfile, accessibility options |
| ActivityRecord | id, type, occurredAt, localDate, sourceType, sourceId | duration, value, metadata; append-only where feasible |
| FinanceTransaction (optional) | id, type, amountMinor, currency, date, category | note, createdAt, updatedAt, deletedAt |

## 3. Validation rules

- IDs must be nonempty and unique within entity type; reject duplicate imports unless deterministic deduplication proves same source identity.
- Titles/names are trimmed, nonempty and length-limited.
- Date and time must parse strictly; reject impossible calendar dates and invalid IANA timezone identifiers.
- Event end must be after start in resolved instant space. Null end means an explicitly open-ended/unknown duration, not zero duration.
- Event recurrence is validated as a rule; exception must point to an actual occurrence in the series.
- Task duration estimates are integer minutes within 1..1440; due date and planned date are independent.
- Assessment courseId must reference an existing course or be null by explicit choice.
- Focus session duration is derived from instants; completed sessions require endAt >= startAt.
- Habit occurrence unique by habit/date; completion timestamp required for completed status.
- Goal target must be finite and positive (or nonnegative only for explicitly defined metrics); metric/unit must be compatible.
- Prayer coordinates within latitude/longitude bounds; timezone must be valid; method and school from supported enumerations.
- Currency amounts stored as integer minor units to avoid floating-point arithmetic.
- Notification occurrence key unique per rule/owner occurrence to make reconciliation idempotent.

## 4. Relationships and deletion

- EventSeries 1:N EventException; deleting a series is a soft delete/archive by default, with explicit permanent delete only after exception cleanup/confirmation.
- Course 1:N Assessments, FocusSessions and Tasks. Course deletion should detach references or archive course; it must not delete history.
- Task 1:N TaskOccurrence and optional FocusSessions. Deleting task should preserve completed focus history and task completion audit.
- Habit 1:N HabitOccurrence. Archiving a habit preserves history.
- Goal may link to a metric or entity but progress is derived, not duplicated as mutable percentage.
- Notification rules reference owner records; deleting/archiving owner disables rules and cancels pending deliveries.
- Prayer settings are a single active configuration profile in first release; later profiles may be supported.
- Activity records reference source records by typed source reference; source deletion must not erase history.

## 5. Canonical ownership and legacy compatibility

**Canonical owners**
- Events and event exceptions: Scheduling repository.
- Flexible/plannable tasks: Task repository/domain (initially schedule store's tasks may be wrapped by TaskRepository for compatibility).
- Legacy classes/routine/study sessions: imported into canonical event/activity records; legacy arrays become compatibility export/read projections only during transition.
- Legacy task objects: deterministic mapping to canonical task ID with `source.kind=legacy-task`; never create a second visible task.
- Subjects: migrate to Course records; preserve old string array until migration verified.
- Assessments, habits/check-ins, focus sessions, goals, reminders, preferences and finance each have one repository owner.

### Read/write contracts
- Reads return normalized domain records, never raw storage values.
- Writes go through repositories/use cases and return committed records or typed failures.
- Views do not write legacy keys.
- During transition, a single LegacyCompatibilityAdapter reads old keys, imports once, records migration marker and can generate compatibility projections for older app versions.
- A write transaction updates canonical records and migration metadata atomically. Do not maintain independent legacy and canonical mutable copies.

## 6. Migration rules

1. Preserve raw legacy keys and create a pre-migration backup snapshot.
2. Read and validate all candidate records without mutation.
3. Build deterministic mapping IDs; use source namespace + legacy ID to make reruns idempotent.
4. Write canonical records and migration journal/marker in one database transaction.
5. Re-read and compare counts, identifiers and key fields.
6. Mark migration complete only after verification.
7. Keep legacy keys for at least two stable releases and until backup/restore tests prove rollback.
8. On failure, rollback canonical transaction; retain original keys and present recovery status.
9. Never “fix” corrupt legacy data by silently replacing it with defaults.
10. Backup export contains canonical stores plus preserved legacy compatibility payloads during transition.

## 7. History and analytics integrity

Current state alone cannot support accurate historical analytics. Add explicit occurrence and activity records for task completion, habit check-in, focus session, assessment status changes and goal snapshots where historical target changes matter. Streaks, completion percentages and goal progress are queries, not source-of-truth counters.

## 8. Schema versioning

Use a top-level database schema version and per-store record version only when needed. Every migration is deterministic, ordered, transactional and tested against fixtures from each released backup version. Unknown future schema versions are rejected before writes. Backup envelope records appVersion, schemaVersion, exportedAt, stores, counts and integrity metadata.
