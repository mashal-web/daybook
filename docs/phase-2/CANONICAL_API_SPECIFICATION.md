# Daybook Phase 2 — Canonical Scheduling API Specification

**Implementation:** `scheduling.js`  
**Factory:** `window.DaybookSchedule.create(options)`  
**Instance:** `window.DaybookScheduleStore` (assigned by `app.js`)  
**Storage key:** `daybook_schedule_v1`  
**Schedule schema version:** 3

## Factory versus instance

`window.DaybookSchedule` is a factory object. It exposes `create(options)`; it is not a schedule store and does not expose `getForDate`, `getTasks` or planning queries.

The application creates the instance once:

```js
const scheduleStore = window.DaybookSchedule.create({
  storage: window.DaybookPersistence.storage,
  classes: data.classes,
  routine: data.routine,
  sessions: data.sessions
});
window.DaybookScheduleStore = scheduleStore;
```

Consumers must query `window.DaybookScheduleStore` (or a locally captured reference to that instance). Do not call query methods on the factory.

## Public interface

All returned records are cloned/materialized values; callers must use mutation methods rather than changing returned objects. Date values are local calendar dates in `YYYY-MM-DD`; event timestamps are local date-times in `YYYY-MM-DDTHH:mm`.

### Events

| Method | Input | Return / behavior |
|---|---|---|
| `getAll()` | None | Clone of all canonical event series records, not expanded occurrences. |
| `getForDate(date)` | `Date` or ISO date string | Materialized occurrences overlapping that local date, sorted by start then title. Cancelled series/occurrences are omitted. |
| `getForDateRange(from,to)` | Inclusive start/end date | Deduplicated materialized occurrences across the inclusive range. Inputs must be `Date` objects or exact `YYYY-MM-DD` strings; invalid/reversed ranges and ranges over 3,660 calendar days return `[]`. Calendar-day span calculation is independent of local daylight-saving offsets. |
| `getForWeek(startDate)` | Date or ISO date string | Materialized occurrences for seven consecutive dates starting at the supplied date. |
| `getUpcoming(from,limit)` | Optional date/time and count | Upcoming materialized occurrences, capped at 500 results and 366 search days. |
| `createEvent(input)` | Event record | Persists and returns a normalized event clone. Invalid input or duplicate ID throws; storage failure returns `null`. |
| `updateEvent(id,patch)` | Existing event ID and partial record | Persists and returns updated event clone; unknown ID returns `null`; invalid patch throws. Existing exceptions prevent recurrence edits that would orphan their dates. |
| `deleteEvent(id)` | Event ID | Returns boolean. Series and its dependent exceptions are removed in one schedule write. |
| `duplicateEvent(id,overrides)` | Existing event ID and optional overrides | Creates a new event with a new ID; unknown ID returns `null`. |

### Recurrence and occurrence exceptions

| Method | Input | Return / behavior |
|---|---|---|
| `getOccurrenceId(seriesId,originalDate)` | Series ID and original date | Stable `occ:<encoded-series-id>:<date>` identity, or `null` when the date is not a valid occurrence. |
| `getExceptions()` | None | Clone of all exception records. |
| `getException(occurrenceId)` | Stable occurrence ID | Clone of one exception or `null`. |
| `createException(input)` | Series ID, original date, type and override | Creates `modified`, `rescheduled` or `cancelled` exception; invalid/non-recurring occurrence and duplicate identity throw. Persistence failure returns `null`. |
| `updateException(occurrenceId,patch)` | Existing occurrence ID and patch | Returns updated exception clone; unknown ID returns `null`; invalid patch throws. |
| `deleteException(occurrenceId)` | Stable occurrence ID | Returns boolean. |
| `getForDate(date)` | Date | Resolves recurrence and applies skip/modify/reschedule exceptions for that date. |

A series edit is performed with `updateEvent`. A single occurrence is modified by creating/updating an exception. A skipped occurrence is a `cancelled` exception. A rescheduled occurrence uses a `rescheduled` exception with an override start timestamp.

### Tasks

