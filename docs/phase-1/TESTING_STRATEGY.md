# Daybook Testing Strategy

**Status:** Target test architecture.  
**Baseline:** `9aeb4d54c4e6f2727db6674f4060cfe62a270d0e`

## 1. Existing test baseline

Current `npm test` runs `node scripts/verify.js`. The script performs source/markup assertions, syntax parsing and several runtime-style tests using mocked browser/storage objects. It checks scheduling integration references, backup conversion, navigation IDs, CSS packaging, service worker and native notification wiring. It is useful regression protection but source-string assertions cannot prove real browser interactions, accessibility, layout or Android runtime behaviour.

No Vitest, Playwright or browser test dependency is present in package.json at this baseline.

## 2. Test pyramid

1. **Domain unit tests:** pure recurrence, exception, timezone, task, habit, goal and analytics rules. Fast, deterministic, no DOM.
2. **Application tests:** use cases with in-memory repositories; verify transaction coordination and emitted updates.
3. **Infrastructure integration tests:** IndexedDB adapter, migration, backup, notifications adapter mocks and prayer cache.
4. **Browser E2E:** Playwright for critical workflows, navigation, responsive layout, offline reload and restore.
5. **Android device tests:** real Capacitor WebView, notification permissions, lifecycle/resume, file picker/export and storage persistence.

## 3. Tooling decisions

- Keep Node's built-in test/assert facilities during initial extraction; use Vitest when module-level test organisation/coverage and browser-like environments justify it.
- Adopt Playwright for browser-level E2E; it fills the explicitly missing real browser interaction layer.
- Do not add both Vitest and Jest. Choose one unit runner.
- Android validation remains a CI APK build plus periodic physical-device/manual test matrix; emulator instrumentation can be added when available.
- CI should separate fast unit/integration checks from browser E2E and Android build jobs.

## 4. Required test matrix

| Module | Cases | Minimum acceptance |
|---|---|---|
| Scheduling | CRUD, recurrence, occurrence IDs, exceptions, series edits | All current behaviours have deterministic fixtures and pass |
| Time | timezone changes, DST gap/fold, overnight, multi-day | No duplicate/missing occurrence across tested boundaries |
| Conflict | touching boundaries, overlap, unknown end | Correct hard/soft conflict classification |
| Storage | CRUD, quota, corrupted JSON, interrupted write | No silent overwrite; recovery state is surfaced |
| Migration | each legacy key/version, repeat migration, partial failure | Idempotent; source retained; rollback proven |
| Backup | old/new versions, invalid, oversized, cancel, replace, failure | Atomic exact restore and zero-write cancellation |
| Tasks | due/plan dates, repeat, postpone, completion history | Date semantics and history deterministic |
| Academics | course CRUD, assessment relationships/deadlines | Invalid course reference rejected or explicit null |
| Focus | start/pause/reload/background/resume/completion | Correct elapsed time; no false completed session |
| Habits | recurrence, check-in uniqueness, missed dates, archive | History preserved; no duplicate check-in |
| Prayer | methods, school, offsets, Karachi timezone, cache/offline | Five prayers correct for supported configuration; sunrise excluded |
| Notifications | permission denied, schedule/cancel/reconcile, duplicate | Idempotent; no unsupported delivery promise |
| Goals/analytics | period boundaries, changed target, no history | Reproducible calculations and honest empty state |
| Navigation | all primary/secondary routes, back, refresh/deep link | No dead destinations or stale active state |
| Responsive | 320/360/390/768/1024/1440 widths, zoom | No clipped content or horizontal overflow |
| Accessibility | keyboard, TalkBack, labels, contrast, reduced motion | Critical workflows operable and announced correctly |
| Platform | PWA offline, Capacitor packaging, Android resume | Core app works without network and after restart |

## 5. Test fixtures and determinism

Inject Clock and timezone resolver. Never use wall-clock “today” in domain tests. Fixtures must cover Pakistan/Asia-Karachi and at least one DST-observing zone (e.g. Europe/London or America/New_York). Seed recurring events spanning month/year changes, leap day, overnight and DST transitions.

For backup tests keep immutable fixtures from every supported backup format. Include corrupted and unknown-future versions. Use failure injection at every write step.

## 6. E2E critical journeys

- Fresh install -> create event -> reload -> event appears in Home, Agenda, Calendar and Timetable.
- Create weekly series -> edit one occurrence -> cancel another -> verify future series unaffected.
- Create task with deadline -> Smart Planner suggests slot -> user accepts -> all views refresh.
- Create course/assessment -> deadline appears in Home/Schedule.
- Start focus -> pause -> background -> resume -> finish -> one session appears in analytics.
- Create habit -> check in -> next day remains unchecked; history is retained.
- Configure prayer location/method -> online fetch -> offline reload -> cached timing shown.
- Export -> modify data -> restore -> exact original dataset restored.
- Deny notification permission -> app remains usable and status explains limitation.
- Android cold launch/resume -> storage and notification reconciliation complete.

## 7. CI gates

P0 gate: syntax, domain, application, storage, migration and backup tests; asset/package verification; build reproducibility. P1 gate: Playwright critical flows and responsive smoke tests. Android gate: APK generation, package file checks and periodic device acceptance. A test may not be marked passed solely because source contains a string.

## 8. Release criteria

No open P0 defect; all P0 tests pass; backup restore and legacy migration tested against fixtures; no known data-loss path; Android/Web smoke journeys pass; P1 workflows have recorded results; accessibility and performance regressions are reviewed. Report flaky/unavailable device tests explicitly rather than claiming full verification.
