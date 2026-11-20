# Daybook Backup and Restore Specification

Status: **V4 format and transactional restore implementation are present.** Automated regression/failure-injection and browser verification are wired into the Phase 3 branch CI. Guarantees below are limited to the tested localStorage behavior described here.

## Version 4 envelope

A v4 export is JSON with these top-level fields:

- `app: "Daybook"` and `appId: "daybook"`: application identity.
- `version: 4`: backup-format version.
- `exportedAt`: ISO-8601 export timestamp.
- `schemaVersion: 1`: v4 envelope schema revision.
- `sourceSchemaVersion: 1`: source application data-schema version.
- `manifest`: one entry for every key in the fixed allowlist.
- `data`: values keyed by the exact storage key named in the manifest.

Each manifest entry is `{ "key": "daybook_tasks", "status": "empty" | "populated" | "unsupported" }`. For `empty` and `populated`, a corresponding data entry is mandatory and its value must match the declared store type and status. An `unsupported` entry has no data entry and is preserved without replacement. The current exporter supports every allowlisted store, so it emits only `empty` and `populated`.

The manifest must contain every allowlisted key exactly once. Duplicate, missing, unknown, protected, unmanifested, missing-data, and contradictory entries are rejected. V4 import replaces every supported manifested store, including intentionally empty stores. No arbitrary storage key can be restored.

## Approved user-data storage allowlist

| Storage key | Shape |
|---|---|
| `daybook_subjects` | string array |
| `daybook_classes` | object array |
| `daybook_routine` | object array |
| `daybook_tasks` | object array |
| `daybook_sessions` | object array |
| `daybook_reminders` | object array |
| `daybook_goal` | number, 1–100 |
| `daybook_settings` | object |
| `daybook_focus` | object |
| `daybook_schedule_v1` | versioned schedule object with events and tasks arrays; optional exceptions array |
| `daybook_academic_courses` | object array |
| `daybook_academic_assessments` | object array |
| `daybook_habits` | object array |
| `daybook_habit_checks` | object |
| `daybook_finance` | object with non-negative budget and transactions array |
| `daybook_prayer_settings_v1` | object |
| `daybook_prayer_log_v1` | object |
| `daybook_flexible_activities_v1` | object array (legacy compatibility) |

The empty representation is an empty array for array stores, an empty object for object stores, an empty schedule object for schedule data, and a zero-budget/empty-transactions object for finance. The numeric weekly goal has no empty representation and is exported as its current value or default 10.

## Protected and excluded storage

- `daybook_schema_version`: application schema metadata; never imported or replaced.
- `daybook_routineVersion`: routine migration metadata; never imported or replaced.
- `daybook_write_journal_v1`: recovery infrastructure; never exported or imported.
- `daybook_prayer_cache_v1`: API cache; never exported or imported. A v3 historical copy is recognized and ignored.
- `web-prayer:{name}:{date}` and `web-sleep:{date}`: transient notification-sent flags; not user data and not included.
- Service-worker caches and static application assets are outside backup scope.

The allowlist is intentionally fixed in code. A `daybook_` prefix alone does not authorize restoration.

## Legacy compatibility

### V1 and V2

The explicit legacy field map covers subjects, classes, routine, tasks, sessions, reminders, goal and settings. The historical `routineVersion` field is validated as migration metadata and ignored. The supported extensions map academic courses, academic assessments, habits, habit checks and finance. Explicitly allowlisted namespaced user-data keys are also accepted for historical compatibility. Unknown fields and unsupported namespaced keys are rejected.

Only represented data is migrated. Stores absent from a v1/v2 backup retain their current device values. These formats do not imply an empty value for a missing store and are never treated as exact replacement snapshots.

### V3

V3 data keys must be in the allowlist, except for these explicitly recognized historical metadata/cache entries:

- `daybook_schema_version` must equal numeric `1`; it is ignored.
- `daybook_routineVersion` must be an integer from 0 through 3; it is ignored.
- `daybook_prayer_cache_v1` must be an object; it is ignored.

The top-level historical `schemaVersion` remains format metadata. Unknown storage keys are rejected. Absent stores retain their current values; v3 is not an exact replacement snapshot.

### V4

V4 requires the complete manifest and validates each manifest/data pair. Supported stores are replaced exactly as declared; empty values intentionally clear that store. Unsupported manifest entries are explicit and are not changed. V4 does not accept extra data keys or metadata keys.

## Implementation boundary

Implemented in this phase: v4 export envelope and complete manifest; fixed allowlist; explicit type/status validation; v1/v2 legacy mappings; v3 historical schema/routine metadata and prayer-cache handling; rejection of unknown keys; regression tests for format validation and round-trip export validation.

Not claimed complete here: transactional restore hardening, crash/recovery fault-injection coverage, full import preview/two-stage confirmation, and end-to-end proof that all user-visible restore flows replace data safely. Those require the remaining Phase 3.5 restore implementation and CI verification.
