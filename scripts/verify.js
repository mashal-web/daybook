"use strict";
const fs = require("node:fs");
const assert = require("node:assert/strict");
const read = path => fs.readFileSync(path, "utf8");
const app = read("app.js");
const scheduling = read("scheduling.js");
const persistence = read("persistence.js");
const html = read("index.html");
const css = read("styles.css");
const timetableCss = read("timetable-theme.css");


const sw = read("sw.js");
const build = read("scripts/build.js");
const native = read("native.js");
const upgrade = read("upgrade.js");
const mobile = read("mobile-app.css");
const design = read("design-system.css");
const plannerCss = read("study-planner.css");
assert(html.includes('id="planner"')&&html.includes('id="plannerFocusSubject"')&&html.includes('id="plannerConsistency"'), "Study planner workspace, shared focus timer and progress visualizations must be present");
assert(build.includes('"study-planner.css"')&&sw.includes('"./study-planner.css"'), "Study planner stylesheet must be packaged and cached offline");
assert(plannerCss.includes("#planner .planner-overview")&&plannerCss.includes("@media(max-width:900px)"), "Study planner styling must be scoped and mobile responsive");
assert(plannerCss.includes("#planner.active{display:grid")&&!plannerCss.includes("#planner{display:grid"), "Inactive planner must remain hidden when another view is selected");
assert(app.includes("function sessionCompletedDate")&&app.includes("function renderPlanner()")&&app.includes("plannerSessionFilter"), "Study statistics and session filters must derive from saved sessions");
assert(app.includes("data-subjectrename")&&app.includes("Existing study sessions and timetable records will be preserved"), "Subject rename and removal must preserve historical references");
assert(app.includes('field("Start time (optional)","startTime","time"')&&app.includes('field("Notes (optional)","notes","text"'), "Study sessions must support optional start times and notes");
assert(app.includes('$("#plannerFocusStart").onclick=toggleFocusTimer')&&app.includes('$("#plannerFocusReset").onclick=resetFocusTimer'), "Planner timer controls must reuse the existing persistent focus timer");
assert(app.includes("sessionCompletedDate(s)===todayKey")&&app.includes("sessionCompletedDate(s)>=weekKey"), "Study totals must use actual completion dates");
assert(build.includes('"mobile-app.css"'), "Android build must package mobile stylesheet");
assert(build.includes('"design-system.css"') && sw.includes('"./design-system.css"'), "Android build and offline cache must include the unified design system");
assert(html.includes('id="themeSetting"') && app.includes("function applyTheme(theme)") && app.includes('theme:$("#themeSetting").value'), "Dark/light theme preference must be selectable and persistent");
assert(design.includes('[data-theme="light"]') && design.includes('[data-theme="dark"]'), "Both complete theme definitions must be present");
assert(sw.includes('"./mobile-app.css"'), "Offline shell must cache mobile stylesheet");
assert(html.includes('id="moreDialog"') && html.includes('id="openMore"'), "Mobile navigation must provide a More sheet");
assert(mobile.includes("env(safe-area-inset-bottom)") && mobile.includes("grid-template-columns:repeat(5"), "Mobile layout must respect safe areas and use a five-item bottom bar");
assert(app.includes("openView(b.dataset.view)") && app.includes('$("#openMore")?.addEventListener'), "Mobile navigation targets and More sheet must be wired");
const manifest = JSON.parse(read("manifest.webmanifest"));
const workflow = read(".github/workflows/android.yml");

