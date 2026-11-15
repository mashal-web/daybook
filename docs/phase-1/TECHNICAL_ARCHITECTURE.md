# Daybook Technical Architecture

**Status:** Proposed target architecture; existing implementation is explicitly distinguished below.  
**Baseline:** `9aeb4d54c4e6f2727db6674f4060cfe62a270d0e`

## 1. Evidence-based baseline

Verified at the requested commit:
- Static HTML/CSS/JavaScript application; no React or TypeScript dependencies.
- `app.js` is a large application/controller module; `index.html` owns the current multi-view DOM.
- `scheduling.js` exposes `window.DaybookSchedule.create()`; app creates `window.DaybookScheduleStore`.
- Scheduling schema version 3 persists events, exceptions and flexible tasks under `daybook_schedule_v1`.
- `persistence.js` wraps localStorage, validates JSON values, journals writes and offers backup validation/export/import.
- Legacy keys coexist with canonical schedule data; `app.js` synchronises legacy classes/routine/sessions/tasks into the engine.
- `flexible-activities.js`, `prayer-times.js`, `native.js`, `upgrade.js` and service worker are separate modules.
- Package dependencies: Capacitor 7.4.3, Local Notifications 7.0.3, esbuild 0.25.0; no React, TypeScript, Vite, Zustand, Dexie, Vitest or Playwright.
- Build script copies static assets to `www/` and bundles the native Capacitor entry point with esbuild.
- Android workflow generates Android platform during CI and builds a debug APK.
- `scripts/verify.js` is a substantial Node assertion/regression script, but not browser automation.

The Phase 0 note that Agenda and Smart Planner have incorrect references must be treated as a known defect to re-verify and correct; Phase 1 does not claim it is fixed. Existing automated assertions already check parts of their shared schedule integration.

## 2. Architecture style

Adopt a **feature-based modular monolith** with four dependency layers. Do not split into microservices.

Dependency direction:

```
Presentation -> Application -> Domain
                    ^
                    |
              Infrastructure
Infrastructure implements ports defined inward; Domain imports no outer layer.
```

- Domain is pure business logic and deterministic date/time rules.
- Application coordinates use cases and ports.
- Infrastructure implements storage, notification, prayer API/cache, file and Capacitor adapters.
- Presentation renders views and translates user actions into use-case calls.

The existing global browser API can remain as a temporary compatibility facade while modules are extracted. It is not the desired long-term dependency mechanism.

## 3. Technology evaluation

| Option | Migration cost | Preservation/data risk | Maintainability/testing | Runtime/platform | Risk |
|---|---|---|---|---|---|
| A. Improved vanilla JS | Low | Lowest if facades retained | Better with ES modules, contracts and tests; dynamic types remain | Excellent static/PWA/Capacitor fit | Low |
| B. Gradual TypeScript | Medium | Low-medium with boundary-by-boundary conversion | Stronger contracts and safer refactors | Compatible with browser and Capacitor | Medium |
| C. Gradual React + TS | High | Medium-high; DOM/view rewrites and lifecycle changes | Component ecosystem and UI tests improve; adds state/render complexity | Compatible, but static build pipeline changes | High |
| D. Full rewrite | Very high | Highest data and behavioural regression risk | Clean start but re-implements mature domain logic | Build/deploy changes substantial | Very high |

**Recommendation:** Option B as a staged evolution from A. Keep the existing vanilla DOM presentation initially. Introduce TypeScript for domain/application boundaries only after the P0 regression suite is reliable. Do not adopt React in this phase. A gradual React migration is reconsiderable only if measured UI complexity, component reuse or accessibility work becomes materially harder than maintaining DOM views.

### React threshold
React is not justified solely by the number of screens. The application has one user, local data, a small number of views and a functioning vanilla frontend. First extract state ownership, view controllers and domain APIs. Reassess React only if repeated DOM reconciliation, component reuse, complex cross-view interactions or maintainability metrics show a real problem. Avoid a big-bang rewrite.

### Vite
Vite is optional. Current esbuild build is small and already bundles the native adapter. Keep it until there is a concrete need for dev server/HMR, plugin ecosystem, code splitting or TS/React conventions. If adopted, preserve GitHub Pages base paths and Capacitor `webDir` output parity.

### Zustand
Not recommended now. It solves shared React UI state, not canonical persistent data. If React is later adopted, first determine whether a small context/reducer or feature stores suffice. Never duplicate database records into Zustand as a second source of truth.

