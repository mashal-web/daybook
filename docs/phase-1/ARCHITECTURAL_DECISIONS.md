# Daybook Architectural Decision Records

**Status:** Phase 1 recommendations; none of these records imply implementation.  
**Baseline:** `9aeb4d54c4e6f2727db6674f4060cfe62a270d0e`

## ADR-001 — Preserve vanilla presentation; modularise first

**Decision:** Keep the current HTML/CSS/vanilla JavaScript frontend during P0 corrections. Extract feature modules and explicit boundaries before considering a UI framework.

**Context:** Existing app already has a static web/PWA shell, a canonical scheduling engine, Capacitor packaging and feature scripts. A rewrite risks regressions in recurrence, exceptions, backups and Android support.

**Alternatives:** Full vanilla refactor; gradual React/TS; complete rewrite.

**Advantages:** Lowest migration risk, preserves offline/static deployment, avoids runtime framework overhead and DOM rewrite.

**Disadvantages:** Manual DOM composition remains; dynamic JavaScript contracts need tests and later types.

**Migration impact:** Introduce ES modules and compatibility facades incrementally.

**Reconsider when:** Component reuse/state complexity measurably slows delivery or produces repeated defects.

## ADR-002 — Gradual TypeScript adoption

**Decision:** Adopt TypeScript incrementally, starting with domain and application boundaries, after regression coverage exists.

**Context:** Domain complexity and data migration benefit from stronger contracts; converting all presentation code at once is unnecessary.

**Alternatives:** Stay JS permanently; convert entire repo in one pass.

**Advantages:** Safer refactors, explicit model and port contracts, compile-time validation.

**Disadvantages:** Toolchain and conversion overhead; runtime validation remains necessary for stored/imported data.

**Migration impact:** Add typecheck to CI; keep compatibility JS facade during transition.

**Reconsider when:** TypeScript setup costs outweigh defects prevented for the small codebase (unlikely for domain core, possible for static UI fragments).

## ADR-003 — React deferred

**Decision:** Do not introduce React for Phase 1/initial implementation.

**Context:** Five primary destinations do not inherently require a framework; current static DOM application is functional and Android-compatible.

**Alternatives:** Gradual React; full React rewrite.

**Advantages:** Avoids UI rewrite, hydration/router/build complexity and new state duplication.

**Disadvantages:** Less declarative rendering and smaller component ecosystem.

**Migration impact:** Keep domain/application independent so React can be added later without changing business rules.

**Reconsider when:** Multiple highly interactive shared components and cross-view state become demonstrably hard to maintain.

## ADR-004 — Vite deferred; esbuild retained initially

**Decision:** Keep current esbuild build pipeline while correcting missing asset/trigger coverage. Reassess Vite during TS/React decision.

**Context:** Current build script already copies static assets and bundles Capacitor native adapter.

**Alternatives:** Vite now; no bundler.

**Advantages:** Less migration; existing static Pages and Capacitor output known.

**Disadvantages:** Custom build script requires explicit asset list and can drift.

**Migration impact:** Improve build manifest/tests and lockfile first.

**Reconsider when:** HMR, code splitting, TS conventions or plugin needs justify Vite.

## ADR-005 — IndexedDB with Dexie preferred target; localStorage compatibility retained

**Decision:** Use Dexie/IndexedDB as target shared web + Android WebView store, after a real WebView compatibility spike. Do not use SQLite initially.

**Context:** Multiple related records need atomic writes, indexes, migration and historical growth. Current localStorage wrapper already journals single-key writes and backup but lacks true cross-key transactions.

**Alternatives:** Continue localStorage; native IndexedDB; SQLite/Capacitor SQLite.

**Advantages:** Shared adapter across PWA/WebView, transactional stores, avoids platform split.

**Disadvantages:** Async repository API migration and one new dependency; WebView/device testing required.

**Migration impact:** LocalStorage remains read-only legacy source and rollback snapshot until stable releases pass.

**Reconsider when:** Supported Android WebViews fail IndexedDB reliability/performance tests or data volume/query needs demand SQL.

## ADR-006 — Dexie adopted conditionally, not before spike

**Decision:** Dexie is the preferred IndexedDB wrapper, but do not add it until prototype validates Android WebView persistence, quota handling, transactions and schema upgrade.

**Context:** Native IndexedDB is sufficient but verbose; Dexie simplifies versioning and transaction APIs.

**Alternatives:** Native IndexedDB; Capacitor SQLite.

**Advantages:** Lower implementation complexity and consistent browser API.

**Disadvantages:** Dependency maintenance and wrapper-specific migration semantics.

**Migration impact:** Keep repository interfaces independent of Dexie.

**Reconsider when:** A minimal native IndexedDB adapter is simpler for actual store/query requirements.

## ADR-007 — Preserve Capacitor 7

**Decision:** Retain Capacitor 7 and isolate native APIs behind platform adapters.

**Context:** Existing Android build uses Capacitor 7.4.3 and Local Notifications 7.0.3, and CI creates a debug APK.

**Alternatives:** Native Android rewrite; PWA-only; upgrade major Capacitor.

**Advantages:** Shared web app, existing notification integration, lower migration cost.

**Disadvantages:** Background execution/notification behaviour constrained by Android/WebView and OS policies.

**Migration impact:** Keep `native.js` boundary, test lifecycle and permission states, update workflow only when required.

**Reconsider when:** Required native functionality cannot be reliably supported through Capacitor.

## ADR-008 — No cloud sync / Supabase in first release

**Decision:** Local-first; cloud synchronisation remains opt-in future work. Do not introduce Supabase.

**Context:** No confirmed multi-device or account requirement; app currently stores locally and exports JSON.

**Alternatives:** Supabase or custom backend now; local-only.

**Advantages:** No auth/secrets/server costs; simpler privacy and offline behaviour.

**Disadvantages:** No automatic cross-device sync or remote recovery.

**Migration impact:** Future schema may add sync metadata/tombstones; current IDs and timestamps should be stable.

**Reconsider when:** User explicitly requires multi-device sync and accepts account, conflict, privacy and operational costs.

## ADR-009 — Unified navigation, not one tab per feature

**Decision:** Home, Explore, Schedule, Statistics and Profile; central Quick Action. Feature screens are contextual subviews.

**Context:** Proposed five-item navigation reduces clutter while keeping calendar/timetable/planner together.

**Alternatives:** Separate primary tabs for every feature.

**Advantages:** Coherent information architecture and mobile ergonomics.

**Disadvantages:** Some secondary tools take one extra navigation step.

**Migration impact:** Route/view IDs map to current screen IDs until each page is consolidated.

**Reconsider when:** Usage evidence shows a secondary feature merits persistent top-level placement.
