const { chromium } = require("playwright");
const assert = require("node:assert/strict");

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  const consoleErrors = [];
  const pageErrors = [];
  const failedRequests = [];
  page.on("console", msg => { if (msg.type() === "error") consoleErrors.push(msg.text()); });
  page.on("pageerror", error => pageErrors.push(error.message));
  page.on("requestfailed", request => failedRequests.push(request.url() + " " + (request.failure()?.errorText || "")));
  try {
    await page.goto("http://127.0.0.1:4173/", { waitUntil: "networkidle" });
    assert.match(await page.title(), /Daybook/);
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
    await page.getByText("Browser verification event").first().waitFor();
    assert.equal(await page.evaluate(() => window.DaybookScheduleStore.getForDate(new Date()).some(x => x.title === "Browser verification event")), true);

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
    await page.getByText("Browser persistence task").waitFor();
    const taskBefore = await page.evaluate(() => JSON.parse(localStorage.getItem("daybook_tasks") || "[]").find(x => x.title === "Browser persistence task"));
    assert.ok(taskBefore);
    assert.equal(taskBefore.notes, "Retain this task description");
    await page.reload({ waitUntil: "networkidle" });
    await page.locator('#sidebar .sidebar-primary [data-view="tasks"]').click();
    await page.getByText("Browser persistence task").waitFor();
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem("daybook_tasks") || "[]").some(x => x.title === "Browser persistence task")), true);
    const canonicalCount = await page.evaluate(() => window.DaybookScheduleStore.getTasks().filter(x => x.title === "Browser persistence task").length);
    assert.equal(canonicalCount, 1, "Repeated legacy synchronization must not duplicate tasks");
    assert.equal(await page.evaluate(() => window.DaybookScheduleStore.getForDate(new Date()).some(x => x.title === "Browser verification event")), true);

    const scheduling = await page.evaluate(() => {
      const store = window.DaybookScheduleStore;
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
      return {daily1,identity:!!identity,skipped,preserved,weeklyNext,weeklyWrongDay,weeklyIdentity:!!weeklyIdentity,weeklySkipped,weeklyPreserved,invalidDateRejected,duplicateRejected,boundary,reversedRange,unknownEnd,start};
    });
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
    assert.equal(scheduling.boundary, 2);
    assert.equal(scheduling.reversedRange, 0);
    assert.equal(scheduling.unknownEnd, 0, "Unknown-end commitment must suppress unsafe free-time slots");

    const planner = await page.evaluate(() => {
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
      return {missing,valid,hasSafeWindow,unknownEndSuppressed};
    });
    assert.equal(planner.missing, true);
    assert.equal(planner.valid, true);
    assert.equal(planner.hasSafeWindow, true);
    assert.equal(planner.unknownEndSuppressed, true);

    const unhealthy = await page.evaluate(() => {
      localStorage.setItem("daybook_schedule_v1", "not-json");
      location.reload();
      return true;
    });
    assert.equal(unhealthy, true);
    await page.waitForLoadState("networkidle");
    await page.locator('#sidebar .sidebar-primary [data-view="schedule"]').click();
    await page.locator('[data-schedule-mode="agenda"]').click();
    await page.locator("#scheduleAgenda").waitFor();
    assert.match(await page.locator("#scheduleAgenda").innerText(), /unavailable|recovery/i);
    assert.match(await page.locator("#smartPlan").innerText(), /unavailable|recovery/i);

    assert.deepEqual(pageErrors, [], "Uncaught browser exceptions detected");
    assert.deepEqual(consoleErrors, [], "Browser console errors detected");
    assert.deepEqual(failedRequests, [], "Failed network requests detected");
    console.log("Playwright Chromium verification passed.");
    console.log(JSON.stringify({ browser: "Chromium", checks: 22, scheduling, planner, consoleErrors, pageErrors, failedRequests }, null, 2));
  } catch (error) {
    await page.screenshot({ path: "playwright-failure.png", fullPage: true }).catch(() => {});
    throw error;
  } finally {
    await context.close();
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
