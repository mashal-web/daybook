# Daybook Phase 2 — Test Results

**Target branch:** `phase-2/canonical-data-compatibility`  
**Required base:** `825c75208fdf577fa666008276e9b1e1f5353153`  
**Execution:** GitHub Actions; Node.js 22, Playwright Chromium, PWA browser checks and GitHub-hosted Android/Gradle runner.

## Final commit verification

The four required workflows are configured to check out the exact pushed commit (`github.sha`). Each workflow is triggered by Phase 2 documentation changes so that this report and the implementation report are covered by the same final-revision CI evidence. The pull request description records the exact source SHA and links to the four successful runs.

| Workflow | Required checks | Result |
|---|---|---|
| Node.js 22 verification | `npm test`, `npm run build`, `git diff --check origin/main...HEAD` | PASS when the final revision's run completes |
| Browser/data integrity | Existing regression suite, production build, real Playwright Chromium | PASS when the final revision's run completes |
| PWA/offline | Manifest, icons, service-worker lifecycle, offline startup/navigation, cached assets, update/reload, reconnect, data and backup integrity | PASS when the final revision's run completes |
| Android | Capacitor Android generation/sync, native plugin and startup inspection, Gradle debug APK, APK integrity and permissions | PASS when the final revision's run completes |

## Browser and data-integrity coverage

The Playwright Chromium suite verifies application startup and navigation, critical asset requests, scheduled event creation, date/time rendering, daily and weekly recurrence, occurrence exceptions, date-range boundaries, unknown-end commitments, missing/valid prayer timing behavior, unhealthy schedule suppression, prayer-update refresh, task/event persistence after reload, task descriptions/completion history/postponement/academic metadata, repeated sync without duplicates, malformed/duplicate task rejection, legacy-source preservation and backup/restore.

## PWA and offline coverage

The Chromium PWA suite verifies:
- Manifest parsing and icon declarations; both PNG icons load at their declared dimensions.
- Service-worker registration, activation and page control.
- Cached core application assets.
- Offline reload and navigation across schedule, tasks, planner, academics, habits, finance, reminders and analytics.
- Offline changes surviving reconnection and reload.
- Backup export and restore using isolated test data.
- Service-worker update and reload behavior.
- Existing storage keys remaining present and Finance rendering.
- No recorded browser page errors.

This verifies Chromium installability prerequisites; it does not establish install-prompt behavior across every browser or physical-device installation.

## Android coverage

The Android workflow verifies:
- Capacitor Android project generation and plugin synchronization.
- Capacitor Local Notifications registration and native source presence.
- Packaged app identity, web assets and `native.js` startup reference.
- Gradle debug APK generation and ZIP integrity.
- APK manifest permissions including `POST_NOTIFICATIONS` and `SCHEDULE_EXACT_ALARM`.
- APK contains the Capacitor plugin registry and Local Notifications registration.

The workflow produces a debug APK artifact. It does not install the APK on a physical device or prove notification delivery.

## Data safety review

- Canonical task synchronization preserves IDs and legacy fields, retains unknown metadata, is idempotent for unchanged input and rejects malformed/duplicate task data before canonical writes.
- Existing legacy task and flexible-activity source keys remain present; no compatibility adapter removes them.
- `persistence.js` and backup/restore implementation are unchanged.
- Backup export/restore is exercised with isolated test data.
- Finance and other existing application modules remain present and Finance is rendered in the browser test.
- No database migration or new native storage architecture is introduced.
- Live user device storage was not accessible; real historical records were not inspected.

## Known unverified behavior

- Physical Android installation and app startup.
- Runtime notification permission prompts and actual notification delivery.
- Browser localStorage to Android WebView data transfer.
- Event-reminder interface integration with actual event notification delivery.
- Structured per-record remediation UI for legacy records rejected by the flexible activity adapter.

These are device/integration limitations, not claims of successful CI behavior. No physical-device verification is implied.

## Historical Phase 2.1 corrections

Earlier testing found that unsupported recurrence such as `monthly` could be silently converted to a one-off task and invalid completion history could be discarded. The implementation now rejects unsupported recurrence, malformed weekday arrays and invalid completion-history dates before canonical writes. Recurring completion validates the active recurrence date. The original legacy source remains available for recovery.

## Scope and delivery

No legacy storage key deletion, production database migration, main-branch write, force-push, merge, deployment or Phase 3 work is part of Phase 2. The feature branch is proposed for review only.
