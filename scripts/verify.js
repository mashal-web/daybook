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
assert.equal(/(?<!\$)\$\(["\'][^"\']+["\']\)\.(?:forEach|map|filter|find|some|reduce|flatMap|sort)\(/.test(app), false, "querySelector results must not be treated as collections");
assert.equal(/\${3,}\(/.test(app), false, "Malformed triple-dollar selectors must not exist");
assert(app.includes("const safeWrite="), "Storage writes must be guarded against unavailable or full storage");
assert(!app.includes("+c.day!==6"), "Routine version upgrades must not delete custom Saturday classes");
assert(app.includes("function persist(){const saved="), "Persistence must report storage failures");
assert(app.includes('$("#manageForm").onsubmit='), "Subject manager must handle Enter-key submission");
assert(app.includes("nextWeekKey"), "Weekly analytics must exclude future weeks");
assert(app.includes("function refreshDayBoundary()") && app.includes("setInterval(refreshDayBoundary,60000)"), "Dashboard dates must refresh across midnight");
assert(app.includes("grace=5*60*1000"), "Web reminders must tolerate brief background-tab delays");
assert(app.includes("navigator.serviceWorker.ready.then(reg=>reg.showNotification"), "Web reminders should use service-worker notifications when available");
assert(sw.includes('self.addEventListener("notificationclick"')&&sw.includes("clients.openWindow"), "Web notification taps should reopen Daybook");
assert(native.includes("reminderSyncQueue = reminderSyncQueue.catch"), "Android reminder sync must be serialized");
assert(sw.includes("const response=await fetch(request)"), "Service worker should prefer current network assets");
assert(sw.includes('key.startsWith("daybook-")'), "Service worker must not delete caches owned by other apps");
assert.equal(app.includes("function renderScheduleConflicts"), false, "Obsolete conflict renderer should be removed");

const ids = [...html.matchAll(/\bid=["']([^"']+)["']/g)].map(match => match[1]);
assert(html.includes('<dialog id="goalDialog" aria-labelledby="goalDialogTitle"') && html.includes('<h3 id="goalDialogTitle">Weekly study goal</h3>'), "Goal dialog must label itself with its own heading");
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
assert(!app.includes('<div class="table-scroll"><table'), "Timetable must not create nested scroll containers");
assert(html.includes('class="table-scroll" role="region"'), "Outer timetable region should own horizontal scrolling");
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
const validateBackup = new Function("uid", "minutes", "iso", "DAYS", validationMatch[0] + "; return validateBackup;")(uid, minutes, iso, ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]);
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
assert(app.includes('JSON.stringify(data.reminders)!==lastSyncedReminders'), "Unrelated edits must not reschedule Android reminders");
assert(app.includes("lastSyncedReminders=snapshot"), "Successful reminder sync must advance its snapshot");
assert(app.includes('s.done?"Reopen":"Complete"')&&app.includes("s.done=!s.done"), "Study sessions must be reopenable after completion");
assert(["focusProgress","progress","goalProgress"].every(id=>html.includes('id="'+id+'" role="progressbar"')), "Progress indicators must expose accessible progressbar semantics");
assert(app.includes('setAttribute("aria-valuenow"'), "Progress values must update for assistive technology");
assert(sw.includes("request.mode") && sw.includes("navigate"), "Service worker must use navigation-only offline fallback");


function smokeTestAppRuntime() {
  class MockElement {
    constructor(tag, attrs = {}) {
      this.tagName = tag.toUpperCase();
      this.attributes = { ...attrs };
      this.dataset = {};
      this.listeners = {};
      this.style = {};
      this.classNames = new Set((attrs.class || "").split(/\s+/).filter(Boolean));
      this.classList = {
        add: name => this.classNames.add(name),
        remove: name => this.classNames.delete(name),
        contains: name => this.classNames.has(name),
        toggle: (name, force) => {
          const enabled = force === undefined ? !this.classNames.has(name) : !!force;
          if (enabled) this.classNames.add(name); else this.classNames.delete(name);
          return enabled;
        }
      };
      for (const [key, value] of Object.entries(attrs)) {
        if (key.startsWith("data-")) this.dataset[key.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = value;
      }
      this.value = attrs.value || "";
      this.checked = !!attrs.checked;
      this.textContent = "";
      this.innerHTML = "";
      this.disabled = false;
      this.open = false;
    }
    addEventListener(type, callback) { (this.listeners[type] ||= []).push(callback); }
    fire(type, event = {}) {
      for (const callback of this.listeners[type] || []) callback({ target: this, preventDefault() {}, ...event });
      if (typeof this["on" + type] === "function") this["on" + type]({ target: this, preventDefault() {}, ...event });
    }
    click() { this.fire("click"); }
    setAttribute(name, value) { this.attributes[name] = String(value); }
    removeAttribute(name) { delete this.attributes[name]; }
    contains(element) { return element === this; }
    showModal() { this.open = true; }
    close() { this.open = false; }
  }

  const elements = [];
  for (const match of html.matchAll(/<([a-zA-Z][\w-]*)\b([^>]*)>/g)) {
    const attrs = {};
    for (const attr of match[2].matchAll(/([^\s=]+)(?:="([^"]*)")?/g)) attrs[attr[1]] = attr[2] ?? "";
    elements.push(new MockElement(match[1], attrs));
  }
  const byId = new Map(elements.filter(element => element.attributes.id).map(element => [element.attributes.id, element]));
  const documentEvents = {};
  const document = {
    documentElement: new MockElement("html"),
    querySelector(selector) { return selector.startsWith("#") ? byId.get(selector.slice(1)) || null : null; },
    querySelectorAll(selector) {
      if (selector.startsWith(".")) return elements.filter(element => element.classList.contains(selector.slice(1)));
      const match = selector.match(/^\[data-([a-z-]+)\]$/);
      if (match) {
        const key = match[1].replace(/-([a-z])/g, (_, c) => c.toUpperCase());
        return elements.filter(element => Object.prototype.hasOwnProperty.call(element.dataset, key));
      }
      return [];
    },
    getElementById(id) { return byId.get(id) || null; },
    addEventListener(type, callback) { (documentEvents[type] ||= []).push(callback); },
    createElement(tag) { return new MockElement(tag); }
  };
  const storage = new Map();
  const localStorage = {
    getItem(key) { return storage.has(key) ? storage.get(key) : null; },
    setItem(key, value) { storage.set(key, String(value)); },
    removeItem(key) { storage.delete(key); }
  };
  const windowEvents = {};
  const window = {
    DaybookNative: undefined,
    addEventListener(type, callback) { (windowEvents[type] ||= []).push(callback); },
    dispatchEvent(event) { for (const callback of windowEvents[event.type] || []) callback(event); }
  };
  const context = {
    document, window, localStorage, Date, Math, JSON, String, Number, Object, Array, Set, Map,
    RegExp, Promise, Error, Intl, confirm: () => true, setInterval: () => 1,
    setTimeout: () => 1, clearTimeout: () => {}, Notification: undefined,
    location: { reload() {} }, URL: {}, Blob: class {},
    FormData: class { entries() { return Object.entries(context.formPayload || {}); } }
  };
  assert.doesNotThrow(() => new Function(...Object.keys(context), app)(...Object.values(context)), "app.js must initialize without browser runtime errors");

  const nav = elements.filter(element => element.classList.contains("nav"));
  assert.equal(nav.length, 12, "Desktop and mobile navigation should both be present");
  nav.find(element => element.dataset.view === "tasks").click();
  assert.equal(byId.get("tasks").classList.contains("active"), true, "Tasks navigation should activate the Tasks view");
  assert.equal(byId.get("heading").textContent, "Tasks", "Navigation should update the page heading");

  const menu = byId.get("menu");
  menu.click();
  assert.equal(menu.attributes["aria-expanded"], "true", "Menu should expose its expanded state");
  assert.equal(menu.attributes["aria-label"], "Close navigation", "Menu accessible name should change when opened");
  menu.click();
  assert.equal(menu.attributes["aria-expanded"], "false", "Menu should close on the next tap");

  const addTask = elements.find(element => element.dataset.add === "task");
  addTask.click();
  assert.equal(byId.get("editor").open, true, "Add task should open the editor");
  context.formPayload = { title: "Runtime smoke test", category: "Personal", priority: "High", due: "", notes: "" };
  byId.get("form").onsubmit({ target: byId.get("form"), preventDefault() {} });
  const savedTasks = JSON.parse(storage.get("daybook_tasks"));
  assert.equal(savedTasks.length, 1, "Submitting the task form should persist a task");
  assert.equal(savedTasks[0].title, "Runtime smoke test");

  byId.get("manageSubjects").click();
  byId.get("newSubject").value = "Runtime subject";
  byId.get("manageForm").onsubmit({ target: byId.get("manageForm"), preventDefault() {} });
  assert(JSON.parse(storage.get("daybook_subjects")).includes("Runtime subject"), "Subject form should submit from the keyboard");

  elements.find(element => element.dataset.add === "routine").click();
  context.formPayload = { title: "Runtime routine", day: "0", time: "22:00" };
  byId.get("form").onsubmit({ target: byId.get("form"), preventDefault() {} });
  assert(JSON.parse(storage.get("daybook_routine")).some(item => item.title === "Runtime routine"), "Routine form should persist an activity");

  elements.find(element => element.dataset.add === "class").click();
  context.formPayload = { subject: "Engineering Mathematics", day: "0", start: "10:00", end: "11:00", room: "Test room" };
  byId.get("form").onsubmit({ target: byId.get("form"), preventDefault() {} });
  assert(JSON.parse(storage.get("daybook_classes")).some(item => item.room === "Test room"), "Class form should persist a class");

  elements.find(element => element.dataset.add === "reminder").click();
  context.formPayload = { title: "Runtime reminder", date: "2099-12-31", time: "18:00", repeat: "daily" };
  byId.get("form").onsubmit({ target: byId.get("form"), preventDefault() {} });
  assert(JSON.parse(storage.get("daybook_reminders")).some(item => item.title === "Runtime reminder"), "Reminder form should persist a reminder");

  elements.find(element => element.dataset.add === "study").click();
  context.formPayload = { subject: "Engineering Mathematics", topic: "Runtime test", date: "2099-12-31", minutes: "45" };
  byId.get("form").onsubmit({ target: byId.get("form"), preventDefault() {} });
  assert(JSON.parse(storage.get("daybook_sessions")).some(item => item.topic === "Runtime test"), "Study form should persist a session");
}
smokeTestAppRuntime();

console.log("Daybook regression checks passed.");
