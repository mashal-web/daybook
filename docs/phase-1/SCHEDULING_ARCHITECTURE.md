# Daybook Scheduling Architecture

**Status:** Target specification; existing behaviour must be preserved.  
**Baseline:** `9aeb4d54c4e6f2727db6674f4060cfe62a270d0e`

## 1. Existing engine

Verified `scheduling.js` is an IIFE exposing `window.DaybookSchedule.create({storage, classes, routine, sessions})`; app stores its instance as `window.DaybookScheduleStore`.

Existing API includes event CRUD/duplication; date/week/upcoming queries; occurrence IDs; create/update/delete exceptions; task CRUD/date queries; day-plan assembly; overlap/conflict detection; available slots; legacy sync; health/migration flags. Recurrence currently supports none/daily/weekly. Exception kinds are modified, rescheduled and cancelled. Stable occurrence ID is derived from series ID + original date.

Current event and task schema details are documented in DATA_MODEL_SPECIFICATION.md. Do not replace the engine without equivalent regression fixtures.

## 2. Target ownership and interfaces

Scheduling domain owns EventSeries, EventException, recurrence expansion, event occurrence materialisation, conflict detection and available intervals. Task domain owns task lifecycle and task occurrences; Schedule application service composes tasks with events and anchors.

Proposed application query interface:
- `getDayPlan(date, timezone, options)`
- `getRangePlan(startDate, endDate, timezone, options)`
- `getOccurrences(range, timezone)`
- `getUpcoming(fromInstant, limit)`
- `getConflicts(range)`
- `getAvailableSlots(date, constraints)`
- `createEvent(input)`, `updateSeries(id, patch, policy)`, `editOccurrence(occurrenceId, patch)`, `cancelOccurrence(occurrenceId)`, `deleteSeries(id, policy)`
- `scheduleTask(taskId, interval)`, `unscheduleTask(taskId)`

All UI consumers use these interfaces. No page reads schedule storage directly.

## 3. Event lifecycle

Draft -> validated -> persisted -> materialized as occurrence(s) -> optionally modified/rescheduled/cancelled -> completed/past -> archived/deleted.

- EventSeries stores the recurring rule and original local wall-time.
- Occurrences are generated on demand for a bounded date range; do not persist an unbounded expanded calendar.
- EventException is keyed by stable series+original date, not the moved date.
- A modified exception overrides selected fields only.
- A rescheduled exception moves one original occurrence but preserves original identity.
- A cancelled exception suppresses that occurrence.
- Series deletion/archive prevents future expansion; history policy determines retained past instances.

## 4. Recurrence and exception precedence

First release supports none, daily and weekly with optional start/end dates. Weekly weekday convention is explicitly Sunday=0 through Saturday=6 for compatibility with existing JavaScript implementation.

For each candidate occurrence:
1. Check series active/deleted status and recurrence date bounds.
2. Determine whether original date matches recurrence.
3. Materialize base occurrence in series timezone.
4. Find unique exception for (seriesId, originalDate).
5. Cancelled exception suppresses it.
6. Modified/rescheduled override applies only allowed fields.
7. Resolve the final instant interval and include it if it intersects the requested range.

A rescheduled occurrence is indexed by its final start date for range queries, while identity remains tied to original date. Exception uniqueness must be enforced by database constraint.

## 5. Series and occurrence editing

- “This event”: create/update one EventException.
- “This and future”: split series at selected original occurrence; old series ends before split; new series starts at split with copied rule and selected changes; migrate later exceptions to the new series using explicit mapping. Require confirmation and transaction.
- “Entire series”: update series fields; retain exceptions only when still valid. If a recurrence change invalidates exceptions, block and explain or require explicit cleanup; never silently discard.
- “Delete this occurrence”: cancelled exception.
- “Delete series”: archive/cancel future occurrences and preserve past activity history per policy.

Current engine blocks recurrence updates that would invalidate existing exception dates and removes all exceptions on series deletion. Preserve this safe behaviour until a deliberate history-preserving migration is implemented.