for (const [name, source] of [["app.js", app], ["scheduling.js", scheduling], ["sw.js", sw], ["build.js", build], ["native.js", native.replace(/^import .*;\s*/gm, "")], ["upgrade.js", upgrade]]) {
  assert.doesNotThrow(() => new Function(source), name + " must parse");
}
assert.equal(/(?<!\$)\$\(["\'][^"\']+["\']\)\.(?:forEach|map|filter|find|some|reduce|flatMap|sort)\(/.test(app), false, "querySelector results must not be treated as collections");
assert.equal(/\${3,}\(/.test(app), false, "Malformed triple-dollar selectors must not exist");
assert(app.includes("const safeWrite="), "Storage writes must be guarded against unavailable or full storage");
assert(!app.includes("+c.day!==6"), "Routine version upgrades must not delete custom Saturday classes");
assert(app.includes("function persist(){const scheduleSaved=")&&app.includes("const legacySaved="), "Persistence must report schedule and legacy storage failures without skipping legacy writes");
assert(app.includes('$("#manageForm").onsubmit='), "Subject manager must handle Enter-key submission");
assert(app.includes("nextWeekKey"), "Weekly analytics must exclude future weeks");
assert(app.includes("function refreshDayBoundary()") && app.includes("setInterval(refreshDayBoundary,60000)"), "Dashboard dates must refresh across midnight");
assert(app.includes("grace=5*60*1000"), "Web reminders must tolerate brief background-tab delays");
assert(app.includes("navigator.serviceWorker.ready.then(reg=>reg.showNotification"), "Web reminders should use service-worker notifications when available");
assert(app.includes('p.exactAlarm==="denied"?" (reminders may be delayed)":""'), "Only denied exact-alarm access should show a delay warning");
assert(sw.includes('self.addEventListener("notificationclick"')&&sw.includes("clients.openWindow"), "Web notification taps should reopen Daybook");
assert(native.includes("reminderSyncQueue = reminderSyncQueue.catch"), "Android reminder sync must be serialized");
assert(sw.includes("const response=await fetch(request)"), "Service worker should prefer current network assets");
assert(sw.includes('key.startsWith("daybook-")'), "Service worker must not delete caches owned by other apps");
assert.equal(app.includes("function renderScheduleConflicts"), false, "Obsolete conflict renderer should be removed");
assert(app.includes("data-duplicate=")&&app.includes("function openEditor(type,id=null,duplicateFrom=null)"), "Classes and activities must support duplication");
assert(app.includes("End time (optional)")&&app.includes("This activity overlaps another scheduled item"), "Activities must support durations and warn about overlaps");
assert(app.includes('setInterval(()=>{if(activeView==="schedule")renderWeek()},60000)'), "Selected-day time status should refresh once per minute");

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
assert.equal(viewIds.size, 9, "Expected nine main views");
assert(html.includes('id="classCount"')&&html.includes('id="classSetupNote"'), "Weekly routine must include university schedule summary and setup guidance");
assert(app.includes('$("#classCount").textContent=weekClasses.length'), "Weekly timetable must count university classes in the displayed week");
assert(app.includes("UNIVERSITY CLASS")&&app.includes("HAPPENING NOW"), "Day agenda must distinguish classes and identify ongoing events");
assert(app.includes("function weekDates()")&&app.includes("function scheduleEntries(day)")&&app.includes("data-weekday"), "Weekly timetable must render seven selectable days and a selected-day agenda");
assert(html.includes('src="scheduling.js"')&&build.includes('"scheduling.js"')&&sw.includes('"./scheduling.js"'), "Scheduling engine must load in web, Android and offline builds");
assert(scheduling.includes("function getForDate")&&scheduling.includes("function getForWeek")&&scheduling.includes("function getUpcoming")&&scheduling.includes("function findOverlaps"), "Scheduling engine must expose centralized schedule queries");
assert(app.includes("scheduleStore.getForDate")&&app.includes("scheduleStore.getForWeek"), "Week and day views must read the unified scheduling engine");
assert(app.includes("canonicalId:item.id,id:item.source?.legacyId||item.id"), "Legacy event IDs must remain usable by existing edit and delete handlers");
assert(upgrade.includes("engine.getForDate(new Date())"), "Agenda must read the unified scheduling engine");
assert(upgrade.includes('window.addEventListener("daybook-schedule-updated"'), "Agenda and smart planning must refresh on shared schedule changes");
assert(scheduling.includes('"daybook-schedule-updated"'), "Schedule mutations must publish a shared update event");
assert(html.includes('data-add="class"')&&html.includes('data-add="routine"'), "Weekly routine must allow adding both class periods and routine activities");
assert(css.includes(".schedule-insights")&&timetableCss.includes(".week-day-strip")&&timetableCss.includes(".day-timeline"), "Weekly routine must style responsive day navigation and timeline");

assert(html.includes('id="academics"') && html.includes('id="habits"') && html.includes('id="finance"'), "Academic, habit and finance modules must be present");
assert(build.includes('"upgrade.js"') && build.includes('"upgrade.css"') && build.includes('"timetable-theme.css"'), "Android build must package every stylesheet and extension module");
assert(sw.includes('"./upgrade.js"') && sw.includes('"./upgrade.css"') && sw.includes('"./timetable-theme.css"'), "Offline shell must cache the new modules");
assert(upgrade.includes("Complete backup exported") && upgrade.includes("Complete Daybook backup restored"), "Complete backup must include and restore extension data");
assert(html.includes('id="settingsDialog"')&&html.includes('id="timeFormatSetting"'), "Settings dialog must expose the stored time-format preference");
assert(app.includes('$("#settingsForm").onsubmit=')&&app.includes('timeFormat:$("#timeFormatSetting").value'), "Time-format setting must be editable and persisted");
assert(app.includes('filter==="overdue"?!t.done&&!!t.due&&t.due<iso(today)'), "Overdue task filter must include only unfinished past-due tasks");
assert(app.includes('$("#overdue").textContent=data.tasks.filter(t=>!t.done&&t.due&&t.due<iso(today)).length'), "Dashboard must show overdue task count");
assert(app.includes("function dueMeta(t)"), "Tasks must show relative due-date labels");
assert(html.includes('id="weekDays" role="tablist"')&&html.includes('id="dayTimeline"'), "Mobile timetable must expose day tabs and a selected-day timeline");
assert(!app.includes('<div class="table-scroll"><table'), "Timetable must not create nested scroll containers");
assert(!html.includes('class="table-scroll"'), "Timetable must not require a wide horizontally scrolling table");
assert(app.includes("A clear day")&&app.includes("Add an activity"), "Empty days should provide an add-activity action");
assert(/data-id=.*esc\(id\)/.test(app), "Record IDs must be HTML escaped before rendering");
assert(build.includes('"sw.js"'), "Android build must copy the service worker");
assert(workflow.includes("npm test")||workflow.includes("node scripts/verify.js"), "Android workflow must run regression tests");
assert(manifest.icons.some(icon=>icon.sizes==="192x192"&&icon.type==="image/png"), "PWA manifest must include a 192px PNG icon");
assert(manifest.icons.some(icon=>icon.sizes==="512x512"&&icon.type==="image/png"), "PWA manifest must include a 512px PNG icon");
assert(workflow.includes("android.permission.SCHEDULE_EXACT_ALARM"), "Android build must declare exact-alarm permission");
assert(workflow.includes("Apply Daybook launcher icons")&&workflow.includes("ic_launcher_foreground.png"), "Android builds must use Daybook launcher assets");

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
assert(app.includes("function renderPlanner()")&&app.includes("session.done=!session.done"), "Study sessions must be reopenable after completion");
const sessionToggleMatch = app.match(/\$\$\("\[data-sessiondone\]"\)\.forEach\(button=>button\.onclick=\(\)=>\{([\s\S]*?)\}\);/);
assert(sessionToggleMatch, "Study-session completion handler must be wired");
const sessionState = { sessions: [{ id: "session-1", done: false }] };
let sessionMessage = "";
const toggleSession = new Function("data", "button", "save", sessionToggleMatch[1]);
toggleSession(sessionState, { dataset: { sessiondone: "session-1" } }, message => { sessionMessage = message; });
assert.equal(sessionState.sessions[0].done, true);
assert.equal(typeof sessionState.sessions[0].completedAt, "string");
assert.equal(sessionMessage, "Study session completed");
toggleSession(sessionState, { dataset: { sessiondone: "session-1" } }, message => { sessionMessage = message; });
assert.equal(sessionState.sessions[0].done, false);
assert.equal(sessionState.sessions[0].completedAt, null);
assert.equal(sessionMessage, "Study session reopened");
assert(["focusProgress","progress","goalProgress"].every(id=>html.includes('id="'+id+'" role="progressbar"')), "Progress indicators must expose accessible progressbar semantics");
assert(html.includes('id="heading" aria-live="polite"')&&html.includes('id="notifyStatus" role="status" aria-live="polite"'), "Page navigation and notification status must be announced to screen readers");
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
    setItem(key, value) { if (context.storageFailure) throw new Error("QuotaExceededError"); storage.set(key, String(value)); },
    removeItem(key) { storage.delete(key); }
  };
  const windowEvents = {};
  const window = {
    DaybookNative: undefined,
    addEventListener(type, callback) { (windowEvents[type] ||= []).push(callback); },
    dispatchEvent(event) { for (const callback of windowEvents[event.type] || []) callback(event); }
  };
  window.DaybookSchedule = new Function("window", scheduling + "; return window.DaybookSchedule;")({});
  const context = {
    document, window, localStorage, Date, Math, JSON, String, Number, Object, Array, Set, Map,
    RegExp, Promise, Error, Intl, CustomEvent: class { constructor(type, init = {}) { this.type = type; this.detail = init.detail; } }, confirm: () => true, setInterval: () => 1,
    setTimeout: () => 1, clearTimeout: () => {}, Notification: undefined,
    location: { reload() {} }, URL: {}, Blob: class {}, storageFailure: false,
    FormData: class { entries() { return Object.entries(context.formPayload || {}); } }
  };
  assert.doesNotThrow(() => new Function(...Object.keys(context), app)(...Object.values(context)), "app.js must initialize without browser runtime errors");

  const nav = elements.filter(element => element.classList.contains("nav"));
  assert.equal(nav.length, 14, "Desktop and compact bottom navigation should both be present");
  assert.equal(elements.filter(element => element.classList.contains("more-link")).length, 5, "More sheet should expose all five secondary sections");
  nav.find(element => element.dataset.view === "tasks").click();
  assert.equal(byId.get("tasks").classList.contains("active"), true, "Tasks navigation should activate the Tasks view");
  assert.equal(byId.get("heading").textContent, "Tasks", "Navigation should update the page heading");

  const mobileNav = elements.find(element => element.classList.contains("mobile-nav"));
  assert(mobileNav, "Mobile navigation must remain available after removing the header menu");
  const mobileTasks = elements.filter(element => element.classList.contains("nav") && element.dataset.view === "tasks").at(-1);
  mobileTasks.click();
  assert.equal(byId.get("tasks").classList.contains("active"), true, "Mobile navigation should activate the selected view");
  assert.equal(byId.get("heading").textContent, "Tasks", "Mobile navigation should update the page heading");
  assert(byId.has("settingsExport") && byId.has("settingsImport") && byId.has("importFile"), "Backup controls must remain available in Settings");
  assert.equal(typeof byId.get("settingsExport").onclick, "function", "Settings export action must be wired");
  assert.equal(typeof byId.get("settingsImport").onclick, "function", "Settings import action must be wired");

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

  context.storageFailure = true;
  elements.find(element => element.dataset.add === "task").click();
  context.formPayload = { title: "Storage failure test", category: "Personal", priority: "Normal", due: "", notes: "" };
  byId.get("form").onsubmit({ target: byId.get("form"), preventDefault() {} });
  assert(byId.get("toast").textContent.includes("Could not save changes"), "Storage quota failures should warn instead of crashing silently");
}
smokeTestAppRuntime();


assert(app.includes('const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)]'), "App must expose distinct single and multiple selector helpers");
assert(html.includes('id="homeGreeting"') && html.includes('id="homeTaskProgress"') && html.includes('id="todayClasses"'), "Home must provide the welcome, progress and schedule regions");
assert(html.includes('id="homeStartFocus"') && html.includes('data-add="routine"') && html.includes('data-add="reminder"'), "Home quick actions must expose working focus, activity and reminder actions");
assert(app.includes("function homeTodayItems(now=new Date())") && app.includes("function renderHomeTimeline(items)"), "Home schedule must derive from saved timetable and routine entries");
assert(app.includes('safeArray("academic_courses")') && app.includes('safeArray("academic_assessments")'), "Home academic snapshot must use saved academic data");
assert(app.includes('safeRead("habit_checks",{})') && app.includes('function renderHomeInsights(now=new Date())'), "Home insights must use persisted habit and study data");
assert(app.includes('$("#homeStartFocus")?.addEventListener') && app.includes('$("#refreshHome")?.addEventListener'), "Home focus and refresh controls must be wired");


const scheduleWindow = {};
new Function("window", scheduling)(scheduleWindow);
const scheduleEngine = scheduleWindow.DaybookSchedule;
const memoryStorage = () => { const map = new Map(); return { getItem:k=>map.has(k)?map.get(k):null, setItem:(k,v)=>map.set(k,String(v)), map }; };
const scheduleStorage = memoryStorage();
const engine = scheduleEngine.create({ storage:scheduleStorage, classes:[], routine:[] });
const weekly = engine.createEvent({id:"weekly-1",title:"Weekly lecture",type:"class",start:"2026-11-09T08:00",end:"2026-11-09T09:30",recurrence:{frequency:"weekly",weekdays:[1,3],startDate:"2026-11-09",endDate:null}});
assert(weekly,"Weekly event creation must persist");
assert.equal(engine.getForDate("2026-11-09").length,1,"Weekly event must appear on its selected weekday");
assert.equal(engine.getForDate("2026-11-10").length,0,"Weekly event must not appear on an unselected weekday");
assert.equal(engine.getForDate("2026-11-11").length,1,"Weekly event must appear on the second selected weekday");
engine.updateEvent("weekly-1",{title:"Updated weekly lecture"});
assert.equal(engine.getForDate("2026-11-11")[0].title,"Updated weekly lecture","Editing a recurring event must update its complete series");
assert.equal(engine.durationMinutes(engine.getForDate("2026-11-09")[0]),90,"Event duration must use actual start and end timestamps");
const overnight=engine.createEvent({id:"overnight-1",title:"Night shift",type:"event",start:"2026-11-09T23:30",end:"2026-11-10T01:15",recurrence:{frequency:"none",weekdays:[]}});
assert.equal(engine.getForDate("2026-11-10").some(x=>x.id==="overnight-1"),true,"Midnight-crossing event must appear on the following date");
assert.equal(engine.durationMinutes(overnight),105,"Midnight-crossing duration must be calculated correctly");
const sundayOvernight=engine.createEvent({id:"sunday-overnight",title:"Sunday night event",start:"2026-11-08T23:30",end:"2026-11-09T01:15"});
assert(engine.getForWeek("2026-11-09").some(x=>x.id==="sunday-overnight"),"Week query must include an event that starts in the prior day and crosses into the week");
assert.throws(()=>engine.createEvent({id:"bad-end",title:"Invalid",start:"2026-11-09T10:00",end:"2026-11-09T09:00"}),/Invalid schedule event/,"Invalid durations must be rejected");
const noEnd=engine.createEvent({id:"no-end",title:"Unspecified end",start:"2026-11-09T12:00",recurrence:{frequency:"none",weekdays:[]}});
assert.equal(engine.durationMinutes(noEnd),null,"Missing end time must remain an unknown duration");
const allDay=engine.createEvent({id:"all-day",title:"Holiday",start:"2026-11-12T00:00",allDay:true});
assert.equal(engine.durationMinutes(engine.getForDate("2026-11-12").find(x=>x.id==="all-day")),1440,"All-day events must span one complete local day");
engine.createEvent({id:"overlap-a",title:"A",start:"2026-11-09T14:00",end:"2026-11-09T15:00"});
engine.createEvent({id:"overlap-b",title:"B",start:"2026-11-09T14:30",end:"2026-11-09T15:30"});
assert(engine.findOverlaps("2026-11-09").some(pair=>pair.some(x=>x.id==="overlap-a")&&pair.some(x=>x.id==="overlap-b")),"Overlapping events must be detected");
engine.updateEvent("overlap-a",{title:"Updated A"});
assert.equal(engine.getAll().find(x=>x.id==="overlap-a").title,"Updated A","Event updates must persist");
assert(engine.duplicateEvent("overlap-a"),"Event duplication must create a distinct event");
assert(engine.deleteEvent("overlap-b"),"Event deletion must remove the event");
assert(engine.deleteEvent("weekly-1"),"Deleting a recurring event must remove its complete series");
assert.equal(engine.getForDate("2026-11-11").some(x=>x.id==="weekly-1"),false,"Deleted recurring events must not reappear on later dates");
const legacyStorage=memoryStorage();
const legacyEngine=scheduleEngine.create({storage:legacyStorage,classes:[{id:"class-1",day:1,start:"08:00",end:"09:00",subject:"Math",room:"A1"}],routine:[{id:"routine-1",day:1,time:"06:00",title:"Prayer"}],sessions:[{id:"study-1",subject:"Math",topic:"Derivatives",date:"2026-11-09",startTime:"16:00",minutes:45,done:false}]});
assert.equal(legacyEngine.getForDate("2026-11-09").length,3,"Legacy class, routine and timed study-session data must migrate into the shared schedule");
assert.equal(legacyEngine.getForDate("2026-11-09").find(x=>x.type==="study").durationMinutes,45,"Study session duration must be represented in the schedule");
legacyEngine.syncLegacy([{id:"class-1",day:1,start:"09:00",end:"10:00",subject:"Math",room:"A1"}],[{id:"routine-1",day:1,time:"06:00",title:"Prayer"}],[{id:"study-1",subject:"Math",topic:"Derivatives",date:"2026-11-09",startTime:"16:00",minutes:45,done:false}]);
assert.equal(legacyEngine.getForDate("2026-11-09").find(x=>x.id==="legacy-class-class-1").time,"09:00","Legacy edits must synchronize to canonical schedule records");
const reloaded=scheduleEngine.create({storage:legacyStorage,classes:[],routine:[]});
assert.equal(reloaded.getForDate("2026-11-09").length,3,"Canonical schedule must survive reload");
const duplicateLegacy=scheduleEngine.create({storage:memoryStorage(),classes:[{id:"same",day:1,start:"08:00",end:"09:00",subject:"A"},{id:"same",day:1,start:"08:00",end:"09:00",subject:"B"}],routine:[]});
assert.equal(duplicateLegacy.getAll().length,1,"Duplicate legacy IDs must not create duplicate recurring events");
const corruptStorage=memoryStorage();corruptStorage.setItem("daybook_schedule_v1","not-json");
const protectedEngine=scheduleEngine.create({storage:corruptStorage,classes:[{id:"keep",day:1,start:"08:00",end:"09:00",subject:"Preserved"}],routine:[]});
assert.equal(protectedEngine.isHealthy(),false,"Malformed canonical data must be reported as unhealthy");
assert.equal(protectedEngine.syncLegacy([{id:"keep",day:1,start:"08:00",end:"09:00",subject:"Preserved"}],[]),false,"Malformed canonical data must block automatic overwrite");
assert.equal(corruptStorage.getItem("daybook_schedule_v1"),"not-json","Malformed canonical data must remain untouched");
assert.equal(protectedEngine.getForDate("2026-11-09").length,1,"Legacy records must remain readable when canonical data is malformed");

console.log("Daybook regression checks passed.");

assert(app.includes("window.daybookIcon") && app.includes("const ICONS="), "Shared icon set must be defined centrally");
assert(upgrade.includes("window.daybookIcon(\"trash\")") && upgrade.includes("window.daybookIcon(\"check\")") && upgrade.includes("window.daybookIcon(\"calendar\")"), "Academic, habit, finance and schedule actions must use the shared icon set");
assert(html.includes("aria-label=\"Previous week\"") && html.includes("aria-label=\"Next week\"") && html.includes("aria-label=\"Close settings\""), "Icon-only controls must retain accessible labels");
assert(!/[＋←→×]/u.test(html) && !/[×]/u.test(app+upgrade), "Action controls must not use raw Unicode icon substitutes");
assert(read("design-system.css").includes(".action-icon"), "Unified icon sizing and interaction styles must be present");

assert(/main>header\{[^}]*position:relative;inset:auto;z-index:auto;[\s\S]*?background:transparent;[\s\S]*?box-shadow:none;backdrop-filter:none/s.test(design), "Shared app bar must be integrated, non-floating and non-sticky");
assert(!css.includes("header{position:sticky") && !css.includes("header{border:1px solid var(--line);background:rgba(9,16,29,.88)"), "Legacy floating header rules must be removed");
assert(mobile.includes("main{") && design.includes("@media(max-width:900px)") && design.includes("main>header .icon-btn{width:44px"), "Compact mobile header and accessible action targets must be defined");
assert(html.includes("<main><header>") && html.includes("id=\"settingsBtn\"") && html.includes("id=\"today\""), "Integrated shared header must preserve its existing settings and date elements");


const persistenceSource=read("persistence.js");
assert(persistenceSource.includes("function recover()")&&persistenceSource.includes("function apply(entries)"),"Persistence must recover interrupted writes and apply multi-key restores transactionally");
assert(persistenceSource.includes("version:3")&&persistenceSource.includes("schemaVersion"),"Backups must include an explicit format and schema version");
assert(html.includes('<script src="persistence.js"></script><script src="scheduling.js"></script>'),"Persistence layer must load before schedule and app modules");
assert(build.includes('"persistence.js"')&&sw.includes('"./persistence.js"'),"Persistence layer must be packaged for Android and cached offline");


const persistenceHarness = (() => { const map=new Map(); let failAt=null,writes=0; const native={get length(){return map.size},key:i=>[...map.keys()][i]??null,getItem:k=>map.has(k)?map.get(k):null,setItem(k,v){writes++;if(failAt&&writes===failAt)throw Error("QuotaExceededError");map.set(k,String(v))},removeItem:k=>map.delete(k)};const window={localStorage:native};new Function("window","Blob",persistence)(window, class BlobMock{constructor(parts,options){this.parts=parts;this.type=options.type}});return {map,native,api:window.DaybookPersistence,setFailure(n){failAt=n;writes=0},clearFailure(){failAt=null;writes=0}};})();
const ps=persistenceHarness.api.storage;ps.setItem("daybook_tasks",JSON.stringify([{id:"t1",title:"Keep me"}]));assert.equal(JSON.parse(ps.getItem("daybook_tasks"))[0].id,"t1","Central storage must save and retrieve records");
const backupData=persistenceHarness.api.snapshot();assert(backupData.daybook_tasks&&backupData.daybook_schema_version!==undefined,"Backup snapshot must include user records and schema metadata");
const validBackup={app:"Daybook",version:3,exportedAt:"2026-11-09T00:00:00.000Z",data:{daybook_tasks:[{id:"t2",title:"Restored"}]}};const entries=persistenceHarness.api.validateBackup(validBackup);assert.equal(JSON.parse(entries.daybook_tasks)[0].id,"t2","Valid backup records must validate");assert.throws(()=>persistenceHarness.api.validateBackup({app:"Daybook",version:99,data:{}}),/Unsupported/,"Unsupported backup versions must be rejected");
assert(persistence.includes("Refusing to overwrite unreadable stored data")&&persistence.includes("function recover()"),"Corrupt records must be protected and interrupted writes must be recoverable");
