"use strict";
const fs = require("node:fs");
const assert = require("node:assert/strict");
const root = process.cwd();
const read = path => fs.readFileSync(path, "utf8");
const app = read("app.js");
const html = read("index.html");
const sw = read("sw.js");
const build = read("scripts/build.js");
const native = read("native.js");
const workflow = read(".github/workflows/android.yml");

assert.doesNotThrow(() => new Function(app), "app.js must parse");
assert.doesNotThrow(() => new Function(sw), "sw.js must parse");
assert.doesNotThrow(() => new Function(build), "build.js must parse");
assert.doesNotThrow(() => new Function(native.replace(/^import .*;\\s*/gm, "")), "native.js must parse");
assert.equal(/(?<!\$)\$\(["'][^"']+["']\)\.forEach/.test(app), false, "collection operations must use $()");
assert.equal(/\${3,}\(/.test(app), false, "triple-dollar selectors must not exist");
assert.equal(app.includes("function renderScheduleConflicts"), false, "obsolete schedule conflict renderer must be removed");
assert.equal(app.includes("if(!list.some(s=>String(s).toLowerCase()===course.toLowerCase()))"), false, "removed subjects must not be silently re-added");
assert(native.includes("schedule: { at: scheduledAt, allowWhileIdle: true }"), "Android reminders must use anchored one-time occurrences");
assert.equal(native.includes("repeats: true") || native.includes("every: repeat"), false, "Android recurring reminders must not use conflicting schedule modes");
assert(workflow.includes("android.permission.SCHEDULE_EXACT_ALARM"), "Android exact-alarm permission must be declared");

const ids = [...html.matchAll(/\bid=["']([^"']+)["']/g)].map(match => match[1]);
assert.equal(new Set(ids).size, ids.length, "HTML IDs must be unique");
const idSet = new Set(ids);
const selectors = [...app.matchAll(/\$\(["']#([^"']+)["']\)/g)].map(match => match[1]);
for (const id of new Set(selectors)) assert(idSet.has(id), "Missing HTML ID: #" + id);

const viewIds = new Set([...html.matchAll(/class=["'][^"']*\bview\b[^"']*["'][^>]*id=["']([^"']+)["']/g)].map(match => match[1]));
const navTargets = new Set([...html.matchAll(/data-view=["']([^"']+)["']/g)].map(match => match[1]));
for (const target of navTargets) assert(viewIds.has(target), "Navigation target has no view: " + target);
assert.equal(viewIds.size, 6, "Expected six primary views");
assert(app.includes('aria-label="Weekly timetable with timing and seven days"'), "Weekly table must identify its eight-column structure");
assert(app.includes('class="table-scroll"><table class="week-table"'), "Weekly timetable must scroll horizontally on small screens");
assert(app.includes("data.routine.filter(r=>+r.day===today.getDay())"), "Overview must show routine activities as well as classes");
assert(app.includes('data-id="'+esc(id)+'"'), "Dynamic record IDs must be HTML-escaped");
assert(app.includes('colspan="8"'), "Empty timetable state must span all eight columns");
assert(build.includes('"sw.js"'), "Android build must include the service worker");

const uid = (() => { let n = 0; return () => "test-" + (++n); })();
const minutes = time => { const [hour, minute] = time.split(":").map(Number); return hour * 60 + minute; };
const iso = value => {
  const date = new Date(value);
  return date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0") + "-" + String(date.getDate()).padStart(2, "0");
};
const validationMatch = app.match(/function validateBackup\(parsed\)\{[\s\S]*?return \{incoming,result\};\n\}/);
assert(validationMatch, "Backup validator must exist");
const validateBackup = new Function("uid", "minutes", "iso", validationMatch[0] + "; return validateBackup;")(uid, minutes, iso);
const backup = { app: "Daybook", version: 1, data: {
  subjects: ["Engineering Mathematics"],
  classes: [],
  routine: [{ id: "r1", day: 1, time: "06:00", title: "Tilawat" }],
  tasks: [{ id: "t1", title: "Revise derivatives" }],
  sessions: [],
  reminders: [{ id: "m1", title: "Study", date: "2026-12-01", time: "18:00", repeat: "none" }],
  goal: 10,
  settings: { timeFormat: "12h" }
}};
const imported = validateBackup(backup);
assert.deepEqual(imported.result.subjects, ["Engineering Mathematics"], "Exported subject strings must import");
assert.equal(imported.incoming.goal, 10);
assert.equal(typeof imported.result.tasks[0].id, "string", "Imported numeric IDs must normalize to strings");
const legacyBackup = { ...backup, data: { ...backup.data, routine: [{ id: "legacy", time: "06:00", title: "Legacy common activity" }] } };
const legacyRoutine = validateBackup(legacyBackup).result.routine;
assert.equal(legacyRoutine.length, 7, "Legacy common routine entries must expand across all seven days");
assert.equal(new Set(legacyRoutine.map(item => item.id)).size, 7, "Expanded routine entries must receive unique IDs");
assert.throws(() => validateBackup({ ...backup, data: { ...backup.data, tasks: [{ id: "duplicate", title: "One" }, { id: "duplicate", title: "Two" }] } }), /Duplicate record ID/);
assert.throws(() => validateBackup({ ...backup, data: { ...backup.data, goal: 0 } }), /Invalid weekly goal/);
assert.throws(() => validateBackup({ ...backup, data: { ...backup.data, settings: { timeFormat: "invalid" } } }), /Invalid settings/);

const migrationMatch = app.match(/const routineData=\(\(\)=>\{[\s\S]*?\}\)\(\);/);
assert(migrationMatch, "Routine migration must exist");
const migrate = new Function("oldRoutine", "routineTemplate", "storedRoutineVersion", "ROUTINE_VERSION", "DAYS", "uid", migrationMatch[0] + "; return routineData;");
const defaults = Array.from({ length: 7 }, (_, day) => ({ id: "d" + day, day, time: "07:00", title: "Breakfast" }));
const migrated = migrate([{ id: "custom", time: "06:00", title: "My custom routine" }], defaults, 1, 2, ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"], uid);
assert.equal(migrated.filter(item => item.title === "My custom routine").length, 7, "Legacy common routine entries must survive migration across all days");
assert.equal(migrated.some(item => item.title === "Breakfast" && item.day === 0), true, "Unoccupied default slots must be added");
assert.equal(migrated.some(item => item.title === "Breakfast" && item.day === 1), true, "Default slots must be preserved on every day");


const timePattern = app.match(/const validTime=s=>(\/[^;]+?\/)\.test\(s\)/);
assert(timePattern, "Time validator must exist");
const validTime = new Function("return " + timePattern[1])();
assert(validTime.test("06:00") && validTime.test("23:59"), "Valid 24-hour times must pass");
assert(!validTime.test("24:00") && !validTime.test("6:00"), "Invalid time formats must fail");
const datePattern = app.match(/const validDate=s=>(\/[^;]+?\/)\.test\(s\)/);
assert(datePattern, "Date validator must exist");
const validDateShape = new Function("return " + datePattern[1])();
assert(validDateShape.test("2026-12-01"), "Valid ISO dates must pass");
assert(!validDateShape.test("26-12-01"), "Invalid ISO dates must fail");
assert.equal((app.match(/\\\\/g) || []).length, 0, "Regex literals must not contain accidental double-escaped backslashes");

console.log("Daybook verification passed: syntax, navigation, DOM IDs, timetable structure, backup import and routine migration.");
