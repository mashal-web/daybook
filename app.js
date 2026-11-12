"use strict";
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const ICONS={
 edit:'<path d="m16 4 4 4M5 19l4-.8L20 7a2.1 2.1 0 0 0-3-3L6 15l-1 4Z"/>',
 trash:'<path d="M3 6h18M8 6V4h8v2m3 0-1 14H6L5 6m4 4v6m6-6v6"/>',
 check:'<path d="m5 12 4 4L19 6"/>',
 rotate:'<path d="M20 7v5h-5M4 17v-5h5"/><path d="M5.6 9A7 7 0 0 1 18 6l2 6M4 12l2 6a7 7 0 0 0 12.4-3"/>',
 plus:'<path d="M12 5v14M5 12h14"/>',
 x:'<path d="m18 6-12 12M6 6l12 12"/>',
 left:'<path d="m15 18-6-6 6-6"/>',
 right:'<path d="m9 18 6-6-6-6"/>',
 calendar:'<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
 clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
 search:'<circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 5 5"/>',
 settings:'<circle cx="12" cy="12" r="3"/><path d="m19.4 15 .1.1 1.4 1.1-1.4 2.4-1.7-.7a8 8 0 0 1-1.7 1l-.3 1.8h-2.8l-.3-1.8a8 8 0 0 1-1.7-1l-1.7.7-1.4-2.4 1.4-1.1a8 8 0 0 1 0-2l-1.4-1.1 1.4-2.4 1.7.7a8 8 0 0 1 1.7-1l.3-1.8h2.8l.3 1.8a8 8 0 0 1 1.7 1l1.7-.7 1.4 2.4-1.4 1.1a8 8 0 0 1 0 2Z"/>',
 sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42"/>',
 moon:'<path d="M20.5 14.2A8.5 8.5 0 0 1 9.8 3.5 8.5 8.5 0 1 0 20.5 14.2Z"/>',
 wallet:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18m-5 4h2"/>',
 book:'<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v17H6.5A2.5 2.5 0 0 1 4 17.5z"/><path d="M4 6h16M8 10h8"/>',
 chart:'<path d="M3 3v18h18"/><path d="m7 14 4-4 3 3 6-7"/>',
 bell:'<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/>',
 home:'<path d="m3 10 9-7 9 7M5 9v12h14V9m-9 12v-7h4v7"/>',
 task:'<rect x="4" y="3" width="16" height="18" rx="2"/><path d="m8 11 2 2 5-5M8 17h8"/>'
};
window.daybookIcon=(name,size=16)=>{if(!ICONS[name])return "";return '<svg class="ui-icon action-icon" width="'+size+'" height="'+size+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">'+(ICONS[name])+'</svg>';};

const DAYS=["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const SUBJECTS=["Applied Physics & Electro Mechanical Fundamental","Engineering Mathematics","Islamiat","Functional English","Quantitative Reasoning","Engineering Drawing","Foundation Mathematics"];
let today=new Date();
const uid=()=>Math.random().toString(36).slice(2,10), iso=d=>{const x=new Date(d);return x.getFullYear()+"-"+String(x.getMonth()+1).padStart(2,"0")+"-"+String(x.getDate()).padStart(2,"0")};
const safeRead=(k,f)=>{try{const v=JSON.parse(window.DaybookPersistence.storage.getItem("daybook_"+k));return v===null?f:v}catch{return f}};
const safeSet=(key,value)=>{try{window.DaybookPersistence.storage.setItem(key,typeof value==="string"?value:JSON.stringify(value));return true}catch{return false}};
const safeWrite=(key,value)=>safeSet("daybook_"+key,value);
const safeArray=(k,f=[])=>{const value=safeRead(k,f);return Array.isArray(value)?value.filter(item=>item&&typeof item==="object"&&!Array.isArray(item)):f};
const classSeed=[{day:1,start:"08:05",end:"15:30",subject:"University / campus"},{day:3,start:"08:00",end:"10:30",subject:"University / campus"},{day:4,start:"08:00",end:"13:00",subject:"University / campus"},{day:5,start:"08:00",end:"13:00",subject:"University / campus"}].map(x=>({...x,id:uid()}));
const ROUTINE_VERSION=3;
const oldRoutine=safeRead("routine",null);
const routineTemplate=Array.from({length:7},(_,day)=>[
 {time:"05:30",title:"Wake up, Fajr prayer and freshen up"},
 {time:"06:00",title:"Tilawat (30 minutes)"},
 {time:"06:30",title:"Morning exercise (30 minutes)"},
 {time:"07:00",title:"Breakfast (7:00–7:30 AM)"},
 {time:"13:00",title:"Lunch (1:00–2:00 PM)"},
 {time:"16:00",title:"Self-study (2 hours)"},
 {time:"18:00",title:"Maghrib prayer and Tilawat (30 minutes)"},
 {time:"19:30",title:"Phone time (30 minutes)"},
 {time:"20:00",title:"Dinner (8:00–8:30 PM)"},
 {time:"20:30",title:"Prepare for tomorrow / light revision"},
 {time:"21:00",title:"Wind down; put phone away"},
 {time:"22:30",title:"Sleep"}
].map(x=>({...x,day,id:uid()}))).flat();
routineTemplate.push(...[
 [1,"07:30","Leave for university"],[3,"07:30","Leave for university"],[4,"07:30","Leave for university"],[5,"07:30","Leave for university"],
 [3,"10:30","Library study until 3:00 PM"],[4,"14:00","Library study until 3:00 PM"],[5,"14:00","Library study until 3:00 PM"],
 [3,"15:00","Leave library"],[4,"15:00","Leave library"],[5,"15:00","Leave library"],
 [1,"15:30","University finishes"],[2,"09:00","Flexible study / personal work"],[0,"09:00","Weekly planning and personal time"]
].map(([day,time,title])=>({day,time,title,id:uid()})));
const storedRoutineVersion=Number(safeRead("routineVersion",0));
const routineData=(()=>{
 if(!Array.isArray(oldRoutine))return routineTemplate;
 const existing=oldRoutine.filter(r=>r&&typeof r==="object"&&/^([01]\d|2[0-3]):[0-5]\d$/.test(r.time||"")&&String(r.title||"").trim()).flatMap(r=>{
  const day=Number(r.day);
  const days=Number.isInteger(day)&&day>=0&&day<=6?[day]:DAYS.map((_,i)=>i);
  return days.map(d=>({...r,time:(storedRoutineVersion<3&&String(r.title).toLowerCase()==="sleep"&&r.time==="21:30"?"22:30":r.time),id:days.length===1&&r.id?String(r.id):uid(),day:d,title:String(r.title).trim()}));
 });
 if(storedRoutineVersion>=ROUTINE_VERSION)return existing;
 const occupied=new Set(existing.map(r=>r.day+"|"+r.time));
 const defaults=routineTemplate.filter(r=>!occupied.has(r.day+"|"+r.time));
 return [...existing,...defaults];
})();
const data={
 subjects:(()=>{const saved=safeRead("subjects",SUBJECTS);const list=Array.isArray(saved)?saved.filter(s=>typeof s==="string"&&s.trim()).map(s=>s.trim()):SUBJECTS.slice();const old="Applied Physics & Engineering Mechanics";const course="Applied Physics & Electro Mechanical Fundamental";const index=list.indexOf(old);if(index>=0)list[index]=course;return [...new Set(list)]})(),
 classes:(()=>{const saved=safeRead("classes",null);return Array.isArray(saved)?saved.filter(c=>c&&typeof c==="object"&&!Array.isArray(c)):classSeed})(),
 routine:routineData,
 tasks:safeArray("tasks"),sessions:safeArray("sessions"),reminders:safeArray("reminders"),
 goal:(()=>{const value=Number(safeRead("goal",10));return Number.isFinite(value)&&value>=1&&value<=100?value:10})(),settings:(()=>{const value=safeRead("settings",{timeFormat:"12h",theme:"dark"});return value&&typeof value==="object"?{...value,timeFormat:["12h","24h"].includes(value.timeFormat)?value.timeFormat:"12h",theme:["dark","light"].includes(value.theme)?value.theme:"dark",defaultDuration:[30,45,60,90,120].includes(Number(value.defaultDuration))?Number(value.defaultDuration):60,weekStart:[0,1,6].includes(Number(value.weekStart))?Number(value.weekStart):0}:{timeFormat:"12h",theme:"dark",defaultDuration:60,weekStart:0}})()
};
window.DaybookAppSettings={get defaultDuration(){return data.settings.defaultDuration||60}};
safeWrite("subjects",data.subjects);
safeWrite("routine",data.routine);
safeWrite("routineVersion",ROUTINE_VERSION);
safeWrite("classes",data.classes);
const scheduleStore=window.DaybookSchedule.create({storage:window.DaybookPersistence.storage,classes:data.classes,routine:data.routine,sessions:data.sessions});
window.DaybookScheduleStore=scheduleStore;
scheduleStore.syncLegacy(data.classes,data.routine,data.sessions,data.tasks);
window.addEventListener("daybook-schedule-updated",event=>{if(event.detail?.origin!=="legacy-sync"){scheduleStore.getTasks().filter(t=>t.source?.kind==="legacy-task").forEach(t=>{const legacy=data.tasks.find(x=>String(x.id)===t.source.legacyId);if(legacy){legacy.done=t.status==="completed";legacy.due=t.dueDate||"";legacy.notes=t.notes||legacy.notes}});safeWrite("tasks",data.tasks);render()}});
window.addEventListener("daybook-edit-legacy-task",event=>{if(event.detail?.id)openEditor("task",event.detail.id)});
window.addEventListener("daybook-delete-legacy-task",event=>{if(event.detail?.id){data.tasks=data.tasks.filter(t=>String(t.id)!==String(event.detail.id));save("Task deleted")}});
window.addEventListener("daybook-postpone-legacy-task",event=>{const task=data.tasks.find(t=>String(t.id)===String(event.detail?.id));if(task){task.due=event.detail.date;save("Task postponed")}});
window.addEventListener("daybook-prayer-updated",()=>{if(activeView==="schedule")renderScheduleModes()});
let lastSyncedReminders=JSON.stringify(data.reminders);
let activeView="overview",filter="all",weekOffset=0,scheduleMode="timeline",edit={type:null,id:null};
function applyTheme(theme){const value=theme==="light"?"light":"dark";document.documentElement.dataset.theme=value;document.documentElement.style.colorScheme=value;const meta=document.querySelector('meta[name="theme-color"]');if(meta)meta.content=value==="light"?"#f2f4f2":"#0b1018";}
applyTheme(data.settings.theme);
const FOCUS_KEY="daybook_focus";
function readFocus(){try{const v=JSON.parse(window.DaybookPersistence.storage.getItem(FOCUS_KEY));return v&&typeof v==="object"?v:null}catch{return null}}
const savedFocus=readFocus()||{};
const focusMode=savedFocus.mode==="break"?"break":"focus";
const defaultDuration=focusMode==="break"?300:1500;
const storedDuration=Number(savedFocus.duration);
const focusDuration=Number.isFinite(storedDuration)&&storedDuration>=60&&storedDuration<=7200?storedDuration:defaultDuration;
const storedRemaining=Number(savedFocus.remaining);
const focusRemaining=Number.isFinite(storedRemaining)&&storedRemaining>=0&&storedRemaining<=focusDuration?storedRemaining:focusDuration;
const focusEndsAt=Number(savedFocus.endsAt);
let focusState={...savedFocus,mode:focusMode,duration:focusDuration,remaining:focusRemaining,running:savedFocus.running===true&&Number.isFinite(focusEndsAt),endsAt:savedFocus.running===true&&Number.isFinite(focusEndsAt)?focusEndsAt:null};
function storeFocus(){if(!safeSet(FOCUS_KEY,focusState))toast("Focus timer could not be saved on this device")}
function formatTimer(seconds){return String(Math.floor(seconds/60)).padStart(2,"0")+":"+String(seconds%60).padStart(2,"0")}
function renderFocus(){
 const selected=focusState.subject||data.subjects[0]||"";
 ["#focusSubject","#plannerFocusSubject"].forEach(selector=>{const subject=$(selector);if(!subject)return;subject.innerHTML=data.subjects.map(s=>'<option value="'+esc(s)+'" '+(s===selected?"selected":"")+'>'+esc(s)+'</option>').join("")||'<option value="">Add a subject in Study Planner</option>';subject.disabled=!data.subjects.length;subject.onchange=()=>{focusState.subject=subject.value;storeFocus()}});
 const progress=Math.max(0,Math.min(100,(1-focusState.remaining/focusState.duration)*100));
 ["#focusTimer","#plannerFocusTimer"].forEach(selector=>{const el=$(selector);if(el)el.textContent=formatTimer(focusState.remaining)});
 ["#focusMode","#plannerFocusMode"].forEach(selector=>{const el=$(selector);if(el)el.textContent=focusState.mode==="focus"?"Focus session":"Short break"});
 ["#focusState","#plannerFocusState"].forEach(selector=>{const el=$(selector);if(el)el.textContent=focusState.running?"IN PROGRESS":"PAUSED"});
 ["#focusHint","#plannerFocusHint"].forEach(selector=>{const el=$(selector);if(el)el.textContent=focusState.mode==="focus"?"Stay with one task until the timer ends.":"Step away, stretch and rest your eyes."});
 ["#focusStart","#plannerFocusStart"].forEach(selector=>{const el=$(selector);if(el)el.textContent=focusState.running?"Pause":"Start "+(focusState.mode==="focus"?"focus":"break")});
 ["#focusProgress"].forEach(selector=>{const el=$(selector);if(el){el.style.width=progress+"%";el.setAttribute("aria-valuenow",String(Math.round(progress)))}});
}
function finishFocus(){
 focusState.running=false;focusState.remaining=0;focusState.endsAt=null;
 if(focusState.mode==="focus"){
  const mins=Math.round(focusState.duration/60),subject=focusState.subject||data.subjects[0]||"Independent study";
  data.sessions.push({id:uid(),subject,topic:"Focus timer session",date:iso(new Date()),minutes:mins,done:true,completedAt:new Date().toISOString()});
  focusState.mode="break";focusState.duration=300;focusState.remaining=300;storeFocus();persist();render();toast("Focus session saved. Take a 5-minute break.");
 }else{
  focusState.mode="focus";focusState.duration=1500;focusState.remaining=1500;storeFocus();renderFocus();toast("Break finished. Ready for another focus session?");
 }
}
function toggleFocusTimer(){if(focusState.running){focusState.remaining=Math.max(0,Math.ceil((focusState.endsAt-Date.now())/1000));focusState.running=false;focusState.endsAt=null;storeFocus();renderFocus()}else{if(focusState.remaining<=0)focusState.remaining=focusState.duration;focusState.subject=$("#plannerFocusSubject")?.value||$("#focusSubject")?.value||focusState.subject;focusState.running=true;focusState.endsAt=Date.now()+focusState.remaining*1000;storeFocus();renderFocus()}}
function resetFocusTimer(){focusState.running=false;focusState.endsAt=null;focusState.duration=focusState.mode==="focus"?1500:300;focusState.remaining=focusState.duration;storeFocus();renderFocus()}
$("#focusStart").onclick=toggleFocusTimer;$("#plannerFocusStart").onclick=toggleFocusTimer;$("#focusReset").onclick=resetFocusTimer;$("#plannerFocusReset").onclick=resetFocusTimer;
$("#homeStartFocus")?.addEventListener("click",()=>$("#focusStart")?.click());
$("#refreshHome")?.addEventListener("click",()=>{today=new Date();render();toast("Today’s overview refreshed")});
function tickFocus(){if(!focusState.running)return;focusState.remaining=Math.max(0,Math.ceil((focusState.endsAt-Date.now())/1000));if(focusState.remaining===0)finishFocus();else renderFocus()}
setInterval(tickFocus,1000);
function persist(){const scheduleSaved=scheduleStore.syncLegacy(data.classes,data.routine,data.sessions,data.tasks);const legacySaved=["subjects","classes","routine","tasks","sessions","reminders","goal","settings"].every(k=>safeWrite(k,data[k]));const saved=scheduleSaved&&legacySaved;if(window.DaybookNative?.isNative()&&JSON.stringify(data.reminders)!==lastSyncedReminders)syncNativeReminders();return saved}
function save(msg="Saved"){const stored=persist();render();toast(stored?msg:"Could not save changes. Export a backup before closing Daybook.")}
function esc(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function minutes(t){if(!t)return 0;const [h,m]=t.split(":").map(Number);return h*60+m}
function fmt(t){if(!t)return "";if(data.settings.timeFormat==="24h")return t;let [h,m]=t.split(":").map(Number);return (h%12||12)+":"+String(m).padStart(2,"0")+" "+(h>=12?"PM":"AM")}
function toast(s){const el=$("#toast");el.textContent=s;el.classList.add("show");clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.classList.remove("show"),2200)}
function openView(v){
 if(v==="weekly"||v==="routine")v="schedule";
 const target=document.getElementById(v);
 if(!target||!target.classList.contains("view")){toast("This section is unavailable");return}
 activeView=v;
 document.getElementById("moreDialog")?.close();
 $$(".view").forEach(x=>x.classList.toggle("active",x===target));
 $$(".nav").forEach(b=>{const active=b.dataset.view===v;b.classList.toggle("active",active);if(active)b.setAttribute("aria-current","page");else b.removeAttribute("aria-current")});
 $("#heading").textContent=({overview:"Overview",schedule:"Timetable",planner:"Study planner",tasks:"Tasks",analytics:"Progress analytics",reminders:"Reminders",academics:"Academic management",habits:"Habits & routines",finance:"Personal finance"})[v]||"Daybook";
 render();
}
$$("[data-view]").forEach(b=>b.addEventListener("click",()=>openView(b.dataset.view)));
$("#openMore")?.addEventListener("click",()=>$("#moreDialog")?.showModal());
$("#closeMore")?.addEventListener("click",()=>$("#moreDialog")?.close());
$$("[data-go]").forEach(b=>b.addEventListener("click",()=>openView(b.dataset.go)));
$("#date").textContent=today.toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"}).toUpperCase();
$("#today").textContent=today.toLocaleDateString("en-US",{month:"short",day:"numeric"});
function rowActions(type,id){const duplicate=["class","routine"].includes(type)?'<button class="small-action" data-duplicate="'+esc(type)+'" data-id="'+esc(id)+'" aria-label="Duplicate '+esc(type)+'" title="Duplicate">'+window.daybookIcon("plus")+'<span>Duplicate</span></button>':"";return '<button class="small-action" data-edit="'+esc(type)+'" data-id="'+esc(id)+'" aria-label="Edit '+esc(type)+'" title="Edit">'+window.daybookIcon("edit")+'<span>Edit</span></button>'+duplicate+'<button class="small-action danger" data-delete="'+esc(type)+'" data-id="'+esc(id)+'" aria-label="Delete '+esc(type)+'" title="Delete">'+window.daybookIcon("trash")+'<span>Delete</span></button>'}
function dueMeta(t){if(!t.due)return "";const due=new Date(t.due+"T12:00:00"),todayDate=new Date(iso(today)+"T12:00:00"),days=Math.round((due-todayDate)/86400000);const label=days<0?"Overdue":days===0?"Due today":days===1?"Due tomorrow":"Due "+due.toLocaleDateString("en-US",{month:"short",day:"numeric"});return '<span class="task-due '+(days<0&&!t.done?"is-overdue":days===0?"is-today":"")+'">'+esc(label)+'</span>'}
function taskMarkup(t){return '<div class="row task-row '+(t.done?"completed":"")+'"><input class="check" type="checkbox" aria-label="'+(t.done?"Reopen task: ":"Complete task: ")+esc(t.title)+'" data-task="'+esc(t.id)+'" '+(t.done?"checked":"")+'><div class="grow"><b>'+esc(t.title)+'</b><small>'+esc(t.category||"Personal")+' · '+esc(t.priority||"Normal")+(t.durationMinutes?" · "+t.durationMinutes+" min": "")+(t.due?" · "+dueMeta(t):"")+(t.notes?" · "+esc(t.notes):"")+'</small></div>'+rowActions("task",t.id)+'</div>'}
let selectedDay=today.getDay();
function weekDates(){
 const start=new Date(today);start.setHours(0,0,0,0);const firstDay=[0,1,6].includes(Number(data.settings.weekStart))?Number(data.settings.weekStart):0;start.setDate(start.getDate()-((start.getDay()-firstDay+7)%7)+weekOffset*7);
 return Array.from({length:7},(_,i)=>{const date=new Date(start);date.setDate(start.getDate()+i);return {day:date.getDay(),date}});
}
function scheduleEntries(day){const selected=weekDates().find(x=>x.day===day);return scheduleStore.getForDate(selected?selected.date:today).map(item=>({...item,canonicalId:item.id,id:item.source?.legacyId||item.id,kind:item.type==="event"?"event":item.type==="class"?"class":item.type==="study"?"study":"routine",title:item.title,location:item.location||"",room:item.metadata?.room||item.location||"",subject:item.metadata?.subject||item.title}));}
function eventActions(item){const id=item.canonicalId||item.id,recurring=item.recurrence?.frequency!=="none",occurrence=esc(item.occurrenceDate||"");return '<div class="agenda-event-actions"><button class="small-action" type="button" data-event-action="edit" data-id="'+esc(id)+'" aria-label="Edit entire series or event">'+window.daybookIcon("edit")+'<span>'+(recurring?"Edit series":"Edit")+'</span></button>'+(recurring?'<button class="small-action" type="button" data-event-action="edit-occurrence" data-id="'+esc(id)+'" data-occurrence-date="'+occurrence+'">This occurrence</button><button class="small-action" type="button" data-event-action="skip-occurrence" data-id="'+esc(id)+'" data-occurrence-date="'+occurrence+'">Skip date</button>':"")+'<button class="small-action" type="button" data-event-action="duplicate" data-id="'+esc(id)+'">'+window.daybookIcon("plus")+'<span>Duplicate</span></button><button class="small-action danger" type="button" data-event-action="delete" data-id="'+esc(id)+'">'+window.daybookIcon("trash")+'<span>'+(recurring?"Delete series":"Delete")+'</span></button></div>'}
function eventDateLabel(value){return new Date(value+"T12:00:00").toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric"})}
function eventConflicts(candidate,id){
 const start=new Date(candidate.start),end=candidate.end?new Date(candidate.end):candidate.allDay?new Date(new Date(candidate.start).getTime()+86400000):null;if(!end)return [];
 const conflicts=[],limit=candidate.recurrence.frequency!=="none"?366:0;
 for(let offset=0;offset<=limit;offset++){
  const date=new Date(start);date.setDate(start.getDate()+offset);const key=iso(date);
  if(key<candidate.start.slice(0,10)||candidate.recurrence.endDate&&key>candidate.recurrence.endDate)continue;
  if(candidate.recurrence.frequency==="weekly"&&!candidate.recurrence.weekdays.includes(date.getDay()))continue;
  const delta=offset*86400000,from=new Date(start.getTime()+delta),to=new Date(end.getTime()+delta);
  const probe={startDateTime:iso(from)+"T"+String(from.getHours()).padStart(2,"0")+":"+String(from.getMinutes()).padStart(2,"0"),endDateTime:iso(to)+"T"+String(to.getHours()).padStart(2,"0")+":"+String(to.getMinutes()).padStart(2,"0")};
  for(const item of scheduleStore.getForDate(key)){if(item.id===id||item.endDateTime===null)continue;if(scheduleStore.overlaps(probe,item)&&!conflicts.some(x=>x.id===item.id&&x.date===key))conflicts.push({id:item.id,title:item.title,date:key})}
 }
 return conflicts;
}
function durationMinutes(item){const value=scheduleStore.durationMinutes(item);return Number.isFinite(value)&&value>0?value:0}
function hasScheduleOverlap(day,start,end,legacyId){
 if(!end||minutes(start)===minutes(end))return false;
 const selected=weekDates().find(x=>x.day===day)?.date||today,dayKey=iso(selected),nextDate=new Date(selected);nextDate.setDate(nextDate.getDate()+1);
 const startAt=new Date(dayKey+"T"+start),endKey=minutes(end)<=minutes(start)?iso(nextDate):dayKey,endAt=new Date(endKey+"T"+end);
 const others=[...scheduleStore.getForDate(selected),...scheduleStore.getForDate(nextDate)];
 return others.some(item=>item.source?.legacyId!==String(legacyId||"")&&item.endDateTime&&startAt<new Date(item.endDateTime)&&new Date(item.startDateTime)<endAt);
}
function scheduleLocalStamp(d){return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0")+"T"+String(d.getHours()).padStart(2,"0")+":"+String(d.getMinutes()).padStart(2,"0")}
function scheduleAnchors(day){
 const out=[],prayer=window.DaybookPrayer,settings=prayer?.getSettings?.();
 (prayer?.getPrayerIntervals?.(day)||[]).forEach(p=>out.push({id:"prayer-"+p.name,title:p.name+" prayer",start:scheduleLocalStamp(p.start),end:scheduleLocalStamp(p.end),kind:"anchor",category:"Prayer"}));
 if(settings?.bedtime&&settings?.wakeTime){const [bh,bm]=settings.bedtime.split(":").map(Number),[wh,wm]=settings.wakeTime.split(":").map(Number),start=new Date(day+"T00:00:00"),end=new Date(day+"T00:00:00");start.setDate(start.getDate()-1);start.setHours(bh,bm,0,0);end.setHours(wh,wm,0,0);out.push({id:"sleep-"+day,title:"Sleep",start:scheduleLocalStamp(start),end:scheduleLocalStamp(end),kind:"anchor",category:"Sleep"})}
 return out;
}
function renderScheduleModes(){
 const selected=weekDates().find(x=>x.day===selectedDay),day=iso(selected?.date||today),anchors=scheduleAnchors(day),plan=scheduleStore.getDayPlan(day,{anchors}),now=new Date(),todayKey=iso(now);
 $$("[data-schedule-mode]").forEach(b=>{const active=b.dataset.scheduleMode===scheduleMode;b.setAttribute("aria-pressed",String(active));b.classList.toggle("selected",active)});
 $$("[data-mode-panel]").forEach(p=>{p.hidden=p.dataset.modePanel!==scheduleMode});
 if(scheduleMode==="timeline"){
  const host=$("#dayTimeline");if(host){const prayer=anchors.filter(x=>x.category==="Prayer"),sleep=anchors.filter(x=>x.category==="Sleep");const status=day===todayKey?"Current time · "+now.toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"}):"Selected day · "+new Date(day+"T12:00:00").toLocaleDateString([],{weekday:"long",month:"short",day:"numeric"});host.insertAdjacentHTML("afterbegin",'<div class="timeline-context"><b>'+esc(status)+'</b><span>'+plan.conflicts.length+' detected conflict(s)</span>'+(sleep.length?'<small>Sleep '+esc(fmt(settingsTime(sleep[0].start)))+' – '+esc(fmt(settingsTime(sleep[0].end)))+'</small>':"")+'</div><div class="timeline-prayer-markers">'+prayer.map(x=>'<span><b>'+esc(x.title.replace(" prayer",""))+'</b> '+esc(fmt(x.start.slice(11)))+'</span>').join("")+'</div>');
  const activities=plan.activities.filter(x=>x.kind==="flexible"||x.kind==="optional"||x.kind==="task");
  if(activities.length)host.insertAdjacentHTML("beforeend",'<section class="timeline-unscheduled"><div><b>Flexible activities and tasks</b><small>These items do not occupy fixed timetable slots.</small></div>'+activities.map(x=>'<article><span>'+esc(x.title)+'</span><small>'+Number(x.durationMinutes||30)+' min · '+(x.dueDate?'Due '+esc(x.dueDate):'No deadline')+'</small></article>').join("")+'</section>');
  }}
 if(scheduleMode==="agenda"){
  const host=$("#scheduleAgenda");if(host){const group=(title,items,empty)=>'<section class="agenda-group"><div class="agenda-group-head"><h4>'+title+'</h4><span>'+items.length+'</span></div>'+(items.length?items.map(x=>{const start=x.startDateTime||x.start||x.scheduled?.start||"",end=x.endDateTime||x.end||x.scheduled?.end||"",time=start?fmt(start.slice(11))+(end?" – "+fmt(end.slice(11)):""):"No fixed time";return '<article class="agenda-row"><div><b>'+esc(x.title)+'</b><p>'+esc(time)+' · '+esc(x.category||x.kind||"Activity")+'</p></div>'+(x.planKind==="event"?eventActions({...x,canonicalId:x.id}):x.planKind==="task"?'<div class="agenda-row-actions"><button type="button" data-agenda-complete="'+esc(x.id)+'">'+((x.occurrenceStatus||x.status)==="completed"?"Reopen":"Complete")+'</button><button type="button" data-agenda-postpone="'+esc(x.id)+'">Tomorrow</button></div>':'')+'</article>'}).join(""):'<p class="muted">'+empty+'</p>')+'</section>';
   const fixed=plan.events.filter(x=>x.type==="class"||x.type==="event"||x.type==="routine"||x.type==="study"),prayers=anchors.filter(x=>x.category==="Prayer"),sleep=anchors.filter(x=>x.category==="Sleep"),flex=plan.activities.filter(x=>x.kind==="flexible"||x.kind==="optional"),tasks=plan.activities.filter(x=>x.kind==="task");
   host.innerHTML='<div class="agenda-summary"><b>'+new Date(day+"T12:00:00").toLocaleDateString([],{weekday:"long",month:"long",day:"numeric"})+'</b><span>'+fixed.length+' commitments · '+(flex.length+tasks.length)+' activities/tasks · '+Math.round(plan.available.reduce((n,x)=>n+x.duration,0)/60*10)/10+'h available · '+plan.conflicts.length+' conflicts</span></div>'+group("Prayer and sleep", [...prayers,...sleep],"No prayer or sleep anchors available for this date.")+group("Fixed commitments",fixed,"No fixed commitments. This time is available for flexible work.")+group("Flexible activities",flex,"No flexible activities planned for this day.")+group("Tasks and deadlines",tasks,"No tasks due or planned for this day.")+(plan.conflicts.length?'<p class="schedule-conflict-note">'+plan.conflicts.length+' overlapping time conflict(s) detected. Review the affected items before rescheduling.</p>':"");
   host.querySelectorAll("[data-agenda-complete]").forEach(b=>b.onclick=()=>{const x=scheduleStore.getTasks().find(t=>t.id===b.dataset.agendaComplete);if(x){if(x.repeat!=="none"){const dates=x.completedDates.includes(day)?x.completedDates.filter(d=>d!==day):[...x.completedDates,day];scheduleStore.updateTask(x.id,{completedDates:dates})}else scheduleStore.updateTask(x.id,{status:x.status==="completed"?"open":"completed"})}});
   host.querySelectorAll("[data-agenda-postpone]").forEach(b=>b.onclick=()=>{const x=scheduleStore.getTasks().find(t=>t.id===b.dataset.agendaPostpone);if(x){if(x.source?.kind==="legacy-task"){const task=data.tasks.find(t=>String(t.id)===x.source.legacyId);if(task){task.due=plusDayKey(day);save("Task postponed")}}else scheduleStore.updateTask(x.id,{postponedTo:plusDayKey(day),planDate:x.repeat==="none"?plusDayKey(day):x.planDate})}});
   wireEventActions();
  }}
 if(scheduleMode==="week"){
  const days=weekDates();window.DaybookPrayer?.prefetchRange?.(iso(days[0].date),7);
  const host=$("#scheduleWeekOverview");if(host){host.innerHTML='<div class="schedule-week-grid">'+days.map(({day:weekday,date})=>{const key=iso(date),ev=scheduleStore.getForDate(key),tasks=scheduleStore.getTasksForDate(key),all=[...ev,...tasks],classes=ev.filter(x=>x.type==="class"),deadline=tasks.filter(x=>x.dueDate===key).length,prayers=window.DaybookPrayer?.getPrayerIntervals?.(key)||[];return '<button type="button" class="schedule-week-day '+(key===todayKey?"is-today":"")+'" data-week-day="'+weekday+'"><span>'+date.toLocaleDateString([],{weekday:"short"})+'</span><b>'+date.getDate()+'</b><small>'+classes.length+' classes · '+all.length+' items</small><div class="schedule-week-items">'+all.slice(0,5).map(x=>'<span class="'+(x.type==="class"?"is-fixed":x.planKind==="task"?"is-task":"")+'">'+esc(x.title)+'</span>').join("")+(all.length>5?'<small>+'+(all.length-5)+' more</small>':"")+'</div>'+(prayers.length?'<small class="schedule-week-prayers">'+prayers.map(p=>esc(p.name)+' '+esc(fmt(String(p.start.getHours()).padStart(2,"0")+":"+String(p.start.getMinutes()).padStart(2,"0")))).join(" · ")+'</small>':'<small>Prayer timings loading</small>')+(deadline?'<small>'+deadline+' deadline(s)</small>':"")+'</button>'}).join("")+'</div>'}
  host.querySelectorAll("[data-week-day]").forEach(b=>b.onclick=()=>{selectedDay=Number(b.dataset.weekDay);scheduleMode="timeline";renderWeek();renderScheduleModes()});
 }
}
function settingsTime(value){return value||"00:00"}
function plusDayKey(day){const d=new Date(day+"T12:00:00");d.setDate(d.getDate()+1);return iso(d)}
$$("[data-schedule-mode]").forEach(b=>b.addEventListener("click",()=>{scheduleMode=b.dataset.scheduleMode;renderScheduleModes()}));
function renderWeek(){
 const days=weekDates(),start=days[0].date,end=days[6].date;
 $("#weekLabel").textContent=start.toLocaleDateString("en-US",{month:"short",day:"numeric"})+" – "+end.toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"});
 const weekItems=scheduleStore.getForWeek(start),weekTasks=days.flatMap(x=>scheduleStore.getTasksForDate(x.date)),weekClasses=weekItems.filter(x=>x.type==="class"),weekRoutine=weekItems.filter(x=>x.type!=="class");
 const totalMinutes=weekItems.reduce((n,x)=>n+durationMinutes(x),0);
 const studyMinutes=weekItems.filter(x=>x.type==="study"||String(x.category||"").toLowerCase()==="study").reduce((n,x)=>n+durationMinutes(x),0);
 $("#weekHours").textContent=(totalMinutes/60).toFixed(1).replace(/\.0$/,"")+"h";
 $("#classCount").textContent=weekClasses.length;$("#studyHours").textContent=(studyMinutes/60).toFixed(1).replace(/\.0$/,"")+"h";$("#routineCount").textContent=weekRoutine.length+weekTasks.length;
 $("#classSetupNote").style.display=weekClasses.some(x=>(x.metadata?.subject||x.title)&&(x.metadata?.subject||x.title)!=="University / campus")?"none":"flex";
 $("#weekDays").innerHTML=days.map(({day,date})=>{const n=scheduleEntries(day).length+scheduleStore.getTasksForDate(date).length,active=day===selectedDay,isToday=iso(date)===iso(today);return '<button type="button" class="week-day '+(active?"is-selected ":"")+(isToday?"is-today":"")+'" role="tab" aria-selected="'+active+'" aria-current="'+(isToday?"date":"false")+'" data-weekday="'+day+'"><span>'+DAYS[day].slice(0,3)+'</span><b>'+date.getDate()+'</b><small>'+n+' '+(n===1?"item":"items")+'</small></button>'}).join("");
 const selected=days.find(x=>x.day===selectedDay)||days[0],items=scheduleEntries(selectedDay),now=new Date(),isCurrentDay=iso(selected.date)===iso(now),current=now.getHours()*60+now.getMinutes();
 $("#selectedDayTitle").textContent=selected.date.toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"});
 const selectedPlan=scheduleStore.getDayPlan(selected.date,{anchors:scheduleAnchors(iso(selected.date))}),dayActivityCount=selectedPlan.events.length+selectedPlan.activities.length;$("#selectedDaySummary").textContent=dayActivityCount?selectedPlan.events.length+" commitments · "+selectedPlan.activities.length+" tasks and activities · "+selectedPlan.conflicts.length+" conflicts":"No activities scheduled. This day is open.";
 $("#currentClock").textContent=now.toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"});
 $("#dayTimeline").innerHTML=items.length?items.map(item=>{
  const startMin=minutes(item.time),ongoing=isCurrentDay&&item.endDateTime&&new Date(item.startDateTime)<=now&&new Date(item.endDateTime)>now,upcoming=isCurrentDay&&new Date(item.startDateTime)>now,duration=durationMinutes(item);
  const meta=[fmt(item.time)+(item.end?" – "+fmt(item.end):""),duration?Math.floor(duration/60)+"h "+(duration%60?duration%60+"m":""):"Duration unavailable",item.location].filter(Boolean).join(" · ");
  return '<article class="agenda-event '+(item.kind==="class"?"is-class":"is-"+String(item.category||"personal").toLowerCase().replace(/[^a-z0-9]+/g,"-"))+(ongoing?" is-current":"")+(upcoming?" is-upcoming":"")+'"><span class="agenda-event-rail"></span><div class="agenda-event-time">'+esc(fmt(item.time))+(item.end?'<small>'+esc(fmt(item.end))+'</small>':"")+'</div><div class="agenda-event-main"><div class="agenda-event-tags"><span>'+(item.kind==="class"?"UNIVERSITY CLASS":esc(String(item.category||"PERSONAL").toUpperCase()))+'</span>'+(ongoing?'<b class="status-pill">HAPPENING NOW</b>':upcoming?'<b class="status-pill">UP NEXT</b>':"")+'</div><h4>'+esc(item.title)+'</h4><p>'+esc(meta)+'</p></div>'+(item.kind==="event"?eventActions(item):'<div class="agenda-event-actions">'+rowActions(item.kind,item.id)+'</div>')+'</article>';
 }).join(""):'<div class="day-empty"><span class="empty-calendar-icon">'+window.daybookIcon("calendar",24)+'</span><h4>A clear day</h4><p>No classes or activities are scheduled for this day.</p><button type="button" class="primary" data-empty-add="routine">Add an activity</button></div>';
 const mix=new Map();weekClasses.forEach(x=>mix.set("University",(mix.get("University")||0)+durationMinutes({...x,time:x.start})));weekRoutine.forEach(x=>{const c=x.category||"Personal";mix.set(c,(mix.get(c)||0)+durationMinutes({...x,time:x.time}))});
 const groups=[...mix.entries()].filter(x=>x[1]>0).sort((x,y)=>y[1]-x[1]);$("#distributionTotal").textContent=totalMinutes?Math.round(totalMinutes/60*10)/10+" scheduled hours":"No timed durations available";
 $("#weekDistribution").innerHTML=groups.length?groups.map(([name,value])=>'<div class="distribution-row"><span>'+esc(name)+'</span><div class="distribution-track"><i style="width:'+Math.round(value/Math.max(1,totalMinutes)*100)+'%"></i></div><b>'+Math.floor(value/60)+'h '+(value%60?value%60+"m":"")+'</b></div>').join(""):'<p class="muted">Add end times to activities to see an accurate weekly distribution.</p>';
 $$("[data-weekday]").forEach(button=>button.onclick=()=>{selectedDay=Number(button.dataset.weekday);renderWeek();renderScheduleModes()});wireEventActions();$$("[data-empty-add]").forEach(button=>button.onclick=()=>openEditor("routine"));wireActions();
}
$("#prev").onclick=()=>{weekOffset--;renderWeek();renderScheduleModes()};$("#next").onclick=()=>{weekOffset++;renderWeek();renderScheduleModes()};$("#thisWeek").onclick=()=>{weekOffset=0;selectedDay=today.getDay();renderWeek();renderScheduleModes()};
function renderTasks(){const q=($("#taskSearch")?.value||"").trim().toLowerCase();let list=data.tasks.filter(t=>(filter==="all"||(filter==="done"?t.done:filter==="overdue"?!t.done&&!!t.due&&t.due<iso(today):!t.done))&&(!q||(t.title+" "+t.category+" "+t.notes).toLowerCase().includes(q)));list.sort((a,b)=>Number(a.done)-Number(b.done)||({High:0,Normal:1,Low:2}[a.priority]??1)-({High:0,Normal:1,Low:2}[b.priority]??1)||(a.due||"9999").localeCompare(b.due||"9999"));$("#allTasks").innerHTML=list.map(taskMarkup).join("")||'<div class="empty">No tasks match this view. Add a task to get started.</div>';$$("[data-filter]").forEach(b=>{const selected=b.dataset.filter===filter;b.classList.toggle("selected",selected);b.setAttribute("aria-pressed",String(selected))});wireActions();$$("[data-task]").forEach(e=>e.onchange=()=>{const t=data.tasks.find(x=>String(x.id)===e.dataset.task);if(t){t.done=e.checked;t.completedAt=e.checked?new Date().toISOString():null;save(e.checked?"Task completed":"Task reopened")}})}
let plannerSessionFilter="all",plannerSubjectFilter="all";
function sessionCompletedDate(s){return s.completedAt?iso(new Date(s.completedAt)):s.date||""}
function sessionMinutes(s){const n=Number(s.minutes);return Number.isFinite(n)&&n>0?n:0}
function plannerFormatMinutes(value){const n=Math.max(0,Math.round(value));return n>=60?Math.floor(n/60)+"h"+(n%60?" "+n%60+"m":""):n+"m"}
function renderPlanner(){
 const now=new Date(),todayKey=iso(now),weekStart=new Date(now);weekStart.setHours(0,0,0,0);weekStart.setDate(weekStart.getDate()-weekStart.getDay());const weekKey=iso(weekStart),weekEnd=new Date(weekStart);weekEnd.setDate(weekEnd.getDate()+7);const nextKey=iso(weekEnd);
 const completed=data.sessions.filter(s=>s.done),allMinutes=completed.reduce((n,s)=>n+sessionMinutes(s),0),todayMinutes=completed.filter(s=>sessionCompletedDate(s)===todayKey).reduce((n,s)=>n+sessionMinutes(s),0),weekSessions=completed.filter(s=>sessionCompletedDate(s)>=weekKey&&sessionCompletedDate(s)<nextKey),weekMinutes=weekSessions.reduce((n,s)=>n+sessionMinutes(s),0),planned=data.sessions.filter(s=>!s.done);
 $("#plannerTotalTime").textContent=plannerFormatMinutes(allMinutes);$("#plannerTotalMeta").textContent=completed.length+" completed sessions";$("#plannerTodayTime").textContent=plannerFormatMinutes(todayMinutes);$("#plannerWeekTime").textContent=plannerFormatMinutes(weekMinutes);$("#plannerWeekMeta").textContent=weekSessions.length+" sessions this week";$("#plannerCompletedCount").textContent=completed.length;$("#plannerPlannedMeta").textContent=planned.length+" planned";
 const goalMinutes=Math.max(1,Number(data.goal)||10)*60,goalPct=Math.min(100,weekMinutes/goalMinutes*100);$("#plannerGoalValue").textContent=plannerFormatMinutes(weekMinutes)+" / "+data.goal+"h";$("#plannerGoalBar").style.width=goalPct+"%";$("#plannerGoalBar").setAttribute("aria-valuenow",String(Math.round(goalPct)));$("#plannerGoalNote").textContent=weekMinutes>=goalMinutes?"Weekly target reached. Keep your pace sustainable.":plannerFormatMinutes(goalMinutes-weekMinutes)+" remaining to reach this week's target.";
 const subjects=[...new Set([...data.subjects,...data.sessions.map(s=>s.subject).filter(Boolean)])],subjectData=subjects.map((name,index)=>{const records=data.sessions.filter(s=>s.subject===name),done=records.filter(s=>s.done),mins=done.reduce((n,s)=>n+sessionMinutes(s),0);return {name,index,mins,count:done.length,planned:records.filter(s=>!s.done).length,share:allMinutes?mins/allMinutes*100:0,archived:!data.subjects.includes(name)}});
 $("#subjects").innerHTML=subjectData.map(x=>'<article class="planner-subject-card '+(x.archived?"is-archived":"")+'"><div class="planner-subject-top"><span class="planner-subject-mark mark-'+(x.index%6)+'"></span><span class="planner-subject-status">'+(x.archived?"HISTORY":"SUBJECT")+'</span></div><h4>'+esc(x.name)+'</h4><div class="planner-subject-time">'+plannerFormatMinutes(x.mins)+'</div><div class="planner-subject-meta">'+x.count+' completed · '+x.planned+' planned</div><div class="planner-subject-track"><span style="width:'+Math.round(x.share)+'%"></span></div><div class="planner-subject-foot">'+(allMinutes?Math.round(x.share)+"% of study time":"No completed time yet")+'</div></article>').join("")||'<div class="planner-empty">No subjects yet. Add your first subject to organize study sessions.</div>';
 const seven=Array.from({length:7},(_,i)=>{const d=new Date(now);d.setHours(0,0,0,0);d.setDate(now.getDate()-6+i);const key=iso(d),mins=completed.filter(s=>sessionCompletedDate(s)===key).reduce((n,s)=>n+sessionMinutes(s),0);return {date:d,key,mins}}),maxDay=Math.max(1,...seven.map(x=>x.mins));
 $("#plannerConsistency").innerHTML=seven.map(x=>'<div class="planner-day-column"><div class="planner-day-value">'+(x.mins?plannerFormatMinutes(x.mins):"—")+'</div><div class="planner-day-track"><span title="'+esc(x.date.toLocaleDateString())+'" style="height:'+Math.max(x.mins?5:0,x.mins/maxDay*100)+'%"></span></div><small class="'+(x.key===todayKey?"is-today":"")+'">'+x.date.toLocaleDateString("en-US",{weekday:"short"}).slice(0,2)+'</small></div>').join("");
 $("#plannerSubjectBars").innerHTML=subjectData.filter(x=>x.mins>0).sort((x,y)=>y.mins-x.mins).slice(0,6).map(x=>'<div class="planner-subject-bar"><span>'+esc(x.name)+'</span><div><i style="width:'+Math.round(x.share)+'%"></i></div><b>'+plannerFormatMinutes(x.mins)+'</b></div>').join("")||'<p class="planner-empty-inline">Completed study time will appear here.</p>';
 $("#sessionCount").textContent=data.sessions.length+" total · "+completed.length+" completed · "+planned.length+" planned";
 const subjectFilter=$("#sessionSubjectFilter");subjectFilter.innerHTML='<option value="all">All subjects</option>'+subjects.map(s=>'<option value="'+esc(s)+'">'+esc(s)+'</option>').join("");subjectFilter.value=subjects.includes(plannerSubjectFilter)?plannerSubjectFilter:"all";plannerSubjectFilter=subjectFilter.value;
 const filtered=data.sessions.filter(s=>(plannerSessionFilter==="all"||(plannerSessionFilter==="completed"?s.done:!s.done))&&(plannerSubjectFilter==="all"||s.subject===plannerSubjectFilter)).slice().sort((x,y)=>(x.date||"").localeCompare(y.date||"")||String(x.startTime||"").localeCompare(String(y.startTime||"")));
 $("#sessions").innerHTML=filtered.map(s=>{const overdue=!s.done&&s.date<todayKey,status=s.done?"COMPLETED":overdue?"OVERDUE":"UPCOMING",date=s.date?new Date(s.date+"T12:00:00").toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric"}):"Date not set",time=s.startTime?" · "+fmt(s.startTime):"",title=s.topic||"Study session";return '<article class="planner-session '+(s.done?"is-completed":overdue?"is-overdue":"is-planned")+'"><span class="planner-session-mark"></span><div class="planner-session-main"><div class="planner-session-meta"><span>'+status+'</span><span>'+esc(date+time)+'</span></div><h4>'+esc(title)+'</h4><p>'+esc(s.subject)+' · '+plannerFormatMinutes(sessionMinutes(s))+(s.notes?" · "+esc(s.notes):"")+'</p></div><div class="planner-session-actions"><button class="small-action" type="button" data-sessiondone="'+esc(s.id)+'" aria-label="'+(s.done?"Reopen":"Complete")+' '+esc(title)+'">'+(s.done?window.daybookIcon("rotate")+'<span>Reopen</span>':window.daybookIcon("check")+'<span>Complete</span>')+'</button>'+rowActions("study",s.id)+'</div></article>'}).join("")||'<div class="planner-empty"><b>'+(data.sessions.length?"No matching sessions":"Your study plan starts here")+'</b><span>'+(data.sessions.length?"Try another filter or subject.":"Schedule a focused session to give your next study block a purpose.")+'</span>'+(data.sessions.length?"":'<button type="button" class="secondary" data-planner-add>Plan your first session</button>')+'</div>';
 $$("[data-sessiondone]").forEach(button=>button.onclick=()=>{const session=data.sessions.find(x=>String(x.id)===button.dataset.sessiondone);if(!session)return;session.done=!session.done;session.completedAt=session.done?new Date().toISOString():null;save(session.done?"Study session completed":"Study session reopened")});
 $$("[data-session-filter]").forEach(button=>{button.classList.toggle("selected",button.dataset.sessionFilter===plannerSessionFilter);button.onclick=()=>{plannerSessionFilter=button.dataset.sessionFilter;renderPlanner()}});
 wireActions();
}
$("#sessionSubjectFilter").onchange=e=>{plannerSubjectFilter=e.target.value;renderPlanner()};
$("#plannerGoalEdit").onclick=()=>{$("#goalInput").value=data.goal;$("#goalDialog").showModal()};
$("#planner").addEventListener("click",event=>{if(event.target.closest("[data-planner-add]"))openEditor("study")});
function renderReminders(){
 const items=data.reminders.slice().sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time));
 $("#reminderItems").innerHTML=items.map(r=>{
  const schedule=r.repeat==="daily"?"Daily · "+fmt(r.time):r.repeat==="weekly"?"Weekly · "+fmt(r.time):esc(r.date)+" · "+fmt(r.time);
  return '<div class="row"><div class="grow"><b>'+esc(r.title)+'</b><small>'+schedule+'</small></div>'+rowActions("reminder",r.id)+'</div>';
 }).join("")||'<div class="empty">No reminders set.</div>';
 wireActions();
}
function renderAnalytics(){const done=data.tasks.filter(t=>t.done).length,total=data.tasks.length,rate=total?Math.round(done/total*100):0;const thisWeek=new Date(today);thisWeek.setDate(today.getDate()-today.getDay());const weekKey=iso(thisWeek);const nextWeek=new Date(thisWeek);nextWeek.setDate(nextWeek.getDate()+7);const nextWeekKey=iso(nextWeek);const studied=data.sessions.filter(s=>s.done);const weekMinutes=studied.filter(s=>{const completedDate=s.completedAt?iso(new Date(s.completedAt)):s.date;return completedDate>=weekKey&&completedDate<nextWeekKey}).reduce((n,s)=>n+Number(s.minutes||0),0);const allMinutes=studied.reduce((n,s)=>n+Number(s.minutes||0),0);$("#aDone").textContent=done;$("#aHours").textContent=(allMinutes/60).toFixed(1).replace(/\.0$/,"")+"h";$("#aSubjects").textContent=new Set(studied.map(s=>s.subject)).size;$("#progress").style.width=rate+"%";$("#progress").setAttribute("aria-valuenow",String(rate));$("#progressLabel").textContent=rate+"% complete · "+done+" of "+total+" tasks";const goalMins=Number(data.goal)*60;$("#goalValue").textContent=(weekMinutes/60).toFixed(1)+" / "+data.goal+" hours";const goalPercent=Math.min(100,weekMinutes/goalMins*100);$("#goalProgress").style.width=goalPercent+"%";$("#goalProgress").setAttribute("aria-valuenow",String(Math.round(goalPercent)));$("#goalLabel").textContent=Math.max(0,goalMins-weekMinutes)>0?((goalMins-weekMinutes)/60).toFixed(1)+" hours left this week":"Weekly goal reached.";const by={};studied.forEach(s=>by[s.subject]=(by[s.subject]||0)+Number(s.minutes));const max=Math.max(1,...Object.values(by));$("#subjectBars").innerHTML=Object.entries(by).sort((a,b)=>b[1]-a[1]).map(([s,m])=>'<div class="bar"><span>'+esc(s)+'</span><div class="bar-track"><span style="width:'+(m/max*100)+'%"></span></div><small>'+(m/60).toFixed(1)+'h</small></div>').join("")||'<div class="empty">Complete study sessions to see subject progress.</div>'}
function homeTodayItems(now=new Date()){
 const current=now.getTime(),items=scheduleStore.getForDate(now).map(item=>({...item,kind:item.type==="class"?"class":item.type==="study"?"study":"routine",title:item.title,room:item.metadata?.room||item.location||""}));
 return items.map(item=>{const start=new Date(item.startDateTime).getTime(),end=item.endDateTime?new Date(item.endDateTime).getTime():null;const status=start<=current&&end!==null&&current<end?"current":(end!==null?end<=current:start<=current)?"past":"upcoming";return {...item,status,currentMinutes:now.getHours()*60+now.getMinutes(),nextTime:""};});
}
function renderHomeWelcome(now=new Date()){
 const hour=now.getHours(),greeting=hour<12?"Good morning":hour<17?"Good afternoon":"Good evening";
 $("#homeGreeting").textContent=greeting+", Mashal.";
 $("#homeDate").textContent=now.toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"}).toUpperCase();
 $("#homeDateChip").textContent=now.toLocaleDateString("en-US",{month:"short",day:"numeric"});
}
function renderNextUp(items,now=new Date()){
 const current=now.getHours()*60+now.getMinutes(),active=items.find(x=>x.status==="current"),next=items.find(x=>x.status==="upcoming");
 const item=active||next,label=$("#nextUpLabel"),title=$("#nextUpTitle"),meta=$("#nextUpMeta"),time=$("#nextUpTime"),count=$("#nextUpCountdown"),category=$("#nextUpCategory");
 if(!item){label.textContent="YOU'RE ALL CAUGHT UP";title.textContent="No more activities today";meta.textContent="Your schedule is clear for the rest of the day.";time.textContent="—";count.textContent="";category.textContent="DAY PLAN";return}
 label.textContent=active?"HAPPENING NOW":"NEXT UP";
 title.textContent=item.title;
 meta.textContent=(item.kind==="class"?"University class":item.kind==="event"?"Scheduled event":item.kind==="study"?"Study session":"Routine activity")+(item.room?" · "+item.room:"")+(active&&item.end?" · Ends "+fmt(item.end):"");
 time.textContent=item.kind==="class"?fmt(item.time)+" – "+fmt(item.end):fmt(item.time);
 if(active){count.textContent=item.endDateTime?Math.max(0,Math.ceil((new Date(item.endDateTime)-now)/60000))+" min left":"IN PROGRESS";category.textContent=item.kind==="class"?"CLASS":item.kind==="event"?"EVENT":item.kind==="study"?"STUDY":"ROUTINE"}
 else{const remaining=minutes(item.time)-current;count.textContent=remaining<60?"In "+remaining+" min":"In "+Math.floor(remaining/60)+"h "+(remaining%60)+"m";category.textContent=item.kind==="class"?"CLASS":"ROUTINE"}
}
function renderHomeTimeline(items){
 const host=$("#todayClasses"),current=items.find(x=>x.status==="current");
 $("#homeActivityCount").textContent=items.length;
 $("#homeScheduleSummary").textContent=items.length?items.length+" scheduled activities"+(current?" · "+current.title+" is in progress":""):"Nothing scheduled for today.";
 host.innerHTML=items.slice(0,7).map(item=>'<div class="home-timeline-item is-'+item.status+'"><span class="home-timeline-rail"><i></i></span><time>'+esc(fmt(item.time))+'</time><div class="home-timeline-content"><b>'+esc(item.title)+'</b><small>'+(item.kind==="class"?"Class":item.kind==="event"?"Event":item.kind==="study"?"Study":"Routine")+(item.end?" · "+esc(fmt(item.end)):"")+(item.room?" · "+esc(item.room):"")+'</small></div>'+(item.kind==="event"?'<button type="button" class="small-action" data-event-open="'+esc(item.id)+'" aria-label="View '+esc(item.title)+'">'+window.daybookIcon("edit")+'</button>':"")+'<span class="home-timeline-status">'+(item.status==="current"?"NOW":item.status==="past"?"PAST":"UPCOMING")+'</span></div>').join("")||'<div class="home-empty">Your day is open. Add an activity or class to build your timeline.</div>';
 $$("[data-event-open]").forEach(button=>button.onclick=()=>openEditor("event",button.dataset.eventOpen));
}
function renderHomeTasks(){
 const tasks=data.tasks.slice(),done=tasks.filter(t=>t.done).length,pending=tasks.length-done,rate=tasks.length?Math.round(done/tasks.length*100):0;
 $("#homeDoneTasks").textContent=done;$("#homePendingTasks").textContent=pending;$("#overdue").textContent=data.tasks.filter(t=>!t.done&&t.due&&t.due<iso(today)).length;
 $("#homeTaskProgress").style.width=rate+"%";$("#homeProgressValue").textContent=tasks.length?rate+"%":"—";
 $("#homeProgressCaption").textContent=tasks.length?done+" of "+tasks.length+" tasks completed · "+pending+" remaining":"No tasks yet. Add one to start tracking progress.";
 const priority=tasks.filter(t=>!t.done).sort((a,b)=>Number(!!b.due&&b.due<iso(today))-Number(!!a.due&&a.due<iso(today))||({High:0,Normal:1,Low:2}[a.priority]??1)-({High:0,Normal:1,Low:2}[b.priority]??1)||(a.due||"9999").localeCompare(b.due||"9999")).slice(0,3);
 $("#priority").innerHTML=priority.map(taskMarkup).join("")||'<div class="home-empty">No pending tasks. Add a task whenever something needs your attention.</div>';
  $$("[data-task]").forEach(input=>input.onchange=()=>{const task=data.tasks.find(t=>String(t.id)===input.dataset.task);if(!task)return;task.done=input.checked;task.completedAt=input.checked?new Date().toISOString():null;save(input.checked?"Task completed":"Task reopened")});
}
function renderHomeAcademics(now=new Date()){
 const courses=safeArray("academic_courses"),assessments=safeArray("academic_assessments");
 const pending=assessments.filter(a=>!a.done).sort((a,b)=>(a.due||"9999").localeCompare(b.due||"9999"));
 const todayKey=iso(now),sessions=data.sessions.filter(s=>s.done&&(s.completedAt?iso(new Date(s.completedAt)):s.date)===todayKey);
 const minutesToday=sessions.reduce((sum,s)=>sum+Number(s.minutes||0),0);
 $("#homeCourseCount").textContent=courses.length||data.subjects.length;
 $("#homeAssessmentCount").textContent=pending.length;
 $("#homeStudyToday").textContent=minutesToday>=60?(minutesToday/60).toFixed(1).replace(/\.0$/,"")+"h":minutesToday+"m";
 const next=pending[0];
 $("#homeAcademicNote").textContent=next?"Next deadline: "+next.title+" · "+(next.due||"Date not set"):(courses.length?"No pending course assessments. Keep your study sessions consistent.":"Add your courses in Academics to see your academic snapshot.");
}
function renderHomeInsights(now=new Date()){
 const start=new Date(now);start.setDate(now.getDate()-now.getDay());const weekStart=iso(start),end=new Date(start);end.setDate(end.getDate()+7);const weekEnd=iso(end);
 const studied=data.sessions.filter(s=>s.done).filter(s=>{const date=s.completedAt?iso(new Date(s.completedAt)):s.date;return date>=weekStart&&date<weekEnd}).reduce((sum,s)=>sum+Number(s.minutes||0),0);
 const goal=Number(data.goal)||10;
 $("#homeWeeklyStudy").textContent=(studied/60).toFixed(1).replace(/\.0$/,"")+" / "+goal+"h";
 $("#homeWeeklyStudyNote").textContent=studied>=goal*60?"Weekly study goal reached.":((goal*60-studied)/60).toFixed(1).replace(/\.0$/,"")+"h remaining this week";
 const habits=safeArray("habits"),checks=safeRead("habit_checks",{});
 if(habits.length){let possible=0,complete=0;for(let i=0;i<7;i++){const d=new Date(now);d.setDate(now.getDate()-i);const key=iso(d);possible+=habits.length;complete+=(Array.isArray(checks[key])?checks[key]:[]).filter(id=>habits.some(h=>h.id===id)).length}
 const rate=possible?Math.round(complete/possible*100):0;$("#homeHabitRate").textContent=rate+"%";$("#homeHabitNote").textContent="Last 7 days · "+complete+" of "+possible+" check-ins";
 }else{$("#homeHabitRate").textContent="—";$("#homeHabitNote").textContent="Add habits to track consistency"}
}
function render(){
 const now=new Date();renderFocus();renderHomeWelcome(now);
 const items=homeTodayItems(now);$("#homeContext").textContent=items.length+" activities scheduled · "+data.tasks.filter(t=>!t.done).length+" tasks remaining";renderNextUp(items,now);renderHomeTimeline(items);renderHomeTasks();renderHomeAcademics(now);renderHomeInsights(now);
 renderWeek();renderScheduleModes();renderTasks();renderPlanner();renderReminders();renderAnalytics();
}
function wireActions(){$$("[data-edit]").forEach(b=>b.onclick=()=>openEditor(b.dataset.edit,b.dataset.id));$$("[data-duplicate]").forEach(b=>b.onclick=()=>openEditor(b.dataset.duplicate,null,b.dataset.id));$$("[data-delete]").forEach(b=>b.onclick=()=>removeItem(b.dataset.delete,b.dataset.id))}
function removeItem(type,id){const key=({class:"classes",routine:"routine",task:"tasks",study:"sessions",reminder:"reminders"})[type];if(!key)return;if(!confirm("Delete this "+type+"?"))return;data[key]=data[key].filter(x=>String(x.id)!==String(id));save("Deleted")}
function field(label,name,kind="text",value="",extra=""){const optional=extra==="optional";return '<div class="field"><label for="'+esc(name)+'">'+esc(label)+'</label><input id="'+esc(name)+'" name="'+esc(name)+'" type="'+kind+'" value="'+esc(value)+'" '+(optional?"":extra)+(optional?"":" required")+'></div>'}
function selectField(label,name,options,value){return '<div class="field"><label for="'+esc(name)+'">'+esc(label)+'</label><select id="'+esc(name)+'" name="'+esc(name)+'" required>'+options.map(o=>'<option value="'+esc(o.value)+'" '+(o.value===String(value)?"selected":"")+'>'+esc(o.label)+'</option>').join("")+'</select></div>'}
function openEditor(type,id=null,duplicateFrom=null){edit={type,id};const sourceId=id||duplicateFrom;const old=sourceId?(type==="event"?scheduleStore.getAll().find(x=>String(x.id)===String(sourceId)):data[({class:"classes",routine:"routine",task:"tasks",study:"sessions",reminder:"reminders"})[type]].find(x=>String(x.id)===String(sourceId)))||{}:{};let title="",body="";const subjectOpts=[...new Set([...data.subjects,...(old.subject?[old.subject]:[])])].map(s=>({value:s,label:s}));if(type==="event"){
 title=id?"Event details & editing":duplicateFrom?"Duplicate event":"Create event";
 const startDate=old.start?old.start.slice(0,10):iso(weekDates().find(x=>x.day===selectedDay)?.date||today),startTime=old.start?old.start.slice(11):"09:00",endDate=old.end?old.end.slice(0,10):sourceId?"":startDate,endTime=old.end?old.end.slice(11):sourceId?"":"10:00";
 const cats=["Personal","University","Study","Work","Health","Family","Other"],cat=old.category||"Personal",freq=old.recurrence?.frequency||"none",days=old.recurrence?.weekdays?.length?old.recurrence.weekdays:[new Date(startDate+"T12:00:00").getDay()];
 body=field("Event title","eventTitle","text",old.title||"")+
 selectField("Category","eventCategory",cats.map(x=>({value:x,label:x})),cat)+
 '<div class="field"><label for="eventDescription">Description / notes</label><textarea id="eventDescription" name="eventDescription" rows="2">'+esc(old.description||old.notes||"")+'</textarea></div>'+
 field("Location (optional)","eventLocation","text",old.location||"","optional")+
 '<div class="event-form-section"><b>Date and time</b><div class="two">'+field("Start date","eventStartDate","date",startDate)+field("Start time","eventStartTime","time",startTime)+'</div>'+
 '<label class="event-check"><input type="checkbox" id="eventAllDay" name="eventAllDay" value="yes" '+(old.allDay?"checked":"")+'> All-day event</label>'+
 '<div class="two" id="eventEndFields">'+field("End date","eventEndDate","date",endDate)+field("End time","eventEndTime","time",endTime)+'</div></div>'+
 '<div class="event-form-section"><b>Repeat</b>'+selectField("Recurrence","eventFrequency",[{value:"none",label:"Does not repeat"},{value:"daily",label:"Daily"},{value:"weekly",label:"Weekly / selected days"}],freq)+
 '<div id="eventWeekdays" class="event-weekdays">'+DAYS.map((d,i)=>'<label><input type="checkbox" name="eventWeekday" value="'+i+'" '+(days.includes(i)?"checked":"")+'><span>'+d.slice(0,3)+'</span></label>').join("")+'</div>'+
 field("Repeat until (optional)","eventRecurrenceEnd","date",old.recurrence?.endDate||"","optional")+
 (freq!=="none"?'<p class="event-series-note">Use “This occurrence” from the timetable to change one date only. Editing this form changes the recurring series.</p>':'')+'</div>'+
 '<div class="two">'+selectField("Priority","eventPriority",["low","normal","high","urgent"].map(x=>({value:x,label:x[0].toUpperCase()+x.slice(1)})),old.priority||"normal")+
 selectField("Reminder", "eventReminder",[{value:"off",label:"No reminder"},{value:"5",label:"5 minutes before"},{value:"10",label:"10 minutes before"},{value:"15",label:"15 minutes before"},{value:"30",label:"30 minutes before"},{value:"60",label:"1 hour before"},{value:"1440",label:"1 day before"}],old.reminder?.enabled?String(old.reminder.minutesBefore):"off")+"</div><p class=\"event-series-note\">Reminder preference is saved with the event. Notification delivery is not connected yet.</p>";
 }if(type==="class"){title=id?"Edit class":duplicateFrom?"Duplicate class":"Add university class";body=selectField("Subject","subject",subjectOpts,old.subject||data.subjects[0]||"")+selectField("Day","day",DAYS.map((d,i)=>({value:String(i),label:d})),String(old.day??1))+'<div class="two">'+field("Start time","start","time",old.start||"08:00")+field("End time","end","time",old.end||"09:00")+'</div>'+field("Room / location (optional)","room","text",old.room||"","optional")}
if(type==="routine"){title=id?"Edit activity":duplicateFrom?"Duplicate activity":"Add activity";body=field("Activity","title","text",old.title||"")+'<div class="two">'+selectField("Day","day",DAYS.map((d,i)=>({value:String(i),label:d})),String(old.day??today.getDay()))+field("Start time","time","time",old.time||"07:00")+field("End time (optional)","end","time",old.end||"","optional")+'</div>'+selectField("Category","category",["Study","Personal","Break","Important"].map(x=>({value:x,label:x})),old.category||"Personal")+field("Location (optional)","location","text",old.location||"","optional")}
if(type==="task"){title=id?"Edit task":"Add task";body=field("Task name","title","text",old.title||"")+selectField("Category","category",["Assignment","Revision","University","Personal","Project","Other"].map(x=>({value:x,label:x})),old.category||"Assignment")+selectField("Priority","priority",["High","Normal","Low"].map(x=>({value:x,label:x})),old.priority||"Normal")+field("Estimated duration (minutes)","durationMinutes","number",old.durationMinutes||data.settings.defaultDuration||30,'min="1" max="1440"')+field("Due date (optional)","due","date",old.due||"","optional")+field("Notes (optional)","notes","text",old.notes||"","optional")}
if(type==="study"){title=id?"Edit study session":"Plan study session";body=selectField("Subject","subject",subjectOpts,old.subject||data.subjects[0]||"")+field("Session title","topic","text",old.topic||"","optional")+field("Date","date","date",old.date||iso(today))+field("Start time (optional)","startTime","time",old.startTime||"","optional")+field("Planned duration (minutes)","minutes","number",old.minutes||60,'min="1" max="1440"')+field("Notes (optional)","notes","text",old.notes||"","optional")}
if(type==="reminder"){title=id?"Edit reminder":"Add reminder";body=field("Reminder","title","text",old.title||"")+field("Date","date","date",old.date||iso(today))+field("Time","time","time",old.time||"19:00")+selectField("Repeat","repeat",[{value:"none",label:"Does not repeat"},{value:"daily",label:"Daily"},{value:"weekly",label:"Weekly"}],old.repeat||"none")}
$("#dialogTitle").textContent=title;$("#fields").innerHTML=body;$("#editor").showModal();
 if(type==="event"){
  const allDay=document.getElementById("eventAllDay"),endFields=document.getElementById("eventEndFields"),frequency=document.getElementById("eventFrequency"),weekdays=document.getElementById("eventWeekdays"),endDate=document.getElementById("eventEndDate"),endTime=document.getElementById("eventEndTime");
  const sync=()=>{const disabled=allDay.checked;document.getElementById("eventStartTime").disabled=disabled;endDate.disabled=disabled;endTime.disabled=disabled;endFields.hidden=disabled;weekdays.hidden=frequency.value!=="weekly";document.getElementById("eventRecurrenceEnd").closest(".field").hidden=frequency.value==="none"};
  allDay.onchange=sync;frequency.onchange=sync;sync();
  if(id&&old.recurrence?.frequency!=="none")$("#fields").insertAdjacentHTML("beforeend",'<p class="event-series-note">This is a recurring series. Saving changes updates every matching occurrence in the series.</p>');
 }}
$$("[data-add]").forEach(button=>button.onclick=()=>openEditor(button.dataset.add));window.DaybookOpenEventForm=(id=null)=>openEditor("event",id);
$("#close").onclick=$("#cancel").onclick=()=>$("#editor").close();
function handleEventAction(action){
 const id=action.dataset.id,series=scheduleStore.getAll().find(x=>x.id===id),originalDate=action.dataset.occurrenceDate;
 if(action.dataset.eventAction==="edit")openEditor("event",id);
 if(action.dataset.eventAction==="edit-occurrence")openOccurrenceEditor(id,originalDate);
 if(action.dataset.eventAction==="skip-occurrence"&&confirm("Skip only this occurrence on "+eventDateLabel(originalDate)+"?")){try{const identity=scheduleStore.getOccurrenceId(id,originalDate),existing=scheduleStore.getException(identity);const saved=existing?scheduleStore.updateException(identity,{type:"cancelled",override:null}):scheduleStore.createException({seriesId:id,originalDate,type:"cancelled",override:null});if(saved)toast("Occurrence skipped");else toast("Could not skip occurrence")}catch(error){toast(error.message||"Could not skip occurrence")}render()}
 if(action.dataset.eventAction==="duplicate")openEditor("event",null,id);
 if(action.dataset.eventAction==="delete"&&confirm("Delete this "+(series?.recurrence?.frequency==="weekly"?"entire recurring series":"event")+"?")){if(scheduleStore.deleteEvent(id))toast("Event deleted");else toast("Could not delete event");render()}
}
function openOccurrenceEditor(seriesId,originalDate){
 const identity=scheduleStore.getOccurrenceId(seriesId,originalDate),series=scheduleStore.getAll().find(x=>x.id===seriesId);if(!identity||!series)return;
 const exception=scheduleStore.getException(identity),lookupDate=exception?.override?.startDateTime?.slice(0,10)||originalDate,item=scheduleStore.getForDate(lookupDate).find(x=>x.occurrenceId===identity)||scheduleStore.getForDate(originalDate).find(x=>x.occurrenceId===identity);if(!item)return;
 let dialog=document.getElementById("occurrenceEditor");if(!dialog){dialog=document.createElement("dialog");dialog.id="occurrenceEditor";document.body.append(dialog)}
 const start=item.startDateTime||series.start,end=item.endDateTime||series.end||"",date=start.slice(0,10),time=start.slice(11),endDate=end?end.slice(0,10):date,endTime=end?end.slice(11):"";
 dialog.innerHTML='<form id="occurrenceForm"><div class="dialog-head"><h3>Edit one occurrence</h3><button type="button" id="occurrenceClose" aria-label="Close">×</button></div><p class="muted">Only '+esc(eventDateLabel(originalDate))+' will change. The recurring series and other exceptions remain untouched.</p><div class="fields">'+field("Title","occTitle","text",item.title||series.title)+field("Date","occDate","date",date)+field("Start time","occStart","time",time)+field("End date","occEndDate","date",endDate,"optional")+field("End time","occEnd","time",endTime,"optional")+'</div><div class="actions"><button type="button" class="secondary" id="occurrenceCancel">Cancel</button><button class="primary">Save occurrence</button></div></form>';
 const close=()=>dialog.close();dialog.querySelector("#occurrenceClose").onclick=dialog.querySelector("#occurrenceCancel").onclick=close;
 dialog.querySelector("form").onsubmit=e=>{e.preventDefault();const f=new FormData(e.target),title=String(f.get("occTitle")||"").trim(),newDate=String(f.get("occDate")||""),startTime=String(f.get("occStart")||""),newEndDate=String(f.get("occEndDate")||newDate),newEndTime=String(f.get("occEnd")||"");const validDate=x=>/^\d{4}-\d{2}-\d{2}$/.test(x)&&iso(new Date(x+"T12:00:00"))===x,validTime=x=>/^([01]\d|2[0-3]):[0-5]\d$/.test(x);
 if(!title||!validDate(newDate)||!validTime(startTime)||newEndTime&&(!validDate(newEndDate)||!validTime(newEndTime))){toast("Enter a valid title, date and time");return}
 const startDateTime=newDate+"T"+startTime,endDateTime=newEndTime?newEndDate+"T"+newEndTime:null;if(endDateTime&&new Date(endDateTime)<=new Date(startDateTime)){toast("End must be after start");return}
 const override={title,startDateTime,endDateTime},type=newDate!==originalDate||startTime!==time||newEndDate!==endDate||newEndTime!==endTime?"rescheduled":"modified";
 try{const existing=scheduleStore.getException(identity),saved=existing?scheduleStore.updateException(identity,{type,override}):scheduleStore.createException({seriesId,originalDate,type,override});if(!saved){toast("Could not save this occurrence");return}dialog.close();toast("Occurrence updated");render()}catch(error){toast(error.message||"Could not update occurrence")}
 };
 dialog.showModal();
}
function wireEventActions(){
 $$("[data-event-action]").forEach(button=>button.onclick=()=>handleEventAction(button));
 $$("[data-event-open]").forEach(button=>button.onclick=()=>openEditor("event",button.dataset.eventOpen));
}

$("#form").onsubmit=e=>{e.preventDefault();const v=Object.fromEntries(new FormData(e.target).entries());const type=edit.type,id=edit.id;let key=({class:"classes",routine:"routine",task:"tasks",study:"sessions",reminder:"reminders"})[type];
 if(type==="event"){
  const title=String(v.eventTitle||"").trim(),startDate=v.eventStartDate,startTime=v.eventAllDay?"00:00":v.eventStartTime,endDate=v.eventEndDate,endTime=v.eventAllDay?"00:00":v.eventEndTime,allDay=document.getElementById("eventAllDay").checked,frequency=v.eventFrequency||"none",weekdays=Array.from(e.target.querySelectorAll('input[name="eventWeekday"]:checked')).map(x=>Number(x.value)),validDate=s=>/^\d{4}-\d{2}-\d{2}$/.test(s||"")&&!Number.isNaN(new Date(s+"T12:00:00").getTime())&&iso(new Date(s+"T12:00:00"))===s,validTime=s=>/^([01]\d|2[0-3]):[0-5]\d$/.test(s||"");
  if(!title){toast("Enter an event title");document.getElementById("eventTitle").focus();return}
  if(!validDate(startDate)){toast("Choose a valid start date");return}
  if(!allDay&&!validTime(startTime)){toast("Choose a valid start time");return}
  if(!allDay&&(!validDate(endDate)||!validTime(endTime))){toast("Enter a valid end date and end time");return}if(allDay&&((endDate&&!validDate(endDate))||(endTime&&!validTime(endTime)))){toast("Enter a valid end date and end time, or clear both");return}
  const start=startDate+"T"+startTime,end=endDate?endDate+"T"+endTime:null;
  if(end&&new Date(end)<=new Date(start)){toast("The event end must be after its start");return}
  if(allDay&&endDate&&endDate!==startDate){toast("Multi-day all-day events are not supported yet");return}
  if(frequency==="weekly"&&(!weekdays.length||weekdays.some(n=>!Number.isInteger(n)||n<0||n>6))){toast("Choose at least one repeat day");return}
  const recurrenceEnd=v.eventRecurrenceEnd||null;
  if(recurrenceEnd&&(!validDate(recurrenceEnd)||recurrenceEnd<startDate)){toast("Repeat-until date must be valid and not before the start date");return}
  const candidate={id:id||undefined,title,category:v.eventCategory||"Personal",type:"event",start,end,allDay,recurrence:{frequency,weekdays:frequency==="weekly"?weekdays:[],startDate:frequency!=="none"?startDate:null,endDate:frequency!=="none"?recurrenceEnd:null},description:String(v.eventDescription||"").trim(),location:String(v.eventLocation||"").trim(),priority:v.eventPriority||"normal",reminder:{enabled:v.eventReminder!=="off",minutesBefore:v.eventReminder==="off"?0:Number(v.eventReminder)||0}};
  const conflicts=eventConflicts(candidate,id);
  if(conflicts.length&&!confirm("This event overlaps "+conflicts.slice(0,3).map(x=>x.title+" on "+eventDateLabel(x.date)).join(", ")+(conflicts.length>3?" and "+(conflicts.length-3)+" more":"")+". Save anyway?"))return;
  try{const saved=id?scheduleStore.updateEvent(id,candidate):scheduleStore.createEvent(candidate);if(!saved){toast("Could not save the event. Check available device storage.");return}$("#editor").close();toast(id?"Event updated":"Event created");render()}catch(error){toast(error.message||"Could not save event")}
  return;
 }const validDate=s=>/^\d{4}-\d{2}-\d{2}$/.test(s)&&!Number.isNaN(new Date(s+"T12:00:00").getTime())&&iso(new Date(s+"T12:00:00"))===s;const validTime=s=>/^([01]\d|2[0-3]):[0-5]\d$/.test(s);if(["task","routine","reminder"].includes(type))v.title=(v.title||"").trim();if(type==="class"){v.subject=(v.subject||"").trim();if(!v.subject||!validTime(v.start)||!validTime(v.end)){toast("Enter a subject and valid start/end times");return}v.day=+v.day;if(!Number.isInteger(v.day)||v.day<0||v.day>6){toast("Choose a valid day");return}if(minutes(v.end)===minutes(v.start)){toast("Start and end times cannot be identical");return}const clash=hasScheduleOverlap(v.day,v.start,v.end,id);if(clash&&!confirm("This class overlaps another scheduled item. Save anyway?"))return}
if(type==="routine"){v.title=(v.title||"").trim();v.location=(v.location||"").trim();if(!v.title||!validTime(v.time)||v.end&&!validTime(v.end)){toast("Enter an activity and valid start/end times");return}v.day=+v.day;if(!Number.isInteger(v.day)||v.day<0||v.day>6){toast("Choose a valid day");return}if(v.end&&minutes(v.end)===minutes(v.time)){toast("Start and end times cannot be identical");return}const clash=hasScheduleOverlap(v.day,v.time,v.end,id);if(clash&&!confirm("This activity overlaps another scheduled item. Save anyway?"))return}
if(type==="task"){v.title=(v.title||"").trim();v.durationMinutes=Number(v.durationMinutes||30);if(!v.title||!Number.isInteger(v.durationMinutes)||v.durationMinutes<1||v.durationMinutes>1440){toast("Enter a task name and an estimated duration from 1 to 1440 minutes");return}}if(type==="reminder"&&(!v.title||!validDate(v.date)||!validTime(v.time))){toast("Enter a reminder, valid date and valid time");return}if(type==="study"){v.subject=(v.subject||"").trim();v.topic=(v.topic||"").trim();v.notes=(v.notes||"").trim();const mins=Number(v.minutes);if(!v.subject||!validDate(v.date)||!Number.isInteger(mins)||mins<1||mins>1440||(v.startTime&&!validTime(v.startTime))){toast("Enter a subject, valid date, optional valid start time and duration from 1 to 1440 minutes");return}if(!data.subjects.includes(v.subject)&&!(id&&data.sessions.some(s=>String(s.id)===String(id)&&s.subject===v.subject))){toast("Choose an active subject or add it first");return}v.minutes=mins}
if(id){const i=data[key].findIndex(x=>String(x.id)===String(id));data[key][i]={...data[key][i],...v}}else data[key].push({id:uid(),...v,done:false,createdAt:new Date().toISOString()});$("#editor").close();save(id?"Changes saved":"Added successfully")};
$("#taskSearch").addEventListener("input",renderTasks);$$("[data-filter]").forEach(b=>b.onclick=()=>{filter=b.dataset.filter;renderTasks()});
$("#manageSubjects").onclick=()=>{renderSubjectManager();$("#manageDialog").showModal()};$("#manageClose").onclick=()=>$("#manageDialog").close();$("#manageForm").onsubmit=e=>{e.preventDefault();$("#addSubject").click()};
function renderSubjectManager(){
 $("#subjectList").innerHTML=data.subjects.map((s,i)=>'<div class="planner-subject-manage"><span class="planner-subject-mark mark-'+(i%6)+'"></span><input aria-label="Subject name" data-subject-name="'+i+'" value="'+esc(s)+'" maxlength="70"><button class="small-action" type="button" data-subjectrename="'+i+'">'+window.daybookIcon("edit")+'<span>Save</span></button><button class="small-action danger" type="button" data-subjectdel="'+i+'">'+window.daybookIcon("trash")+'<span>Remove</span></button></div>').join("");
 $$("[data-subjectrename]").forEach(button=>button.onclick=()=>{const index=+button.dataset.subjectrename,old=data.subjects[index],value=$('[data-subject-name="'+index+'"]').value.trim();if(!value){toast("Enter a subject name");return}if(data.subjects.some((s,i)=>i!==index&&s.toLowerCase()===value.toLowerCase())){toast("Subject already exists");return}if(value===old)return;data.subjects[index]=value;data.sessions.forEach(session=>{if(session.subject===old)session.subject=value});data.classes.forEach(item=>{if(item.subject===old)item.subject=value});if(focusState.subject===old)focusState.subject=value;storeFocus();persist();renderSubjectManager();render();toast("Subject updated; its study history was retained")});
 $$("[data-subjectdel]").forEach(button=>button.onclick=()=>{const index=+button.dataset.subjectdel,subject=data.subjects[index];if(!subject)return;const used=data.sessions.some(x=>x.subject===subject)||data.classes.some(x=>x.subject===subject);if(used&&!confirm("Remove this subject from your active list? Existing study sessions and timetable records will be preserved as history."))return;data.subjects.splice(index,1);if(focusState.subject===subject&&!focusState.running)focusState.subject=data.subjects[0]||"";storeFocus();persist();renderSubjectManager();render();toast("Subject removed; historical records preserved")});
}
$("#addSubject").onclick=e=>{e.preventDefault();const value=$("#newSubject").value.trim();if(!value)return;if(data.subjects.some(s=>s.toLowerCase()===value.toLowerCase())){toast("Subject already exists");return}data.subjects.push(value);window.dispatchEvent(new CustomEvent("daybook-subjects-updated",{detail:data.subjects.slice()}));$("#newSubject").value="";persist();renderSubjectManager();render();toast("Subject added")};
$("#settingsBtn").onclick=()=>{$("#timeFormatSetting").value=data.settings.timeFormat||"12h";$("#themeSetting").value=data.settings.theme||"dark";$("#defaultDurationSetting").value=String(data.settings.defaultDuration||60);$("#weekStartSetting").value=String(data.settings.weekStart??0);$("#settingsDialog").showModal()};$("#settingsForm").onsubmit=e=>{e.preventDefault();data.settings={...data.settings,timeFormat:$("#timeFormatSetting").value,theme:$("#themeSetting").value,defaultDuration:Number($("#defaultDurationSetting").value),weekStart:Number($("#weekStartSetting").value)};applyTheme(data.settings.theme);$("#settingsDialog").close();save("Appearance and scheduling preferences saved")};$("#settingsExport").onclick=exportBackup;$("#settingsImport").onclick=()=>$("#importFile").click();
$("#goalEdit").onclick=()=>{$("#goalInput").value=data.goal;$("#goalDialog").showModal()};$("#goalForm").onsubmit=e=>{e.preventDefault();data.goal=Math.min(100,Math.max(1,Number($("#goalInput").value)));$("#goalDialog").close();save("Weekly goal updated")};$$("[data-close]").forEach(b=>b.onclick=()=>$("#"+b.dataset.close).close());
function exportBackup(){try{const blob=window.DaybookPersistence.exportFile(),a=document.createElement("a"),url=URL.createObjectURL(blob);a.href=url;a.download="daybook-complete-backup-"+iso(today)+".json";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast("Complete backup exported")}catch(error){toast("Backup export failed: "+(error.message||"storage error"))}}
$("#importFile").onchange=async e=>{const file=e.target.files?.[0];if(!file)return;try{const result=await window.DaybookPersistence.importFile(file,message=>confirm(message));if(result.cancelled){toast("Import cancelled; current data was not changed");return}location.reload()}catch(error){toast("Backup rejected: "+(error.message||"invalid data"))}finally{e.target.value=""}};
$("#notify").onclick=async()=>{try{if(window.DaybookNative?.isNative()){const p=await window.DaybookNative.requestPermission();if(p.display==="granted")await window.DaybookNative.syncReminders([...data.reminders,...(window.DaybookPrayer?.getNativeReminders?.()||[])]);const exactNote=p.exactAlarm==="denied"?" (reminders may be delayed)":"";$("#notifyStatus").textContent="Android notifications: "+p.display+" · exact alarm access: "+p.exactAlarm+exactNote;return}if(!("Notification"in window)){$("#notifyStatus").textContent="Notifications are not supported by this browser.";return}const p=await Notification.requestPermission();$("#notifyStatus").textContent="Notification permission: "+p}catch(error){$("#notifyStatus").textContent="Could not enable notifications: "+(error.message||"Please check app permissions.")}};
function showWebReminder(title){const options={body:title,icon:"./icon.svg"};if("serviceWorker"in navigator){navigator.serviceWorker.ready.then(reg=>reg.showNotification("Daybook reminder",options)).catch(()=>{try{new Notification("Daybook reminder",options)}catch{}});return}try{new Notification("Daybook reminder",options)}catch{toast("A reminder could not be displayed")}}
function checkReminders(){if(window.DaybookNative?.isNative())return;if(!("Notification"in window)||Notification.permission!=="granted")return;const now=new Date(),grace=5*60*1000;let changed=false;data.reminders.forEach(r=>{const due=new Date(r.date+"T"+r.time+":00");if(Number.isNaN(due.getTime()))return;const stamp=r.date+"T"+r.time,late=now-due,repeat=r.repeat==="daily"||r.repeat==="weekly",step=r.repeat==="daily"?1:7;if(repeat&&late>grace){const next=new Date(due);while(next<=now)next.setDate(next.getDate()+step);r.date=iso(next);changed=true;return}if(late>=0&&late<=grace&&r.lastFired!==stamp){showWebReminder(r.title);r.lastFired=stamp;if(repeat){const next=new Date(due);while(next<=now)next.setDate(next.getDate()+step);r.date=iso(next)}changed=true}});if(changed){persist();renderReminders()}}
setInterval(checkReminders,15000);
window.addEventListener("storage",e=>{if(e.key&&e.key.startsWith("daybook_"))location.reload()});
window.DaybookUpdateSubjects=names=>{if(Array.isArray(names)){data.subjects=[...new Set(names.filter(x=>typeof x==="string"&&x.trim()).map(x=>x.trim()))];safeWrite("subjects",data.subjects);renderPlanner();renderFocus()}};
render();
let currentDateKey=iso(today);
function refreshDayBoundary(){
 const current=new Date(),key=iso(current);
 if(key===currentDateKey)return;
 today=current;currentDateKey=key;if(weekOffset===0)selectedDay=current.getDay();
 $("#date").textContent=today.toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"}).toUpperCase();
 $("#today").textContent=today.toLocaleDateString("en-US",{month:"short",day:"numeric"});
 render();
}
setInterval(refreshDayBoundary,60000);
setInterval(()=>{if(activeView==="schedule")renderWeek()},60000);
document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible")refreshDayBoundary()});
const syncNativeReminders=()=>{if(!window.DaybookNative?.isNative())return Promise.resolve();const all=[...data.reminders,...(window.DaybookPrayer?.getNativeReminders?.()||[])];const snapshot=JSON.stringify(data.reminders);return window.DaybookNative.syncReminders(all).then(()=>{lastSyncedReminders=snapshot}).catch(()=>toast("Could not sync Android reminders"))};
window.addEventListener("daybook-native-ready",syncNativeReminders);
window.addEventListener("daybook-native-resume",syncNativeReminders);
window.addEventListener("daybook-prayer-updated",syncNativeReminders);
