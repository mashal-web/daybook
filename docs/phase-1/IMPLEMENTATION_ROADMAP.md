# Daybook Implementation Roadmap

**Status:** Proposed sequence; Phase 1 performs no source implementation.  
**Baseline:** `9aeb4d54c4e6f2727db6674f4060cfe62a270d0e`

## 1. Dependency-aware sequence

| Phase | Work | Depends on | Exit gate |
|---|---|---|---|
| 0 | Baseline/feature inventory and fixtures | None | Commit and every storage shape captured |
| 1 | Canonical data ownership and compatibility facade | 0 | One owner per record; legacy idempotence tests |
| 2 | Scheduling consumer corrections (Agenda/Smart Planner/Home/Calendar/Timetable) | 1 | All views use same query contract |
| 3 | Backup restore semantics and recovery | 0, 1 | Preview, replace, rollback and legacy fixtures pass |
| 4 | Android workflow and asset packaging corrections | 0 | Every required runtime file packaged; CI green |
| 5 | Automated test foundation (unit + Playwright) | 0, 1 | Domain/storage gates and browser critical journeys run |
| 6 | Repository ports and storage spike | 1, 3, 5 | IndexedDB/Dexie browser + Android WebView proof |
| 7 | Storage migration to Dexie | 3, 5, 6 | Atomic migration and rollback verified |
| 8 | TypeScript migration (incremental) | 5, 7 or stable repository ports | Domain/application contracts typed; no big-bang conversion |
| 9 | Design system tokens/components | Product/design approval | Accessibility and responsive token checks |
| 10 | Application shell and navigation | 9, 5 | All destinations/back paths work |
| 11 | Home dashboard | 1, 2, 9, 10 | Uses canonical queries and derived metrics |
| 12 | Feature completion: academics, tasks, focus, habits, prayer, goals | 1, 5, 7, 10 | P1 acceptance matrix passes |
| 13 | Analytics and notification reconciliation | 12 | Historical reports and platform delivery tests |
| 14 | Final web/PWA/Android verification | All | Release checklist and backup/restore proof |

### Sequencing notes
- Do not migrate storage before preserving fixtures and defining canonical ownership.
- Fix view references before redesign; otherwise visual work may conceal data divergence.
- Backup restore correction is P0 and must precede storage migration.
- Android workflow and asset packaging should be corrected early because all later work depends on repeatable packaging.
- Automated tests are not a late polish phase; add before structural changes.
- TypeScript migration is incremental and may overlap feature extraction only after boundaries exist.
- Design system and shell should follow product navigation approval; feature screens migrate one at a time.
- React is not on the committed roadmap. Re-evaluate after TypeScript/domain modularisation only if evidence supports it.

## 2. Folder structure options

### A. Minimal modular JavaScript (recommended immediate target)

```
src/
  app/
    bootstrap.js
    navigation.js
    events.js
  features/
    scheduling/
      domain/
      application/
      infrastructure/
      presentation/
    tasks/
    academics/
    focus/
    habits/
    prayer/
    goals/
    analytics/
    notifications/
    preferences/
    backup/
  shared/
    date-time/
    validation/
    ui/
  platform/
    browser/
    capacitor/
tests/
  unit/
  integration/
  e2e/
public/
  index.html
  styles/
  icons/
  manifest.webmanifest
  sw.js
docs/
```

Responsibility: small, feature-owned modules with clear imports. Domain contains no DOM/storage/platform dependencies. Infrastructure implements application ports. Presentation consumes use cases. Do not put feature rules in `app.js`, DOM access in domain, or direct localStorage calls in views. Keep root-level legacy scripts as adapters until migrated.

### B. Gradual TypeScript

Same feature structure, using `.ts` for domain/application/infrastructure first; `.js` presentation can remain temporarily. Add `tsconfig`, strict mode, path aliases only if needed, typecheck CI. Convert scheduling domain first with compatibility tests; do not rewrite algorithms at same time as changing language. Avoid `any` at storage boundaries; validate unknown data.

### C. Optional React + TypeScript

```
src/
  app/
    App.tsx
    router/
    providers/
  features/<feature>/
    domain/
    application/
    infrastructure/
    ui/
  shared/
    components/
    hooks/
    styles/
  platform/
```

React owns presentation only. Domain/application remain framework-independent. Zustand is optional and only for transient cross-component UI state if React context/reducers become inadequate. Repositories remain the only persistent source of truth. Do not put IndexedDB records into a second global store.

## 3. Android and web work

Retain Capacitor 7 and static web deployment. Build output remains `www/` for Capacitor. GitHub Pages requires relative asset URLs or a configured base path; service worker scope/cache URLs must match deployment subpath. Ensure the Android workflow triggers on every source/runtime asset and lockfile change. Prefer committed lockfile and `npm ci` for reproducible builds. Do not check generated Android project into source unless build strategy changes deliberately.

## 4. Definition of done for each phase
- Scope and baseline commit identified.
- No unapproved data schema or UI behaviour changes.
- Migration/rollback tests updated.
- Web build and Android package checks pass.
- Manual device limitations stated.
- Documentation and architecture decisions updated.
- No implementation marked complete from static assertions alone.
