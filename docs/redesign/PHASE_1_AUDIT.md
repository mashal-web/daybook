# Daybook Redesign — Phase 1 Audit & Foundation

**Repository:** `mashal-web/daybook`  
**Baseline branch:** `main`  
**Baseline commit:** `d191ca2046dc5339d8f11a55e50156c99cfd408b`  
**Working branch:** `redesign/graphite-foundation`  
**Audit date:** 2026-11-25  
**Scope:** inspection and design decisions only; no production UI or data behavior changed in this phase.

## 1. Baseline verified

- Repository is a public, vanilla HTML/CSS/JavaScript PWA with Capacitor 7 Android support.
- Existing verification is available through `npm test` (`scripts/verify.js`), browser verification, offline/PWA checks and GitHub Actions workflows.
- The repository has established data, scheduling and backup/restore architecture. Redesign must remain a presentation and navigation refactor unless a separately verified defect requires a functional change.
- `main` was read at the baseline SHA above. A dedicated working branch was created from that exact commit. All phase work must stay on this branch.

## 2. Confirmed design direction

The user selected:
- **Visual identity:** Graphite.
- **Navigation:** Custom.
- **Home screen:** Custom.
- **Visual depth:** Minimal.
- **Feature scope:** Review and reorganize; do not delete working features simply to reduce visual clutter.

### Graphite design principles

- Neutral graphite/near-black surfaces with crisp grey-white typography.
- Thin, quiet borders; clear spacing and alignment; restrained elevation only where it improves hierarchy.
- No gradients, neon colour, glow, glass blur, heavy neumorphism or decorative motion.
- Functional state colours remain available where they communicate meaning, and must not be the only indicator.
- Keep the existing light-theme capability unless QA identifies a concrete issue; dark graphite is the primary art direction.
- Prefer system fonts and existing icon assets; avoid new dependencies and network font loading.

## 3. Audit findings

### High-priority visual debt

1. **Competing CSS systems.** `index.html` loads seven stylesheets: `styles.css`, `timetable-theme.css`, `upgrade.css`, `mobile-app.css`, `study-planner.css`, `planning.css` and `design-system.css`. Their overlapping tokens and late overrides create cascade ambiguity.
2. **Conflicting palettes and effects.** The inspected styles contain light neumorphic variables, blue/cyan/violet futuristic themes, glass/shadow treatments, teal design-system tokens and monochrome graphite overrides. This does not consistently express the selected graphite/minimal direction.
3. **Large presentation surface.** `index.html` is approximately 44.6 KB and `app.js` approximately 84.5 KB. The markup includes many destinations and dashboard sections; redesign should reduce visual density without rewriting the application logic.
4. **Navigation fragmentation.** The current sidebar separately exposes Dashboard, Timetable, Calendar, Tasks, Events, Prayer, Insights, Settings, Study Planner, Reminders, Academics, Habits and Finance. Several are related views or secondary utilities and compete for primary navigation space.
5. **Dashboard density.** The home view currently includes overview metrics, next-up, timeline, priority tasks, academic snapshot, study/habit insights, focus timer and a large quick-action area. It needs a stronger priority order and less duplicated summary information.

### Functional and technical guardrails

- Preserve existing stable view IDs, action attributes, form IDs and JavaScript hooks unless a migration is deliberately implemented and tested.
- Do not change scheduling, recurrence, task completion, study history, prayer calculations, reminders, finance records or backup/restore semantics as part of visual-only work.
- Keep local-first and offline behavior, PWA manifest/service worker, Capacitor integration and current test commands.
- Retain semantic landmarks, accessible names, visible keyboard focus, reduced-motion support, safe-area handling and responsive layouts.
- Do not merge to `main` during the redesign phases without explicit final authorization.

## 4. Proposed information architecture

### Mobile primary navigation

1. **Today** — personalized dashboard and immediate next actions.
2. **Schedule** — timetable, calendar, agenda and events as views of the existing unified schedule.
3. **Tasks** — task list, priorities and flexible activities.
4. **Study** — study planner, academics and focus/session history.
5. **More** — secondary destinations and settings.

### Secondary destinations under More / contextual entry points

- Insights and habits
- Prayer and reminders
- Finance
- Backup / restore
- Settings

Desktop may use a compact sidebar, but destination names and route/view identifiers must remain consistent with mobile.

## 5. Custom Today screen — target hierarchy

1. Date and concise greeting.
2. **Next up / next useful action** (one clear, actionable focus).
3. Today's schedule, with a compact timeline and direct route to full Schedule.
4. Priority tasks with completion actions.
5. One compact study/focus summary.
6. Optional habit or prayer snapshot, only when it is useful and not duplicative.

Move detailed analytics, finance, course administration, settings and long quick-action grids out of the main dashboard. Empty states should guide the first meaningful action; they must not look like missing or broken content.

## 6. Feature review — disposition

| Existing area | Redesign disposition |
|---|---|
| Timetable / Calendar / Events | Combine under Schedule; preserve unified data and distinct useful views |
| Tasks / Flexible activities | Keep; make task ownership and scheduling relationship clear |
| Study planner / Academics / Focus | Group under Study; retain separate workflows |
| Insights / Habits | Keep as secondary workspace; simplify summaries |
| Prayer / Reminders | Keep as contextual/secondary tools; preserve notification configuration |
| Finance | Keep as optional secondary module; do not remove records |
| Backup / Restore | Essential utility, accessible from Settings/More |
| Settings | Consolidate navigation and preferences; preserve all options |

Before hiding or relocating any item, verify that its route is reachable and all actions remain available.

## 7. Phase acceptance criteria

Phase 1 is complete when:
- Baseline and working branch are recorded.
- Conflicting stylesheets and their responsibilities are mapped.
- Graphite visual principles and information architecture are documented.
- Feature dispositions and preservation constraints are explicit.
- No production data or functionality has been altered.

Next phase: implement one coherent token/component foundation and simplify stylesheet ownership on this working branch, with visual regression and existing tests checked before navigation work.