| Method | Input | Return / behavior |
|---|---|---|
| `getTasks()` | None | Clone of canonical task records (series/master records). |
| `getTasksForDate(date)` | Date or ISO date string | Task occurrences applicable to the date, including occurrence completion state. Cancelled tasks and postponed original dates are omitted. |
| `createTask(input)` | Task record | Persists and returns normalized clone; invalid task or duplicate ID throws; storage failure returns `null`. |
| `updateTask(id,patch)` | Existing ID and partial record | Persists and returns clone; unknown ID returns `null`; invalid task throws. |
| `deleteTask(id)` | Task ID | Returns boolean. |
| `setTaskCompletion(id,completed,occurrenceDate?)` | Task ID, boolean, optional occurrence date | One-off task updates `status`; recurring task adds/removes the supplied date in `completedDates`. Completion must be boolean and the date must be an active occurrence within recurrence boundaries and weekday rules (or the task's explicit postponed destination). Unknown ID returns `null`. |
| `syncTasks(items)` | Complete task array | Validates and replaces canonical task records; duplicate IDs or invalid records return `false`; write failure returns `false`. |

Canonical task fields include ID, title, category, kind, priority, duration, plan/deadline dates, postponement dates, recurrence configuration, completion dates, status, scheduled start/end, notes, timestamps and source. Unknown JSON fields are retained through normalization unless they are unsafe prototype-related keys. Unsupported recurrence values and malformed weekday/completion-history arrays are rejected rather than silently coerced or filtered.

### Availability, conflicts and day planning

| Method | Input | Return / behavior |
|---|---|---|
| `durationMinutes(item)` | Event/task-like item | Duration in minutes or `null` when not determinable. |
| `overlaps(a,b)` | Two timestamped items | Boolean overlap test. Items without valid bounded start/end do not form a calculable overlap pair. |
| `findOverlaps(dateOrItems)` | Date or explicit item array | Array of overlapping pairs. |
| `getDayPlan(date,options)` | Date and optional planning options | Object containing date, events, task occurrences, anchors, combined items, conflicts, available intervals and priority order; invalid date returns `null`. |
| `getAvailableSlots(date,options)` | Date and same options as day plan | Clone of the day plan's available intervals, or `null` for invalid date. |

Planning options used by the engine include `dayStart` and `dayEnd` minute offsets, `minimumMinutes`, optional `anchors`, and `priorityProfile` (`protected` or `deadline-first`). The default planning window is 06:00–23:00. Availability is a calculation from records with bounded times; unknown-end commitments must be treated as unresolved by consumers, not as proof of free time.

### Compatibility and health

| Method | Input | Return / behavior |
|---|---|---|
| `syncLegacy(classes,routine,sessions,legacyTasks)` | Current legacy arrays | Reconciles legacy class/routine/study projections and legacy tasks into canonical storage. Returns boolean. Invalid/duplicate task records, identity collisions, orphaned exceptions, blocked storage or failed write reject synchronization. |
| `isHealthy()` | None | Boolean storage/record health state. A malformed canonical schedule blocks writes to avoid overwriting unreadable data. |
| `wasMigrated()` | None | Whether an existing schedule version was migrated during instance creation. |
| `storageKey` / `version` | Properties | Current storage key and schema version. |

Schedule mutations dispatch `daybook-schedule-updated`. The event detail includes an `origin` string; consumers should avoid treating `legacy-sync` as a user edit.

## Task compatibility precedence

During `syncLegacy`:

1. Existing canonical identity for the same `source.kind === "legacy-task"` and `source.legacyId` is retained.
2. For fields present in the current legacy task, the current legacy value is authoritative.
3. When the legacy field is absent, the previous canonical value is retained.
4. Known aliases map explicitly: `due`/`deadline` to canonical `dueDate`; `done` to `status`; `duration` to `durationMinutes`; priority is lowercased. The original `due`, `done` and `duration` aliases remain available on the canonical compatibility record.
5. Original aliases and unknown JSON fields are retained for compatibility.
6. Duplicate legacy IDs, collisions with retained canonical task IDs, or malformed task records reject the synchronization before the canonical task write.

This is a compatibility adapter, not a database migration. Legacy source records remain in their original keys.

## Limitations and non-goals

- The engine remains synchronous and localStorage-backed.
- There is no cloud synchronization or cross-device conflict resolution.
- Date-time interpretation is local-device time; this API does not add timezone-aware event storage.
- Task placement is not automatic. The day plan calculates current commitments and intervals; the UI only displays candidate windows.
- Persistence errors use existing boolean/null/throw contracts rather than a new unified result type.
- No full UI rewrite or new scheduling algorithm is introduced.
