# Daybook Phase 2 — Test Results

**Test target:** `phase-2/canonical-data-compatibility`  
**Base commit:** `825c75208fdf577fa666008276e9b1e1f5353153`  
**Execution environment:** ChatGPT Code Mode isolated V8 runtime with GitHub-sourced repository contents. This is not a local Node.js/npm shell.

## Verification summary

| Check | Result | Evidence / limitation |
|---|---|---|
| Remote baseline branch HEAD | PASS | GitHub branch ref resolved to the exact required commit before branch creation. |
| Source syntax parse — `scheduling.js` | PASS | Executed `new Function(source)` in V8. Not a `node --check` invocation. |
| Source syntax parse — `upgrade.js` | PASS | Executed `new Function(source)` in V8. |
| Source syntax parse — `flexible-activities.js` | PASS | Executed `new Function(source)` in V8. |
| Source syntax parse — `scripts/verify.js` | PASS | Executed `new Function(source)` in V8. |
| Existing `scripts/verify.js` logic | PASS | Entire script executed in V8 using GitHub-fetched files and shims for Node `fs`, `assert/strict`, and `URL`. It logged all four success messages and no assertion failures. This is not the actual `npm test` command or Node runtime. |
| Canonical task preservation tests | PASS | Actual `scheduling.js` executed in V8 with in-memory storage. Verified IDs, descriptions, due aliases/canonical due date, duration, completion history, postponement, scheduled start, academic relationship, metadata and custom fields. |
| Task sync idempotency | PASS | Repeated synchronization produced byte-identical canonical task JSON in the test fixture. |
| Invalid task protection | PASS | Malformed input returned `false`; existing canonical task JSON remained unchanged. |
| Duplicate task rejection | PASS | Duplicate legacy IDs rejected before canonical write. |
| Date-range API | PASS | Inclusive range returned matching event occurrence; oversized range returned an empty array rather than a partial result. |
| Recurring task completion API | PASS | Completing one occurrence did not complete the next occurrence. |
| Flexible legacy adapter runtime | PASS | Executed the actual `flexible-activities.js` adapter with a mocked DOM-ready callback and canonical task store; verified weekly recurrence fallback from `createdAt`, recurrence end, postponement dates, scheduled timestamps and custom field preservation. |
| Agenda renderer integration | PASS | Extracted renderer executed against a mocked canonical instance and rendered the expected event/date/time. |
| Smart Planner renderer integration | PASS | Extracted renderer used canonical tasks and day-plan availability; a missing store and an unbounded commitment suppressed free-time suggestions. |
| Task-duration filtering | PASS | Planner did not display a slot shorter than the shortest open task duration (with a 45-minute floor). |
| `npm test` | NOT EXECUTED | No local Node/npm shell or repository checkout is exposed. The test script logic was executed through the V8 shim described above. |
| `npm run build` | NOT EXECUTED | Build requires Node, installed esbuild and filesystem operations. |
| `node --check` | NOT EXECUTED | No Node CLI. V8 syntax parsing was performed instead. |
| `git diff --check` | NOT EXECUTED | No local Git working tree. GitHub file and commit APIs do not expose this command. |
| Browser / PWA / offline manual test | NOT EXECUTED | No browser automation or browser session was available. |
| Capacitor sync / Android APK | NOT EXECUTED | Android SDK/Gradle execution is unavailable. |
| Physical Android device | NOT EXECUTED | No connected device. |
| GitHub Actions workflow | NOT EXECUTED | The inspected workflow is configured for `push` to `main` or manual dispatch, not pull requests. No workflow-dispatch action is exposed by the connected GitHub tools. |

## V8 test harness details

The existing verification script was retrieved from the feature branch. All files requested by its `readFileSync` calls were fetched from the same branch through the GitHub integration. The script was then evaluated in the isolated V8 tool runtime with:

- A file-system shim returning the exact fetched repository file contents.
- An assertion shim implementing the methods used by the script (`assert`, `equal`, `notEqual`, `deepEqual`, `throws`, `doesNotThrow`).
- A URL query-parameter shim for the prayer-time request fixture.
- Promise microtask draining to allow the script's asynchronous prayer and backup checks to complete.

Observed log messages:

```text
Daybook regression checks passed.
Phase 7B.1 design system and application shell checks passed.
Step 5A.1 occurrence identity and exception checks passed.
Step 7A prayer runtime, location, method, cache, reminder and timezone checks passed.
```

No failures were captured. Because the shims are not the Node standard library and the script was not launched through npm, this result is reported as an isolated V8 execution of the verification logic, not as an `npm test` pass.

## Phase 2.1 independent audit corrections

- Reproduced a data-loss case in the feature-branch implementation: a legacy `repeat: "monthly"` task synchronized successfully as `repeat: "none"`, and an invalid completion-history date was silently discarded.
- Updated `normalizeTask()` to reject unsupported recurrence values, malformed weekday arrays and invalid completion-history dates before writing canonical tasks.
- Updated `setTaskCompletion()` to reject dates that are not active occurrences under the task's recurrence boundaries/weekday rule, while allowing an explicit postponed destination.
- Preserved the original legacy `duration` alias in addition to canonical `durationMinutes`, with a regression assertion.
- Re-executed the complete current `scripts/verify.js` logic after the corrections in isolated V8 using GitHub-fetched source files and `fs`, `assert/strict` and `URL` compatibility shims; all four success messages were emitted, with no captured failures.
- Added regression assertions for unsupported recurrence, malformed completion history and non-occurrence completion dates.
- The updated scheduling source and targeted regression cases were executed in the isolated V8 runtime after these corrections. This is not Node.js or `npm test`.

## Remaining verification gates

The following must still be completed in a genuine checkout before release or merge to `main`:

1. Run `npm test` under the repository's declared Node 22 environment.
2. Run `npm run build` with dependencies installed.
3. Run `git diff --check` and review the full native Git diff.
4. Verify the built `www/` output and service-worker assets.
5. Run browser/PWA workflows including Agenda, recurring exceptions, Smart Planner and backup/restore.
6. Run Capacitor sync and Android APK generation; install and smoke-test on Android.
7. Verify the resulting GitHub Actions status for the release commit.

No unexecuted command is represented as passed.
