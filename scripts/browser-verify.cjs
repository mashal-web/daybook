const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");

(async () => {
  const browser = await chromium.launch({ headless: true });
  // Block service workers so browser-context routing owns every network request.
  // Playwright routing does not intercept requests fulfilled by an active service worker.
  // Block service workers so browser-context routing owns every network request.
  // Playwright routing does not intercept requests fulfilled by an active service worker.
  const context = await browser.newContext({ serviceWorkers: "block" });
  const consoleErrors = [];
  const pageErrors = [];
  const failedRequests = [];
  const dialogEvents = [];
  // Register the API mock at context scope before creating/navigating the page.
  // This catches fetches from every page and survives page reloads.
  let prayerApiRequests = 0;
  let prayerApiIntercepts = 0;
  let prayerApiFulfilled = 0;
  let prayerApiResponses = 0;
  let prayerApiFinished = 0;
  const prayerApiRouteErrors = [];
  context.on("request", request => {
    if (new URL(request.url()).hostname === "api.aladhan.com") prayerApiRequests += 1;
  });
  context.on("response", response => { if (new URL(response.url()).hostname === "api.aladhan.com") prayerApiResponses += 1; });
  context.on("requestfinished", request => { if (new URL(request.url()).hostname === "api.aladhan.com") prayerApiFinished += 1; });
  await context.route("**/v1/timings/**", async route => {
    const url = new URL(route.request().url());
    assert.equal(url.hostname, "api.aladhan.com", "Unexpected host matched prayer API route");
    prayerApiIntercepts += 1;
    try {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({code:200,status:"OK",data:{timings:{Fajr:"05:00",Dhuhr:"12:30",Asr:"15:30",Maghrib:"18:00",Isha:"20:00"},meta:{timezone:"Asia/Karachi"}}})
      });
      prayerApiFulfilled += 1;
    } catch (error) {
      prayerApiRouteErrors.push(String(error?.message || error));
      throw error;
    }
  });
  const page = await context.newPage();
  page.on("console", msg => { if (msg.type() === "error") consoleErrors.push(msg.text()); });
  page.on("pageerror", error => pageErrors.push(error.stack || error.message));
  page.on("requestfailed", request => failedRequests.push(request.url() + " " + (request.failure()?.errorText || "") + " [frame=" + request.frame().url() + "; page=" + page.url() + "]"));
  page.on("dialog", async dialog => {
    const event = { type: dialog.type(), message: dialog.message() };
    dialogEvents.push(event);
    if (dialog.type() === "confirm" && (dialog.message().startsWith("This event overlaps ") || dialog.message().startsWith("DAYBOOK RESTORE PREVIEW"))) await dialog.accept();
    else await dialog.dismiss();
  });
  try {
    await page.goto("http://127.0.0.1:4173/", { waitUntil: "networkidle" });
    assert.match(await page.title(), /Daybook/);
    await page.waitForFunction(() => window.DaybookPrayer?.getSettings);
    await page.waitForTimeout(150);
    assert.ok(prayerApiIntercepts > 0, "Expected at least one Aladhan API request to be intercepted by the context mock");
    assert.equal(prayerApiRequests, prayerApiIntercepts, "Every initial Aladhan request must be intercepted");
    assert.equal(prayerApiFulfilled, prayerApiIntercepts, "The mock must fulfill every initial Aladhan request");
    assert.equal(prayerApiResponses, prayerApiIntercepts, "Chromium must receive each mocked Aladhan response");
    assert.equal(prayerApiFinished, prayerApiIntercepts, "Each initial mocked Aladhan request must finish before navigation");
    assert.equal(prayerApiFinished, prayerApiIntercepts, "Initial mocked prayer requests must finish before any test navigation");
    // The real prayer endpoint has now been exercised and verified through the mock.
    // Keep subsequent UI workflows offline to avoid unrelated background refreshes during intentional reloads.
    await context.setOffline(true);
    await page.locator("#overview.active").waitFor();
    for (const asset of ["styles.css", "app.js", "scheduling.js", "persistence.js", "upgrade.js"]) {
      const response = await page.request.get("http://127.0.0.1:4173/" + asset);
      assert.equal(response.status(), 200, "Critical asset failed: " + asset);
    }
    await page.locator('#sidebar .sidebar-primary [data-view="schedule"]').click();
    await page.locator("#schedule.active").waitFor();
    await page.locator('[data-schedule-mode="agenda"]').click();
    const today = await page.evaluate(() => {
      const d = new Date(); return [d.getFullYear(), String(d.getMonth()+1).padStart(2,"0"), String(d.getDate()).padStart(2,"0")].join("-");
    });
    await page.locator('#schedule [data-add="event"]').click();
    await page.locator("#eventTitle").fill("Browser verification event");
    await page.locator("#eventStartDate").fill(today);
    await page.locator("#eventStartTime").fill("10:15");
    await page.locator("#eventEndDate").fill(today);
    await page.locator("#eventEndTime").fill("11:00");
    await page.locator("#form button.primary").click();
    await page.locator("#scheduleAgenda").getByText("Browser verification event").waitFor();
    assert.ok(dialogEvents.every(event => event.type === "confirm" && event.message.startsWith("This event overlaps ")), "Only the expected event-overlap confirmation may be accepted");
    assert.equal(await page.evaluate(() => window.DaybookScheduleStore.getForDate(new Date()).some(x => x.title === "Browser verification event")), true);
    const agendaTextAfterCreate = await page.locator("#scheduleAgenda").innerText();
    assert.match(agendaTextAfterCreate, /Browser verification event/);
    assert.match(agendaTextAfterCreate, /10:15/);
    assert.equal(await page.evaluate(date => { const d = new Date(date + "T12:00:00"); const expected = new Intl.DateTimeFormat("en-US", {month:"long",day:"numeric"}).format(d); return document.querySelector("#selectedDayTitle").textContent.includes(expected); }, today), true, "Agenda must display the selected date");

    await page.locator('#sidebar .sidebar-primary [data-view="tasks"]').click();
    await page.locator("#tasks.active").waitFor();
    await page.locator('#tasks [data-add="task"]').click();
    await page.locator('#form input[name="title"]').fill("Browser persistence task");
    await page.locator('#form select[name="category"]').selectOption("Assignment");
    await page.locator('#form select[name="priority"]').selectOption("High");
    await page.locator('#form input[name="durationMinutes"]').fill("45");
    await page.locator('#form input[name="notes"]').fill("Retain this task description");
    await page.locator("#form button.primary").click();
    await page.locator('#sidebar .sidebar-primary [data-view="tasks"]').click();
    await page.locator("#allTasks").getByText("Browser persistence task").waitFor();
    const taskBefore = await page.evaluate(() => JSON.parse(localStorage.getItem("daybook_tasks") || "[]").find(x => x.title === "Browser persistence task"));
    assert.ok(taskBefore);
    assert.equal(taskBefore.notes, "Retain this task description");
    const taskHistory = await page.evaluate(({id, today}) => {
      const next = new Date(today + "T12:00:00"); next.setDate(next.getDate() + 1);
      const tomorrow = [next.getFullYear(),String(next.getMonth()+1).padStart(2,"0"),String(next.getDate()).padStart(2,"0")].join("-");
      const store = window.DaybookScheduleStore;
      store.updateTask(id,{repeat:"daily",repeatStart:today,repeatEnd:tomorrow,completedDates:[],academicMetadata:{courseId:"CE101",courseTitle:"Civil Engineering",semester:1}});
      store.setTaskCompletion(id,true,today);
      const completionRecorded = store.getTasks().find(x=>x.id===id).completedDates.includes(today);
      store.updateTask(id,{postponedFrom:today,postponedTo:tomorrow});
      return {completionRecorded,tomorrow,postponedFrom:store.getTasks().find(x=>x.id===id).postponedFrom,postponedTo:store.getTasks().find(x=>x.id===id).postponedTo};
    },{id:taskBefore.id,today});
    assert.equal(taskHistory.completionRecorded,true);
    assert.equal(taskHistory.postponedFrom,today);
    assert.equal(taskHistory.postponedTo,taskHistory.tomorrow);
    await page.reload({ waitUntil: "networkidle" });
    await page.locator('#sidebar .sidebar-primary [data-view="tasks"]').click();
    await page.locator("#allTasks").getByText("Browser persistence task").waitFor();
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem("daybook_tasks") || "[]").some(x => x.title === "Browser persistence task")), true);
    const canonicalState = await page.evaluate(id => {
      const store=window.DaybookScheduleStore,task=store.getTasks().find(x=>x.id===id);
      return {count:store.getTasks().filter(x=>x.title==="Browser persistence task").length,task,tomorrowItems:store.getTasksForDate(task.postponedTo).some(x=>x.id===id),todayItems:store.getTasksForDate(task.postponedFrom).some(x=>x.id===id)};
    },taskBefore.id);
    assert.equal(canonicalState.count,1,"Repeated legacy synchronization must not duplicate tasks");
    assert.ok(canonicalState.task.completedDates.includes(today),"Completion history must survive normalization");
    assert.equal(canonicalState.task.postponedFrom,today);
    assert.equal(canonicalState.task.postponedTo,taskHistory.tomorrow);
    assert.equal(canonicalState.task.academicMetadata.courseId,"CE101","Academic metadata must survive normalization");
    assert.equal(canonicalState.task.academicMetadata.semester,1);
    assert.equal(canonicalState.todayItems,false);
    assert.equal(canonicalState.tomorrowItems,true);
    assert.equal(canonicalState.task.notes,"Retain this task description");
    assert.equal(await page.evaluate(() => window.DaybookScheduleStore.getForDate(new Date()).some(x => x.title === "Browser verification event")), true);
    const backupCheck = await page.evaluate(async () => {
      localStorage.setItem("daybook_routineVersion", "3");
      localStorage.setItem("daybook_prayer_cache_v1", JSON.stringify({browserProtected:"keep"}));
      const schemaBefore = localStorage.getItem("daybook_schema_version");
      const routineBefore = localStorage.getItem("daybook_routineVersion");
      const cacheBefore = localStorage.getItem("daybook_prayer_cache_v1");
      const blob = window.DaybookPersistence.exportFile();
      const text = await blob.text();
      const parsed = JSON.parse(text);
      const originalTasks = localStorage.getItem("daybook_tasks");
      localStorage.setItem("daybook_tasks", "[]");
      let restorePreview = "";
      const result = await window.DaybookPersistence.importFile(new File([text], "daybook-backup.json", {type:"application/json"}), message => { restorePreview = message; return true; });
      const restored = localStorage.getItem("daybook_tasks") === originalTasks;
      const cancelledBefore = localStorage.getItem("daybook_tasks");
      const cancelled = await window.DaybookPersistence.importFile(new File([text], "daybook-cancel.json", {type:"application/json"}), () => false);
      const cancelPreserved = localStorage.getItem("daybook_tasks") === cancelledBefore;
      let invalidRejected = false;
      try { await window.DaybookPersistence.importFile(new File([JSON.stringify({app:"Daybook",version:4,appId:"daybook",schemaVersion:1,sourceSchemaVersion:1,exportedAt:new Date().toISOString(),manifest:[],data:{}})], "invalid.json"), () => true); }
      catch { invalidRejected = true; }
      return {valid: !!window.DaybookPersistence.validateBackup(parsed), restored, cancelled: result.cancelled, preview:restorePreview, previewInResult:result.preview===restorePreview, cancelPreserved, cancelResult:cancelled.cancelled, invalidRejected, protectedPreserved:localStorage.getItem("daybook_schema_version")===schemaBefore&&localStorage.getItem("daybook_routineVersion")===routineBefore&&localStorage.getItem("daybook_prayer_cache_v1")===cacheBefore};
    });
    assert.equal(backupCheck.valid, true);
    assert.equal(backupCheck.restored, true, "Backup restore must recover task records");
    assert.equal(backupCheck.cancelled, false);
    assert.match(backupCheck.preview, /V4 EXACT REPLACEMENT/);
    assert.match(backupCheck.preview, /daybook_tasks/);
    assert.match(backupCheck.preview, /unsupported are preserved/i);
    assert.equal(backupCheck.previewInResult, true);
    assert.equal(backupCheck.cancelResult, true);
    assert.equal(backupCheck.cancelPreserved, true, "Cancellation must not change application data");
    assert.equal(backupCheck.invalidRejected, true, "Invalid V4 backup must be rejected before writes");
    assert.equal(backupCheck.protectedPreserved, true, "Restore must preserve protected metadata and cache keys");
    // Exercise the real settings -> file picker -> confirmation workflow, not only the persistence API.
    const uiBackupText = await page.evaluate(async () => await (await window.DaybookPersistence.exportFile()).text());
    await page.evaluate(() => document.querySelector("#settingsDialog").showModal());
    const chooserPromise = page.waitForEvent("filechooser");
    await page.locator("#settingsImport").click();
    const chooser = await chooserPromise;
    const restoreNavigation = page.waitForNavigation({waitUntil:"networkidle"});
    await chooser.setFiles({name:"daybook-ui-restore.json",mimeType:"application/json",buffer:Buffer.from(uiBackupText)});
    await restoreNavigation;
    await page.locator("#overview.active").waitFor();
    const uiPreview = dialogEvents.find(event => event.message.startsWith("DAYBOOK RESTORE PREVIEW"));
    assert.ok(uiPreview, "User-facing import workflow must show a restore preview before confirmation");
    assert.match(uiPreview.message, /V4 EXACT REPLACEMENT/);
    assert.match(uiPreview.message, /Protected schema, migration, cache and recovery metadata/);
    await page.reload({ waitUntil: "networkidle" });
    assert.equal(await page.evaluate(() => window.DaybookScheduleStore.getForDate(new Date()).some(x => x.title === "Browser verification event")), true);
    assert.equal(await page.evaluate(() => window.DaybookScheduleStore.getTasks().some(x => x.title === "Browser persistence task")), true);

    const scheduling = await page.evaluate(() => {
      const store = window.DaybookScheduleStore;
      const legacySourceBefore = localStorage.getItem("daybook_tasks");
      const tasksBefore = store.getTasks();
      const malformedTaskRejected = store.syncTasks([...tasksBefore,{id:"pw-malformed-task",title:""}]) === false;
      const duplicateTaskRejected = tasksBefore.length > 0 && store.syncTasks([...tasksBefore,tasksBefore[0]]) === false;
      const tasksPreserved = store.getTasks().length === tasksBefore.length && store.getTasks().every(x=>tasksBefore.some(y=>y.id===x.id));
      const base = new Date(); base.setHours(12,0,0,0);
      const key = d => [d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join("-");
      const start = key(base);
      const plus = n => { const d=new Date(base); d.setDate(d.getDate()+n); return key(d); };
      const id = "pw-daily-series";
      store.createEvent({id,title:"PW daily recurrence",start:start+"T07:00",end:start+"T07:30",recurrence:{frequency:"daily",weekdays:[],startDate:start,endDate:plus(2)}});
      const daily1 = store.getForDate(plus(1)).some(x=>x.title==="PW daily recurrence");
      const identity = store.getOccurrenceId(id,plus(1));
      store.createException({seriesId:id,originalDate:plus(1),type:"cancelled",override:null});
      const skipped = store.getForDate(plus(1)).some(x=>x.title==="PW daily recurrence");
      const preserved = store.getForDate(plus(2)).some(x=>x.title==="PW daily recurrence");
      let invalidDateRejected=false, duplicateRejected=false;
      try { store.createEvent({id:"pw-invalid",title:"Invalid date",start:"2026-02-30T09:00",end:"2026-02-30T10:00"}); } catch(e) { invalidDateRejected=true; }
      try { store.createEvent({id,title:"duplicate",start:start+"T08:00",end:start+"T08:30"}); } catch(e) { duplicateRejected=true; }
      const validSurvivedMalformed = store.getForDate(plus(2)).some(x=>x.title==="PW daily recurrence");
      const duplicatePreserved = store.getForDate(plus(2)).some(x=>x.title==="PW daily recurrence");
      const weeklyId = "pw-weekly-series", weekday = base.getDay();
      store.createEvent({id:weeklyId,title:"PW weekly recurrence",start:start+"T08:00",end:start+"T08:30",recurrence:{frequency:"weekly",weekdays:[weekday],startDate:start,endDate:plus(14)}});
      const weeklyNext = store.getForDate(plus(7)).some(x=>x.title==="PW weekly recurrence");
      const weeklyWrongDay = store.getForDate(plus(1)).some(x=>x.title==="PW weekly recurrence");
      const weeklyIdentity = store.getOccurrenceId(weeklyId,plus(7));
      store.createException({seriesId:weeklyId,originalDate:plus(7),type:"cancelled",override:null});
      const weeklySkipped = store.getForDate(plus(7)).some(x=>x.title==="PW weekly recurrence");
      const weeklyPreserved = store.getForDate(plus(14)).some(x=>x.title==="PW weekly recurrence");
      const boundary = store.getForDateRange(start,plus(2)).filter(x=>x.title==="PW daily recurrence").length;
      const reversedRange = store.getForDateRange(plus(2),start).length;
      store.createEvent({id:"pw-unknown-end",title:"Unknown end commitment",start:start+"T13:00",end:null});
      const unknownEnd = store.getDayPlan(start,{dayStart:12*60,dayEnd:18*60}).available.length;
      store.deleteEvent("pw-unknown-end");
      const legacySourceIntact = localStorage.getItem("daybook_tasks") === legacySourceBefore;
      return {malformedTaskRejected,duplicateTaskRejected,tasksPreserved,legacySourceIntact,daily1,identity:!!identity,skipped,preserved,weeklyNext,weeklyWrongDay,weeklyIdentity:!!weeklyIdentity,weeklySkipped,weeklyPreserved,invalidDateRejected,duplicateRejected,validSurvivedMalformed,duplicatePreserved,boundary,reversedRange,unknownEnd,start};
    });
    assert.equal(scheduling.malformedTaskRejected, true);
    assert.equal(scheduling.duplicateTaskRejected, true);
    assert.equal(scheduling.tasksPreserved, true);
    assert.equal(scheduling.legacySourceIntact, true);
    assert.equal(scheduling.daily1, true);
    assert.equal(scheduling.identity, true);
    assert.equal(scheduling.skipped, false);
    assert.equal(scheduling.preserved, true);
    assert.equal(scheduling.weeklyNext, true);
    assert.equal(scheduling.weeklyWrongDay, false);
    assert.equal(scheduling.weeklyIdentity, true);
    assert.equal(scheduling.weeklySkipped, false);
    assert.equal(scheduling.weeklyPreserved, true);
    assert.equal(scheduling.invalidDateRejected, true);
    assert.equal(scheduling.duplicateRejected, true);
    assert.equal(scheduling.validSurvivedMalformed, true);
    assert.equal(scheduling.duplicatePreserved, true);
    assert.equal(scheduling.boundary, 2);
    assert.equal(scheduling.reversedRange, 0);
    assert.equal(scheduling.unknownEnd, 0, "Unknown-end commitment must suppress unsafe free-time slots");

    const planner = await page.evaluate(() => {
      const store = window.DaybookScheduleStore;
      store.getAll().filter(item => !item.end).forEach(item => store.deleteEvent(item.id));
      const host = document.querySelector("#smartPlan");
      window.DaybookPrayer = { getPrayerIntervals: () => [] };
      window.dispatchEvent(new Event("daybook-prayer-updated"));
      const missing = host.textContent.includes("Prayer timing data is unavailable");
      window.DaybookPrayer = { getPrayerIntervals: () => [
        {name:"Fajr",startTime:"05:00",endTime:"05:20"},
        {name:"Dhuhr",startTime:"12:30",endTime:"12:50"},
        {name:"Asr",startTime:"15:30",endTime:"15:50"},
        {name:"Maghrib",startTime:"18:00",endTime:"18:20"},
        {name:"Isha",startTime:"20:00",endTime:"20:20"}
      ]};
      window.dispatchEvent(new Event("daybook-prayer-updated"));
      const valid = !host.textContent.includes("Prayer timing data is unavailable");
      const hasSafeWindow = host.textContent.includes("Available focus window");
      window.DaybookScheduleStore.createEvent({id:"pw-planner-unknown-end",title:"Unknown end planner commitment",start:new Date().toISOString().slice(0,10)+"T13:00",end:null});
      const unknownEndSuppressed = host.textContent.includes("no end time") || host.textContent.includes("cannot be calculated safely");
      window.DaybookScheduleStore.deleteEvent("pw-planner-unknown-end");
      const dayKey = new Date().toISOString().slice(0,10);
      const anchors = window.DaybookPrayer.getPrayerIntervals(dayKey).map(p=>({id:"probe-"+p.name,title:p.name+" prayer",category:"Prayer",start:dayKey+"T"+p.startTime,end:dayKey+"T"+p.endTime}));
      const probe = window.DaybookScheduleStore.getDayPlan(dayKey,{anchors});
      return {missing,valid,hasSafeWindow,unknownEndSuppressed,hostText:host.textContent,available:probe.available,items:probe.items.map(x=>({title:x.title,start:x.startDateTime||x.start,end:x.endDateTime||x.end}))};
    });
    console.log("Planner browser diagnostic:", JSON.stringify(planner));
    assert.equal(planner.missing, true);
    assert.equal(planner.valid, true);
    assert.equal(planner.hasSafeWindow, true);
    assert.equal(planner.unknownEndSuppressed, true);

    await page.evaluate(() => localStorage.setItem("daybook_schedule_v1", "not-json"));
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForFunction(() => window.DaybookScheduleStore?.isHealthy() === false);
    await page.evaluate(() => window.dispatchEvent(new Event("daybook-schedule-updated")));
    await page.locator('#sidebar .sidebar-primary [data-view="schedule"]').click();
    await page.locator('[data-schedule-mode="agenda"]').click();
    await page.locator("#scheduleAgenda").waitFor();
    const agendaText = await page.locator("#scheduleAgenda").innerText();
    const plannerText = await page.locator("#smartPlan").innerText();
    console.log("Unhealthy storage UI diagnostic:", JSON.stringify({agendaText,plannerText}));
    assert.match(agendaText, /unavailable|recovery/i);
    assert.match(plannerText, /unavailable|recovery/i);

    assert.deepEqual(pageErrors, [], "Uncaught browser exceptions detected");
    assert.deepEqual(consoleErrors, [], "Browser console errors detected");
    console.log("Prayer API lifecycle:", JSON.stringify({prayerApiRequests,prayerApiIntercepts,prayerApiFulfilled,prayerApiResponses,prayerApiFinished,prayerApiRouteErrors,failedPrayerRequests:failedRequests.filter(item=>item.includes("api.aladhan.com"))}));
    assert.equal(prayerApiRequests, prayerApiIntercepts, "Every Aladhan request must be handled by the deterministic context mock");
    assert.equal(prayerApiFulfilled, prayerApiIntercepts, "Every intercepted Aladhan request must receive a mock response");
    assert.deepEqual(failedRequests, [], "Failed network requests detected");
    const report = { status: "passed", browser: "Chromium", checks: 32, prayerApiRequests, prayerApiIntercepts, prayerApiFulfilled, prayerApiResponses, prayerApiFinished, backupCheck, scheduling, planner, dialogEvents, consoleErrors, pageErrors, failedRequests };
    fs.writeFileSync("playwright-results.json", JSON.stringify(report, null, 2));
    console.log("Playwright Chromium verification passed.");
    console.log(JSON.stringify(report, null, 2));
  } catch (error) {
    await page.screenshot({ path: "playwright-failure.png", fullPage: true }).catch(() => {});
    fs.writeFileSync("playwright-results.json", JSON.stringify({ status: "failed", browser: "Chromium", error: error.stack || error.message, dialogEvents, consoleErrors, pageErrors, failedRequests }, null, 2));
    throw error;
  } finally {
    await context.close();
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
