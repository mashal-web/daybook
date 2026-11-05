"use strict";
const fs = require("node:fs");
const assert = require("node:assert/strict");
const read = path => fs.readFileSync(path, "utf8");
const app = read("app.js");
const html = read("index.html");
const sw = read("sw.js");
const build = read("scripts/build.js");
const native = read("native.js");
const workflow = read(".github/workflows/android.yml");

for (const [name, source] of [["app.js", app], ["sw.js", sw], ["build.js", build], ["native.js", native.replace(/^import .*;\s*/gm, "")]]) {
  assert.doesNotThrow(() => new Function(source), name + " must parse");
}
assert.equal(/(?<!\$)\$\(["'][^"']+["']\)\.forEach/.test(app), false, "querySelector results must not be treated as collections");
assert.equal(/\${3,}\(/.test(app), false, "Malformed triple-dollar selectors must not exist");
assert.equal(app.includes("function renderScheduleConflicts"), false, "Obsolete conflict renderer should be removed");

const ids = [...html.matchAll(/\bid=["']([^"']+)["']/g)].map(match => match[1]);
assert.equal(new Set(ids).size, ids.length, "HTML IDs must be unique");
const idSet = new Set(ids);
for (const id of new Set([...app.matchAll(/\$\(["']#([^"']+)["']\)/g)].map(match => match[1]))) {
  assert(idSet.has(id), "Missing HTML ID: #" + id);
}
const viewIds = new Set([...html.matchAll(/class=["'][^"']*\bview\b[^"']*["'][^>]*id=["']([^"']+)["']/g)].map(match => match[1]));
const navTargets = new Set([...html.matchAll(/data-view=["']([^"']+)["']/g)].map(match => match[1]));
for (const target of navTargets) assert(viewIds.has(target), "Missing view for navigation target: " + target);
assert.equal(viewIds.size, 6, "Expected six main views");
assert(app.includes('aria-label="Weekly timetable with timing and seven days"'), "Weekly table should describe its eight columns");
assert(app.includes('class="table-scroll"><table class="week-table"'), "Weekly table should have a mobile scroll wrapper");
assert(app.includes('colspan="8"'), "Empty timetable row should span all eight columns");
assert(/data-id=.*esc\(id\)/.test(app), "Record IDs must be HTML escaped before rendering");
assert(build.includes('"sw.js"'), "Android build must copy the service worker");
assert(workflow.includes("node scripts/verify.js"), "Android workflow must run regression tests");
assert(workflow.includes("android.permission.SCHEDULE_EXACT_ALARM"), "Android build must declare exact-alarm permission");

const uid = (() => { let n = 0; return () => "test-" + (++n); })();
const minutes = value => { const [h, m] = value.split(":").map(Number); return h * 60 + m; };
const iso = value => {
  const date = new Date(value);
  return date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0") + "-" + String(date.getDate()).padStart(2, "0");
};
const validationMatch = app.match(/function validateBackup\(parsed\)\{[\s\S]*?return \{incoming,result\};\n\}/);
assert(validationMatch, "Backup validation function must exist");
const validateBackup = new Function("uid", "minutes", "iso", validationMatch[0] + "; return validateBackup;")(uid, minutes, iso);
const backup = { app: "Daybook", version: 1, data: {
  subjects: ["Engineering Mathematics"], classes: [],
  routine: [{ id: "r1", day: 1, time: "06:00", title: "Tilawat" }],
  tasks: [{ id: "t1", title: "Revise derivatives" }],
  sessions: [],
  reminders: [{ id: "m1", title: "Study", date: "2026-12-01", time: "18:00", repeat: "none" }],
  goal: 10, settings: { timeFormat: "12h" }
}};
const imported = validateBackup(backup);
assert.deepEqual(imported.result.subjects, ["Engineering Mathematics"]);
assert.equal(imported.incoming.goal, 10);
assert.equal(imported.result.tasks[0].id, "t1");
const legacy = validateBackup({ ...backup, data: { ...backup.data, routine: [{ id: "legacy", time: "06:00", title: "Legacy activity" }] } }).result.routine;
assert.equal(legacy.length, 7, "Legacy common routine entries should expand across all seven days");
assert.equal(new Set(legacy.map(item => item.id)).size, 7, "Expanded entries must receive unique IDs");
assert.throws(() => validateBackup({ ...backup, data: { ...backup.data, tasks: [{ id: "dup", title: "A" }, { id: "dup", title: "B" }] } }), /Duplicate record ID/);
assert.throws(() => validateBackup({ ...backup, data: { ...backup.data, goal: 0 } }), /Invalid weekly goal/);
assert.throws(() => validateBackup({ ...backup, data: { ...backup.data, settings: { timeFormat: "invalid" } } }), /Invalid settings/);

const migrationMatch = app.match(/const routineData=\(\(\)=>\{[\s\S]*?\}\)\(\);/);
assert(migrationMatch, "Routine migration must exist");
const migrate = new Function("oldRoutine", "routineTemplate", "storedRoutineVersion", "ROUTINE_VERSION", "DAYS", "uid", migrationMatch[0] + "; return routineData;");
const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const defaults = days.map((_, day) => ({ id: "d" + day, day, time: "07:00", title: "Breakfast" }));
const migrated = migrate([{ id: "custom", time: "06:00", title: "Custom activity" }], defaults, 1, 2, days, uid);
assert.equal(migrated.filter(item => item.title === "Custom activity").length, 7);
assert.equal(migrated.filter(item => item.title === "Breakfast").length, 7);

const timeMatch = app.match(/const validTime=s=>(\/[^;]+?\/)\.test\(s\)/);
assert(timeMatch, "24-hour time validator must exist");
const validTime = new Function("return " + timeMatch[1])();
assert(validTime.test("00:00") && validTime.test("23:59"));
assert(!validTime.test("24:00") && !validTime.test("7:30"));

const dateMatch = app.match(/const validDate=s=>(\/[^;]+?\/)\.test\(s\)/);
assert(dateMatch, "ISO date validator must exist");
const validDateShape = new Function("return " + dateMatch[1])();
assert(validDateShape.test("2026-12-01"));
assert(!validDateShape.test("26-12-01"));

const reminderLogic = native.includes("while (at <= now)") && native.includes('const count = repeat === "day" ? 30 : repeat === "week" ? 12 : 1');
assert(reminderLogic, "Recurring Android reminders should advance missed occurrences and pre-schedule bounded occurrences");
assert(native.includes("checkExactNotificationSetting"), "Android exact-alarm permission state must be checked");
assert(native.includes("LocalNotifications.cancel"), "Reminder sync must cancel stale scheduled notifications");
assert(sw.includes('request.mode === "navigate"'), "Offline fallback should be limited to page navigation");

console.log("Daybook regression checks passed.");
