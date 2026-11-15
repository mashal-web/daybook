# Daybook Storage and Migration Plan

**Status:** Proposed; no storage migration performed in Phase 1.  
**Baseline:** `9aeb4d54c4e6f2727db6674f4060cfe62a270d0e`

## 1. Current storage

The app currently uses localStorage through `DaybookPersistence.storage`. It has a write journal (`daybook_write_journal_v1`), recovery on startup, JSON validation for namespaced keys, read-back verification, rollback attempt and a blocked state when recovery cannot safely complete. The schedule engine writes one versioned JSON object under `daybook_schedule_v1`.

Backup envelope currently identifies app Daybook, versions 1–3, exportedAt, schemaVersion and data. It validates supported key prefixes, rejects raw unreadable records and oversized files (>10 MB), and applies a journaled replacement. Legacy v1/v2 fields and extension keys are mapped into namespaced keys. Important limitation: restore replaces keys present in the backup but does not first clear every current key absent from the backup; semantics need an explicit tested replace/merge policy.

## 2. Storage option comparison

| Option | Advantages | Disadvantages | Recommendation |
|---|---|---|---|
| localStorage | Already implemented, synchronous, simple, available in WebView/PWA | Small quota, synchronous blocking, no multi-key transactions, string-only, manual journaling | Keep as compatibility/import layer, not long-term multi-entity store |
| Native IndexedDB | Browser/WebView support, async, transactions, indexes, offline | API verbose; migration/error handling must be built | Technically sufficient |
| Dexie over IndexedDB | Cleaner schema/version/transaction API, query ergonomics, testable, works in modern browser/WebView | New dependency; must verify WebView version and migration behaviour | **Preferred target adapter** |
| SQLite | Strong relational transactions and mature querying | Separate browser adapter required; SQL mapping complexity | Not first release |
| Capacitor SQLite | Native Android persistence and SQL capabilities | Platform divergence, plugin setup, browser fallback, more migration paths and test matrix | Defer unless IndexedDB WebView reliability proves insufficient |

### Decision
Use **IndexedDB through Dexie** as the shared web and Capacitor WebView database after a compatibility spike on supported Android devices. Do not introduce SQLite in the first migration. Keep repository interfaces independent of Dexie so SQLite remains a future adapter option.

Reason: Daybook needs atomic multi-store updates and historical records across events, tasks, courses, assessments, sessions, habits, goals and notification records. IndexedDB transactions address this without maintaining two platform databases. Dexie reduces IndexedDB boilerplate.

## 3. Repository contract

Define feature repositories with async methods:
- `get(id)`, `list(query)`, `put(record)`, `delete(id)` or `archive(id)`.
- `transaction(work)` only at application boundary for coordinated multi-store writes.
- `getSchemaVersion()`, `migrate()`, `health()`.
- All writes validate domain records before persistence.
- No feature receives raw Dexie tables or localStorage object.

Ports: EventRepository, TaskRepository, CourseRepository, AssessmentRepository, FocusSessionRepository, HabitRepository, HabitOccurrenceRepository, GoalRepository, PreferencesRepository, NotificationRepository, PrayerSettingsRepository, ActivityRepository, BackupRepository.

## 4. Transaction and recovery semantics

- Multi-record operations (series split + exception remap; course archive + relationship detach; backup restore) run in one IndexedDB transaction where possible.
- Do not await unrelated network operations inside an IndexedDB transaction; transactions can auto-close.
- A failed transaction is all-or-nothing; surface error and preserve previous data.
- Migrations use versioned Dexie upgrade functions with idempotent transformations and a migration journal for long-running external work.
- If upgrade fails, keep old database version intact; do not delete database or fall back to blank defaults.
- Quota errors are surfaced; offer export/cleanup of explicitly disposable caches only.
- Read paths remain available in offline mode.
- Backup import first validates the complete envelope and all records in memory, previews counts/conflicts, then commits one transaction.

## 5. Migration sequence

1. Freeze and verify baseline fixtures from all current storage keys.
2. Add repository interfaces and tests while localStorage remains adapter.
3. Build localStorage LegacyReader and preserve original keys.
4. Add Dexie adapter and schema v1 with canonical stores.
5. Import data in deterministic order: preferences/prayer settings; courses/subjects; events/classes/routine/sessions; tasks; assessments; habits/checks; goals; reminders; finance.
6. Preserve IDs or deterministic source mappings. Store `legacySourceKey` + `legacyId`.
7. Validate counts, unique IDs, relationships and representative record equality.
8. Write migration-complete marker only after all checks pass.
9. Route all writes to Dexie. Legacy keys become read-only snapshots for at least two releases.
10. Export both canonical data and legacy compatibility payloads during transition.
11. Remove legacy write path only after a release with no rollback incidents and explicit migration review; do not delete historical source keys as part of Phase 1.

## 6. Backup and restoration

New backup envelope:
- app identifier, backup format version, source app version, schema version, exportedAt, timezone, store manifest, record counts, data payload and optional checksum.
- Export all canonical records and retained legacy source data.
- Import preview lists counts, unsupported stores, schema conversion and potential ID conflicts.
- Restore modes: **replace** (default, explicit confirmation) and **merge** (future only, deterministic conflict policy).
- Replace means all user-data stores are replaced as one transaction, including removal of records absent from backup; app static resources are never included.
- Validate entire payload before opening write transaction.
- User cancellation or validation failure causes zero writes.
- Transaction failure rolls back all stores.
- Keep pre-restore export recommendation and optionally automatic rollback snapshot until restore verified.
- Never accept arbitrary storage keys from backup; map allowlisted store names only.
- Unknown future version is rejected; older versions require explicit tested migrations.

## 7. Cloud sync

Not in scope. No Supabase. If future sync is approved, introduce sync metadata (stable IDs, updatedAt, deletedAt/tombstones, revision/vector/conflict policy) and an opt-in account model. Local data remains usable if sync is disabled or unavailable. Sync must not be retrofitted as “last write wins” without conflict UX.

## 8. Storage acceptance criteria

- Browser and Android WebView pass same repository contract suite.
- Transactions prove atomicity under injected failure.
- Migrations are repeatable and fixture-tested for every released schema.
- Legacy data survives first migration and rollback.
- Backup restore replace semantics are exact and atomic.
- Corrupt/unknown backup cannot alter current data.
- Offline CRUD works after cold restart.
- Storage quota and permission failures show actionable status, not silent success.
