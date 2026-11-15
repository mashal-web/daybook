# Daybook Phase 2 — Legacy Compatibility Plan

**Status:** Implemented in the Phase 2 feature branch; targeted source execution completed. Full Node/npm and device validation remain outstanding.

## 1. Existing task representations discovered

### A. Main legacy task manager — `daybook_tasks`

The application loads this array into `data.tasks` in `app.js`. Observed editor fields include:

- `id`, `title`, `category`, `priority`
- `durationMinutes`
- `due`
- `notes`
- `done`, `completedAt`, `createdAt`

The application also contains compatibility reads/writes for `done`, `due` and `notes`. The previous scheduler mapping created a new object containing only a subset of these fields, which could discard description, planned date, recurrence, scheduled times, completion/postponement history, academic links, source metadata and custom properties when such properties existed on legacy records.

### B. Older flexible activity records — `daybook_flexible_activities_v1`

The `flexible-activities.js` adapter reads this key and creates canonical tasks. The observed mapping handled title, kind, priority, duration, plan/due dates, postponement destination, repeat, selected weekdays, repeat start, completion dates, status, notes and creation timestamp. It did not previously carry all additional fields, recurrence end, postponement origin or explicit scheduled timestamps into the canonical record.

The original legacy key is not removed by this adapter.

### C. Canonical task records — `daybook_schedule_v1.tasks`

The canonical task normalizer validates identity/title, dates, duration, recurrence, weekday list, completion dates, scheduled timestamps, status, notes, timestamps and source. It stores tasks in the same versioned schedule document as events and recurrence exceptions.

## 2. Phase 2 implementation

### Canonical normalization

- Added an explicit set of canonical task fields.
- Unknown JSON properties are copied into the normalized record before canonical fields are assigned.
- Canonical values are assigned explicitly after extras, so custom properties cannot overwrite the canonical identity or normalized fields.
- Prototype-sensitive names (`__proto__`, `constructor`, `prototype`) are excluded from copied extras.
- Original legacy aliases such as `due`, `done` and `duration` remain available as extra compatibility properties while canonical `dueDate`, `status` and `durationMinutes` are populated.

### Main legacy task synchronization

The adapter now merges the previous canonical compatibility record and current legacy record, then applies explicit canonical precedence:

| Canonical field | Mapping / precedence |
|---|---|
| ID | Existing canonical ID for the same legacy source; otherwise legacy ID |
| Title/category | Current legacy value, then previous canonical value; category defaults to Personal |
| Priority | Current legacy value, then previous value; normalized to lowercase |
| Duration | `durationMinutes`, then legacy `duration`, then previous canonical value, then 30 |
| Plan date | Current legacy value, then previous canonical value |
| Due date | `due`, `dueDate`, or `deadline`, then previous canonical value |
| Postponement | Current legacy values, then previous canonical values |
| Recurrence | Current legacy values, then previous canonical values; weekdays and boundaries retained |
| Completion history | Current `completedDates`, then previous canonical history |
| Status | Explicit legacy `done` wins when present; otherwise legacy/previous status |
| Scheduled times | Current values, then previous canonical values |
| Notes and timestamps | Current values, then previous canonical values |
| Source | Preserves source metadata and sets `kind: legacy-task` plus legacy ID |

The legacy record is not deleted or rewritten by the scheduler adapter. Existing app save paths continue to write the legacy key.

### Invalid and duplicate input

- A legacy task without an object shape, non-empty ID or normalizable title is rejected.
- If any mapped legacy task is invalid, the synchronization returns `false` before writing the canonical task collection.
- Duplicate IDs within incoming legacy tasks are rejected.
- Incoming legacy task IDs that collide with retained non-legacy canonical task IDs are rejected.
- Duplicate class/routine legacy IDs are deduplicated by the existing projection adapter (first encountered record wins); collisions between a projected event and a retained canonical event reject synchronization. Invalid class/routine/study projection records may be omitted from the canonical projection, but their original legacy records are not deleted.
- The canonical task array remains unchanged on these rejection paths.

This is intentionally conservative: a malformed legacy record must be repaired or separately inspected rather than silently filtered out during synchronization.

### Flexible activity adapter

The older flexible activity adapter now spreads the original record first, then explicitly supplies normalized fields. It retains custom properties, source metadata, recurrence boundaries, postponement origin/destination, completion dates, scheduled start/end and legacy aliases where present. It still does not delete the original legacy key.

## 3. Identity, idempotency and conflict policy

- Canonical identity remains stable for a previously synchronized legacy task.
- Legacy task source identity is `source.kind === "legacy-task"` plus `source.legacyId`.
- A current legacy value wins only when the corresponding property is present; absent values fall back to the previous canonical record.
- Canonical normalized fields are written after custom extras.
- Synchronization compares the resulting event/task arrays before writing, so a repeated identical sync does not rewrite records.
- Duplicate or malformed input rejects the synchronization instead of choosing a winner silently.
- This policy does not resolve two different legacy IDs that happen to describe semantically similar tasks; they remain distinct records unless their IDs collide.

## 4. Test fixtures added

The existing `scripts/verify.js` now includes executable cases for:

1. Minimal legacy task.
2. Fully populated legacy task.
3. Weekly recurrence and selected weekdays.
4. Completion history.
5. Postponement origin and destination.
6. Academic relationship field.
7. Description, notes, custom metadata and unknown properties.
8. Planned and due dates.
9. Scheduled start/end.
10. Repeated synchronization/idempotency.
11. Malformed task rejection without canonical overwrite.
12. Duplicate task ID rejection.
13. Date-range query and recurring occurrence completion API.

The fixtures are representative of the field shapes observed in the source adapters and current task model. They are test data, not a claim that every historical user's live storage has been inspected.

## 5. Recovery and rollback

- No legacy key is deleted.
- No production storage version was incremented.
- No bulk migration was run against user data.
- A rejected `syncLegacy` returns `false`; the caller's legacy array remains the source record.
- The persistence layer's existing write journal and backup/restore behavior were not modified.
- Existing canonical schedule data that cannot be parsed continues to block writes.

## 6. Known limitations

- Live user localStorage records were not accessible, so no actual device data sample was examined.
- The flexible adapter still catches per-record conversion exceptions without surfacing a structured migration report. The original record remains in the legacy key, but the UI does not yet present a per-record remediation queue.
- Main task compatibility remains dual-read/dual-write at the application boundary; a later phase may remove the legacy adapter only after export/import and historical-device coverage is proven.
- Canonical task normalization supports recurrence types `none`, `daily` and `weekly`. Unsupported recurrence values, invalid weekday entries and malformed completion-history dates are rejected before canonical writes; they are not silently converted to one-off tasks or filtered out. The original legacy record remains in its source key for recovery.
- Full browser, Android and physical-device verification remains unperformed.