## 6. Time model

Store local date/time and IANA timezone for wall-clock events (classes, routines, prayer anchors), and resolve each occurrence to an instant for comparisons and notifications. Do not treat a naive local string as UTC.

- One-off instant-based appointments may additionally store UTC instant.
- All-day events are date intervals, not midnight UTC timestamps.
- Duration is elapsed minutes unless event is explicitly wall-clock anchored; document which mode applies.
- Overnight events have end on the next local date when end wall time is earlier than start, or explicit end date for multi-day.
- Multi-day events use half-open intervals [start,end) and appear in every intersected date.
- Daylight-saving gap: reject or request a user choice for nonexistent local time; do not silently shift.
- Daylight-saving fold: require earlier/later offset choice or deterministic documented policy.
- Device timezone change does not silently reinterpret an event with an explicit timezone.
- Current engine uses local Date parsing and YYYY-MM-DDTHH:mm strings. This is suitable for local-only compatibility but does not fully encode explicit timezone/DST policy; upgrade with migration tests.

## 7. Conflict detection

Use half-open intervals [start,end); events touching at boundaries do not conflict. Detect conflicts after resolving local times to instants. Distinguish:
- hard conflicts: fixed classes/appointments/prayer anchors overlap;
- soft conflicts: flexible tasks overlap or exceed available capacity;
- informational: all-day or no-end records where exact interval is unknown.

Conflict is advisory by default. Save requires explicit confirmation only where product policy demands it; never silently shift a protected event.

## 8. Available time and Smart Planner

Available slots are derived from configured planning window minus occupied intervals. Constraints include day start/end, minimum slot, buffers, sleep, prayer preparation/duration, fixed events and user-selected protected blocks.

Current default engine window is 06:00–23:00 with a minimum gap default of 15 minutes (confirm exact defaults against implementation before changing). Current availableSlots logic clips intervals to a single day; overnight and multi-day clipping must be expanded in target implementation.

Smart Planner:
1. Load canonical tasks and event occurrences for selected date/range.
2. Include prayer/sleep anchors from Prayer/Preferences adapter.
3. Preserve fixed events and protected anchors.
4. Rank eligible tasks using priority/deadline profile.
5. Propose slots; no auto-write unless user explicitly accepts.
6. On acceptance, persist schedule assignment through task/event use case.
7. Recalculate after every relevant update.

## 9. Task scheduling

A task can be unscheduled, date-planned, deadline-only or assigned a timed slot. Its deadline is not automatically its scheduled time. Repeating tasks have occurrence records and per-occurrence completion; one-off task completion changes task status. Postponement records the prior occurrence/date and new date, not destructive replacement of the due date.

## 10. Shared consumer contract

| Consumer | Query |
|---|---|
| Home | getDayPlan(today) + upcoming deadlines |
| Agenda | getDayPlan(selectedDate), sorted chronological |
| Smart Planner | getDayPlan(date) + getAvailableSlots(date) |
| Calendar | getRangePlan(month range) |
| Timetable | getRangePlan(week range) and selected-day plan |
| Statistics | activity/occurrence history; not schedule UI arrays |
| Notifications | occurrence query + notification rules |

No consumer may keep a separate schedule cache as authoritative. UI caches are disposable and invalidated by application events.

## 11. Scheduling acceptance matrix

- Daily/weekly recurrence respects inclusive start/end date and weekday semantics.
- Occurrence IDs remain stable after series edits that do not change identity.
- Cancelled occurrence never appears; modified fields override only selected fields.
- Rescheduled occurrence appears on destination date and not original date.
- “This and future” creates valid split and preserves exception history.
- Overlap detection uses resolved instants and half-open boundaries.
- Overnight and multi-day events appear in every intersected date exactly once.
- DST gap/fold behaviour is deterministic and tested in at least two IANA zones.
- Date/week/month/Home/Agenda/Smart Planner return equivalent records for overlapping ranges.
- Available slots never overlap protected commitments and obey configured day bounds.
- Invalid or unknown timezone input fails validation without changing stored data.