## 4. Module boundaries

| Module | Owns | Must not own |
|---|---|---|
| Scheduling | Event series, recurrence, exceptions, conflicts, available intervals | DOM, localStorage, notifications |
| Tasks | Task lifecycle, deadline and completion rules | Timetable rendering |
| Academics | Courses and assessments; academic relationships | Schedule occurrence generation |
| Focus | Timer state machine and focus session records | DOM timers as authoritative elapsed time |
| Habits | Habit definitions, recurrence and dated check-ins | Streaks as stored mutable counters |
| Prayer | Calculation configuration and normalized prayer instants | Calendar event storage or UI |
| Goals | Target definitions and progress rules | Duplicated statistics |
| Analytics | Queries/aggregations over activity history | Mutating source records |
| Preferences | User settings and locale/timezone choices | Feature-specific records |
| Notifications | Reminder rules, delivery queue and adapter reconciliation | Owning event/task records |
| Backup | Export/import envelope, validation and restore orchestration | Feature business rules |
| Platform | Capacitor/browser capability adapters | Domain rules |

## 5. Four-layer design

### Presentation
Pages: Home, Explore, Schedule, Statistics, Profile. Reusable components: timeline row, event editor, date navigator, task item, progress card, chart/table, empty state, error banner, dialog, quick-action sheet.

Presentation responsibilities: rendering, accessibility, local form state, navigation and error display. It must not read localStorage or calculate recurrence.

### Application
Use cases include:
- `CreateEvent`, `UpdateEventSeries`, `EditEventOccurrence`, `CancelOccurrence`, `GetDayPlan`, `GetAvailableSlots`.
- `CreateTask`, `CompleteTaskOccurrence`, `GetTasksForRange`.
- `CreateAssessment`, `GetAcademicDeadlines`.
- `StartFocus`, `PauseFocus`, `RecoverFocus`, `CompleteFocusSession`.
- `CheckInHabit`, `GetHabitHistory`.
- `CalculatePrayerTimes`, `ReconcileNotifications`.
- `ExportBackup`, `PreviewRestore`, `RestoreBackup`.

Application services coordinate repositories and publish domain/application events. Use explicit result/error types; no global DOM events as the long-term service bus.

### Domain
Pure models and services. No imports from DOM, browser globals, Capacitor, storage libraries or framework. Date/time calculations must receive an explicit timezone/clock abstraction when required.

### Infrastructure
Adapters: IndexedDB repository, legacy localStorage importer, JSON backup/file adapter, browser notification adapter, Capacitor local notification adapter, prayer calculation/API/cache adapter, clock/timezone adapter, platform capability adapter.

## 6. Dependency injection and compatibility

Define repository and platform ports in Application. Construct adapters at bootstrap and inject them into use cases. During migration, expose a compatibility facade for `window.DaybookSchedule` and `window.DaybookScheduleStore` until all consumers have moved. Facade methods delegate to the same use cases/repositories; they must not maintain separate arrays.

## 7. State management

- Persistent state: repositories only.
- Global transient state: selected date, active view, navigation, theme if not stored as preference.
- Feature transient state: filters, open dialogs, editor drafts, selected report range.
- Derived state: day plan, available slots, streaks, goal progress, statistics. Compute from source records and memoize only when profiling justifies it.
- Cross-feature updates: application events or explicit invalidation/query refresh; no copied persistent record arrays.
- Focus timer: persist a state snapshot with an absolute `endsAt`; derive remaining time from clock after visibility/resume. Store completed sessions separately.

## 8. Error and observability model

Typed categories: validation, not-found, conflict, storage-unavailable, quota, migration, backup-invalid, permission-denied, platform-unavailable, network-unavailable. UI displays actionable messages; logs exclude private titles/notes unless user explicitly exports diagnostics. Storage corruption enters recovery mode, never silent reset.

## 9. Performance and release constraints

Keep first screen static and light. Load feature modules when needed only if this reduces measurable startup cost without breaking offline shell. Avoid repeated full DOM rebuilds for unrelated updates. Establish budgets after measuring current device baseline; do not assert unsupported benchmark claims. Core interactions should remain responsive on low-end Android hardware.

## 10. Target folder structures

See `IMPLEMENTATION_ROADMAP.md` for the minimal, TypeScript and optional React variants. The chosen first implementation should be the minimal modular ES-module structure; TypeScript conversion is incremental and React is deferred.
