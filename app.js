"use strict";
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const DAYS=["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const SUBJECTS=["Applied Physics & Electro Mechanical Fundamental","Engineering Mathematics","Islamiat","Functional English","Quantitative Reasoning","Engineering Drawing","Foundation Mathematics"];
let today=new Date();
const uid=()=>Math.random().toString(36).slice(2,10), iso=d=>{const x=new Date(d);return x.getFullYear()+"-"+String(x.getMonth()+1).padStart(2,"0")+"-"+String(x.getDate()).padStart(2,"0")};
const safeRead=(k,f)=>{try{const v=JSON.parse(localStorage.getItem("daybook_"+k));return v===null?f:v}catch{return f}};
const safeSet=(key,value)=>{try{localStorage.setItem(key,typeof value==="string"?value:JSON.stringify(value));return true}catch{return false}};
const safeWrite=(key,value)=>safeSet("daybook_"+key,value);
const safeArray=(k,f=[])=>{const value=safeRead(k,f);return Array.isArray(value)?value.filter(item=>item&&typeof item==="object"&&!Array.isArray(item)):f};
const classSeed=[{day:1,start:"08:05",end:"15:30",subject:"University / campus"},{day:3,start:"08:00",end:"10:30",subject:"University / campus"},{day:4,start:"08:00",end:"13:00",subject:"University / campus"},{day:5,start:"08:00",end:"13:00",subject:"University / campus"}].map(x=>({...x,id:uid()}));
const ROUTINE_VERSION=2;
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
 {time:"21:30",title:"Sleep"}
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
  return days.map(d=>({...r,id:days.length===1&&r.id?String(r.id):uid(),day:d,title:String(r.title).trim()}));
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
 goal:(()=>{const value=Number(safeRead("goal",10));return Number.isFinite(value)&&value>=1&&value<=100?value:10})(),settings:(()=>{const value=safeRead("settings",{timeFormat:"12h"});return value&&typeof value==="object"&&["12h","24h"].includes(value.timeFormat)?value:{timeFormat:"12h"}})()
};
safeWrite("subjects",data.subjects);
safeWrite("routine",data.routine);
safeWrite("routineVersion",ROUTINE_VERSION);
safeWrite("classes",data.classes);
let lastSyncedReminders=JSON.stringify(data.reminders);
let activeView="overview",filter="all",weekOffset=0,edit={type:null,id:null};
const FOCUS_KEY="daybook_focus";
function readFocus(){try{const v=JSON.parse(localStorage.getItem(FOCUS_KEY));return v&&typeof v==="object"?v:null}catch{return null}}
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
 const subject=$("#focusSubject");if(subject){const selected=focusState.subject||data.subjects[0]||"";subject.innerHTML=data.subjects.map(s=>'<option value="'+esc(s)+'" '+(s===selected?"selected":"")+'>'+esc(s)+'</option>').join("")||'<option value="">Add a subject in Study Planner</option>';subject.disabled=!data.subjects.length;subject.onchange=()=>{focusState.subject=subject.value;storeFocus()}}
 $("#focusTimer").textContent=formatTimer(focusState.remaining);
 $("#focusMode").textContent=focusState.mode==="focus"?"Focus session":"Short break";
 $("#focusState").textContent=focusState.running?"IN PROGRESS":"PAUSED";
 $("#focusHint").textContent=focusState.mode==="focus"?"Stay with one task until the timer ends.":"Step away, stretch and rest your eyes.";
 $("#focusStart").textContent=focusState.running?"Pause":"Start "+(focusState.mode==="focus"?"focus":"break");
 const progress=Math.max(0,Math.min(100,(1-focusState.remaining/focusState.duration)*100));$("#focusProgress").style.width=progress+"%";$("#focusProgress").setAttribute("aria-valuenow",String(Math.round(progress)));
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
$("#focusStart").onclick=()=>{
 if(focusState.running){focusState.remaining=Math.max(0,Math.ceil((focusState.endsAt-Date.now())/1000));focusState.running=false;focusState.endsAt=null;storeFocus();renderFocus()}
 else{if(focusState.remaining<=0)focusState.remaining=focusState.duration;focusState.running=true;focusState.endsAt=Date.now()+focusState.remaining*1000;focusState.subject=$("#focusSubject").value||focusState.subject;storeFocus();renderFocus()}
};
$("#focusReset").onclick=()=>{focusState.running=false;focusState.endsAt=null;focusState.duration=focusState.mode==="focus"?1500:300;focusState.remaining=focusState.duration;storeFocus();renderFocus()};
function tickFocus(){if(!focusState.running)return;focusState.remaining=Math.max(0,Math.ceil((focusState.endsAt-Date.now())/1000));if(focusState.remaining===0)finishFocus();else renderFocus()}
setInterval(tickFocus,1000);
function persist(){const saved=["subjects","classes","routine","tasks","sessions","reminders","goal","settings"].every(k=>safeWrite(k,data[k]));if(window.DaybookNative?.isNative()&&JSON.stringify(data.reminders)!==lastSyncedReminders)syncNativeReminders();return saved}
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
 $(".view").forEach(x=>x.classList.toggle("active",x===target));
 $$(".nav").forEach(b=>{const active=b.dataset.view===v;b.classList.toggle("active",active);if(active)b.setAttribute("aria-current","page");else b.removeAttribute("aria-current")});
 $("#heading").textContent=({overview:"Overview",schedule:"Weekly routine",planner:"Study planner",tasks:"Tasks",analytics:"Progress analytics",reminders:"Reminders",academics:"Academic management",habits:"Habits & routines",finance:"Personal finance"})[v]||"Daybook";
 render();
}
$(".nav").forEach(b=>b.addEventListener("click",()=>openView(b.dataset.view)));
$("#openMore")?.addEventListener("click",()=>$("#moreDialog")?.showModal());
$("#closeMore")?.addEventListener("click",()=>$("#moreDialog")?.close());
$$("[data-go]").forEach(b=>b.addEventListener("click",()=>openView(b.dataset.go)));
$("#date").textContent=today.toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"}).toUpperCase();
$("#today").textContent=today.toLocaleDateString("en-US",{month:"short",day:"numeric"});
function rowActions(type,id){return '<button class="small-action" data-edit="'+esc(type)+'" data-id="'+esc(id)+'" aria-label="Edit '+esc(type)+'">Edit</button><button class="small-action danger" data-delete="'+esc(type)+'" data-id="'+esc(id)+'" aria-label="Delete '+esc(type)+'">×</button>'}
function dueMeta(t){if(!t.due)return "";const due=new Date(t.due+"T12:00:00"),todayDate=new Date(iso(today)+"T12:00:00"),days=Math.round((due-todayDate)/86400000);const label=days<0?"Overdue":days===0?"Due today":days===1?"Due tomorrow":"Due "+due.toLocaleDateString("en-US",{month:"short",day:"numeric"});return '<span class="task-due '+(days<0&&!t.done?"is-overdue":days===0?"is-today":"")+'">'+esc(label)+'</span>'}
function taskMarkup(t){return '<div class="row task-row '+(t.done?"completed":"")+'"><input class="check" type="checkbox" aria-label="'+(t.done?"Reopen task: ":"Complete task: ")+esc(t.title)+'" data-task="'+esc(t.id)+'" '+(t.done?"checked":"")+'><div class="grow"><b>'+esc(t.title)+'</b><small>'+esc(t.category||"Personal")+' · '+esc(t.priority||"Normal")+(t.due?" · "+dueMeta(t):"")+(t.notes?" · "+esc(t.notes):"")+'</small></div>'+rowActions("task",t.id)+'</div>'}
function renderWeek(){
 const start=new Date(today);start.setDate(start.getDate()-start.getDay()+weekOffset*7);const end=new Date(start);end.setDate(end.getDate()+6);
 $("#weekLabel").textContent=start.toLocaleDateString("en-US",{month:"short",day:"numeric"})+" – "+end.toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"});
 const days=Array.from({length:7},(_,i)=>{const date=new Date(start);date.setDate(date.getDate()+i);return {day:date.getDay(),date}});
 const columns=days.map(({day})=>[...data.classes.filter(x=>+x.day===day).map(x=>({...x,kind:"class",time:x.start,title:x.subject,detail:fmt(x.start)+" – "+fmt(x.end)+(x.room?" · "+x.room:"")})),...data.routine.filter(x=>+x.day===day).map(x=>({...x,kind:"routine",detail:fmt(x.time)}))].sort((x,y)=>x.time.localeCompare(y.time)));
 $("#classCount").textContent=data.classes.length;$("#routineCount").textContent=data.routine.length;$("#classDays").textContent=new Set(data.classes.map(x=>+x.day)).size;
 const hasSubjectPeriods=data.classes.some(x=>String(x.subject||"").trim()&&x.subject!=="University / campus");$("#classSetupNote").style.display=hasSubjectPeriods?"none":"flex";
 const times=[...new Set(columns.flatMap(items=>items.map(x=>x.time)))].sort((x,y)=>x.localeCompare(y));
 const head='<thead><tr><th scope="col" class="time-heading">Timing</th>'+days.map(({day,date})=>'<th scope="col" class="'+(iso(date)===iso(today)?"is-today":"")+'"><span>'+DAYS[day]+'</span><small>'+date.toLocaleDateString("en-US",{month:"short",day:"numeric"})+'</small></th>').join("")+'</tr></thead>';
 const rows=times.map(time=>'<tr><th scope="row" class="time-cell">'+esc(fmt(time))+'</th>'+columns.map(items=>{const found=items.filter(x=>x.time===time);return '<td>'+(found.length?found.map(x=>'<article class="table-event '+(x.kind==="class"?"table-class":"table-routine")+'"><span class="event-kind">'+(x.kind==="class"?"UNIVERSITY CLASS":"DAILY ROUTINE")+'</span><b>'+esc(x.title)+'</b><small>'+esc(x.detail)+'</small>'+rowActions(x.kind,x.id)+'</article>').join(""):'<span class="empty-slot" aria-hidden="true">—</span>')+'</td>'}).join("")+'</tr>').join("");
 $("#weekGrid").innerHTML='<table class="week-table" aria-label="Weekly timetable with timing and seven days">'+head+'<tbody>'+(rows||'<tr><td colspan="8" class="table-empty">No activities scheduled for this week.</td></tr>')+'</tbody></table>';wireActions();
}
$("#prev").onclick=()=>{weekOffset--;renderWeek()};$("#next").onclick=()=>{weekOffset++;renderWeek()};$("#thisWeek").onclick=()=>{weekOffset=0;renderWeek()};
function renderTasks(){const q=($("#taskSearch")?.value||"").trim().toLowerCase();let list=data.tasks.filter(t=>(filter==="all"||(filter==="done"?t.done:filter==="overdue"?!t.done&&!!t.due&&t.due<iso(today):!t.done))&&(!q||(t.title+" "+t.category+" "+t.notes).toLowerCase().includes(q)));list.sort((a,b)=>Number(a.done)-Number(b.done)||({High:0,Normal:1,Low:2}[a.priority]??1)-({High:0,Normal:1,Low:2}[b.priority]??1)||(a.due||"9999").localeCompare(b.due||"9999"));$("#allTasks").innerHTML=list.map(taskMarkup).join("")||'<div class="empty">No tasks match this view. Add a task to get started.</div>';$$("[data-filter]").forEach(b=>{const selected=b.dataset.filter===filter;b.classList.toggle("selected",selected);b.setAttribute("aria-pressed",String(selected))});wireActions();$$("[data-task]").forEach(e=>e.onchange=()=>{const t=data.tasks.find(x=>String(x.id)===e.dataset.task);if(t){t.done=e.checked;t.completedAt=e.checked?new Date().toISOString():null;save(e.checked?"Task completed":"Task reopened")}})}
function renderPlanner(){$("#subjects").innerHTML=data.subjects.map(s=>'<span class="chip">'+esc(s)+'</span>').join("")||'<span class="muted">Add subjects to start planning.</span>';$("#sessionCount").textContent=data.sessions.length+" sessions";$("#sessions").innerHTML=data.sessions.slice().sort((a,b)=>(a.date||"").localeCompare(b.date||"")).map(s=>'<div class="row '+(s.done?"completed":"")+'"><div class="grow"><b>'+esc(s.subject)+'</b><small>'+esc(s.topic||"Study session")+' · '+esc(s.date)+' · '+s.minutes+' min</small></div>'+'<button class="small-action" data-sessiondone="'+esc(s.id)+'">'+(s.done?"Reopen":"Complete")+'</button>'+rowActions("study",s.id)+'</div>').join("")||'<div class="empty">Plan your first study session.</div>';$$("[data-sessiondone]").forEach(b=>b.onclick=()=>{const s=data.sessions.find(x=>String(x.id)===b.dataset.sessiondone);if(!s)return;s.done=!s.done;s.completedAt=s.done?new Date().toISOString():null;save(s.done?"Study session completed":"Study session reopened")});wireActions()}
function renderReminders(){
 const items=data.reminders.slice().sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time));
 $("#reminderItems").innerHTML=items.map(r=>{
  const schedule=r.repeat==="daily"?"Daily · "+fmt(r.time):r.repeat==="weekly"?"Weekly · "+fmt(r.time):esc(r.date)+" · "+fmt(r.time);
  return '<div class="row"><div class="grow"><b>'+esc(r.title)+'</b><small>'+schedule+'</small></div>'+rowActions("reminder",r.id)+'</div>';
 }).join("")||'<div class="empty">No reminders set.</div>';
 wireActions();
}
function renderAnalytics(){const done=data.tasks.filter(t=>t.done).length,total=data.tasks.length,rate=total?Math.round(done/total*100):0;const thisWeek=new Date(today);thisWeek.setDate(today.getDate()-today.getDay());const weekKey=iso(thisWeek);const nextWeek=new Date(thisWeek);nextWeek.setDate(nextWeek.getDate()+7);const nextWeekKey=iso(nextWeek);const studied=data.sessions.filter(s=>s.done);const weekMinutes=studied.filter(s=>{const completedDate=s.completedAt?iso(new Date(s.completedAt)):s.date;return completedDate>=weekKey&&completedDate<nextWeekKey}).reduce((n,s)=>n+Number(s.minutes||0),0);const allMinutes=studied.reduce((n,s)=>n+Number(s.minutes||0),0);$("#done").textContent=$("#aDone").textContent=done;$("#total").textContent=total+" tasks created";$("#rate").textContent=rate+"%";$("#hours").textContent=$("#aHours").textContent=(allMinutes/60).toFixed(1).replace(/\.0$/,"")+"h";const reminderNow=new Date();$("#reminderCount").textContent=data.reminders.filter(r=>r.repeat==="daily"||r.repeat==="weekly"||new Date(r.date+"T"+r.time+":00")>=reminderNow).length;$("#overdue").textContent=data.tasks.filter(t=>!t.done&&t.due&&t.due<iso(today)).length;$("#aSubjects").textContent=new Set(studied.map(s=>s.subject)).size;$("#progress").style.width=rate+"%";$("#progress").setAttribute("aria-valuenow",String(rate));$("#progressLabel").textContent=rate+"% complete · "+done+" of "+total+" tasks";const goalMins=Number(data.goal)*60;$("#goalValue").textContent=(weekMinutes/60).toFixed(1)+" / "+data.goal+" hours";const goalPercent=Math.min(100,weekMinutes/goalMins*100);$("#goalProgress").style.width=goalPercent+"%";$("#goalProgress").setAttribute("aria-valuenow",String(Math.round(goalPercent)));$("#goalLabel").textContent=Math.max(0,goalMins-weekMinutes)>0?((goalMins-weekMinutes)/60).toFixed(1)+" hours left this week":"Weekly goal reached.";const by={};studied.forEach(s=>by[s.subject]=(by[s.subject]||0)+Number(s.minutes));const max=Math.max(1,...Object.values(by));$("#subjectBars").innerHTML=Object.entries(by).sort((a,b)=>b[1]-a[1]).map(([s,m])=>'<div class="bar"><span>'+esc(s)+'</span><div class="bar-track"><span style="width:'+(m/max*100)+'%"></span></div><small>'+(m/60).toFixed(1)+'h</small></div>').join("")||'<div class="empty">Complete study sessions to see subject progress.</div>'}
function renderNextUp(){const now=new Date(),day=now.getDay(),current=now.getHours()*60+now.getMinutes();const classes=data.classes.filter(c=>+c.day===day).map(c=>({kind:"class",time:c.start,end:c.end,title:c.subject,room:c.room||""}));const routine=data.routine.filter(r=>+r.day===day&&!classes.some(c=>minutes(r.time)>=minutes(c.time)&&minutes(r.time)<minutes(c.end))).map(r=>({kind:"routine",time:r.time,title:r.title}));const active=classes.find(c=>minutes(c.time)<=current&&current<minutes(c.end));const upcoming=[...classes,...routine].filter(x=>minutes(x.time)>current).sort((a,b)=>a.time.localeCompare(b.time));const el=$("#nextUp");if(active){el.innerHTML='<div class="next-up-status"><span class="status-dot"></span>HAPPENING NOW</div><h3>'+esc(active.title)+'</h3><p>Started '+fmt(active.time)+' · Ends '+fmt(active.end)+(active.room?' · '+esc(active.room):'')+'</p>'}else if(upcoming.length){const item=upcoming[0];el.innerHTML='<div class="next-up-status">UP NEXT</div><h3>'+esc(item.title)+'</h3><p>'+fmt(item.time)+(item.end?' – '+fmt(item.end):'')+(item.room?' · '+esc(item.room):'')+'</p>'}else{el.innerHTML='<div class="next-up-status">DAY COMPLETE</div><h3>No more scheduled activities</h3><p>You have no remaining timetable or routine items today.</p>'}}
function render(){renderFocus();renderNextUp();const todayItems=[...data.classes.filter(c=>+c.day===today.getDay()).map(c=>({time:c.start,end:c.end,title:c.subject,kind:"class",room:c.room||""})),...data.routine.filter(r=>+r.day===today.getDay()).map(r=>({time:r.time,title:r.title,kind:"routine"}))].sort((a,b)=>a.time.localeCompare(b.time));$("#todayClasses").innerHTML=todayItems.map(item=>'<div class="row"><span class="time">'+fmt(item.time)+'</span><div class="grow"><b>'+esc(item.title)+'</b><small>'+(item.kind==="class"?"Class · "+fmt(item.end)+(item.room?" · "+esc(item.room):""):"Routine activity")+'</small></div></div>').join("")||'<div class="empty">No activities scheduled for today.</div>';const open=data.tasks.filter(t=>!t.done).sort((a,b)=>(a.due||"9999").localeCompare(b.due||"9999"));$("#priority").innerHTML=open.slice(0,4).map(taskMarkup).join("")||'<div class="empty">No pending tasks.</div>';wireActions();renderWeek();renderTasks();renderPlanner();renderReminders();renderAnalytics()}
function wireActions(){$$("[data-edit]").forEach(b=>b.onclick=()=>openEditor(b.dataset.edit,b.dataset.id));$$("[data-delete]").forEach(b=>b.onclick=()=>removeItem(b.dataset.delete,b.dataset.id))}
function removeItem(type,id){const key=({class:"classes",routine:"routine",task:"tasks",study:"sessions",reminder:"reminders"})[type];if(!key)return;if(!confirm("Delete this "+type+"?"))return;data[key]=data[key].filter(x=>String(x.id)!==String(id));save("Deleted")}
function field(label,name,kind="text",value="",extra=""){const optional=extra==="optional";return '<div class="field"><label for="'+esc(name)+'">'+esc(label)+'</label><input id="'+esc(name)+'" name="'+esc(name)+'" type="'+kind+'" value="'+esc(value)+'" '+(optional?"":extra)+(optional?"":" required")+'></div>'}
function selectField(label,name,options,value){return '<div class="field"><label for="'+esc(name)+'">'+esc(label)+'</label><select id="'+esc(name)+'" name="'+esc(name)+'" required>'+options.map(o=>'<option value="'+esc(o.value)+'" '+(o.value===String(value)?"selected":"")+'>'+esc(o.label)+'</option>').join("")+'</select></div>'}
function openEditor(type,id=null){edit={type,id};const old=id?data[({class:"classes",routine:"routine",task:"tasks",study:"sessions",reminder:"reminders"})[type]].find(x=>String(x.id)===String(id))||{}:{};let title="",body="";const subjectOpts=[...new Set([...data.subjects,...(old.subject?[old.subject]:[])])].map(s=>({value:s,label:s}));if(type==="class"){title=id?"Edit class":"Add university class";body=selectField("Subject","subject",subjectOpts,old.subject||data.subjects[0]||"")+selectField("Day","day",DAYS.map((d,i)=>({value:String(i),label:d})),String(old.day??1))+'<div class="two">'+field("Start time","start","time",old.start||"08:00")+field("End time","end","time",old.end||"09:00")+'</div>'+field("Room / location (optional)","room","text",old.room||"","optional")}
if(type==="routine"){title=id?"Edit routine item":"Add routine item";body=field("Activity","title","text",old.title||"")+'<div class="two">'+selectField("Day","day",DAYS.map((d,i)=>({value:String(i),label:d})),String(old.day??today.getDay()))+field("Time","time","time",old.time||"07:00")+'</div>'}
if(type==="task"){title=id?"Edit task":"Add task";body=field("Task name","title","text",old.title||"")+selectField("Category","category",["Assignment","Revision","University","Personal","Project","Other"].map(x=>({value:x,label:x})),old.category||"Assignment")+selectField("Priority","priority",["High","Normal","Low"].map(x=>({value:x,label:x})),old.priority||"Normal")+field("Due date (optional)","due","date",old.due||"","optional")+field("Notes (optional)","notes","text",old.notes||"","optional")}
if(type==="study"){title=id?"Edit study session":"Plan study session";body=selectField("Subject","subject",subjectOpts,old.subject||data.subjects[0]||"")+field("Topic / goal (optional)","topic","text",old.topic||"","optional")+field("Date","date","date",old.date||iso(today))+field("Duration (minutes)","minutes","number",old.minutes||60,'min="1" max="1440"')}
if(type==="reminder"){title=id?"Edit reminder":"Add reminder";body=field("Reminder","title","text",old.title||"")+field("Date","date","date",old.date||iso(today))+field("Time","time","time",old.time||"19:00")+selectField("Repeat","repeat",[{value:"none",label:"Does not repeat"},{value:"daily",label:"Daily"},{value:"weekly",label:"Weekly"}],old.repeat||"none")}
$("#dialogTitle").textContent=title;$("#fields").innerHTML=body;$("#editor").showModal()}
$$("[data-add]").forEach(b=>b.onclick=()=>openEditor(b.dataset.add));
$("#close").onclick=$("#cancel").onclick=()=>$("#editor").close();
$("#form").onsubmit=e=>{e.preventDefault();const v=Object.fromEntries(new FormData(e.target).entries());const type=edit.type,id=edit.id;let key=({class:"classes",routine:"routine",task:"tasks",study:"sessions",reminder:"reminders"})[type];const validDate=s=>/^\d{4}-\d{2}-\d{2}$/.test(s)&&!Number.isNaN(new Date(s+"T12:00:00").getTime())&&iso(new Date(s+"T12:00:00"))===s;const validTime=s=>/^([01]\d|2[0-3]):[0-5]\d$/.test(s);if(["task","routine","reminder"].includes(type))v.title=(v.title||"").trim();if(type==="class"){v.subject=(v.subject||"").trim();if(!v.subject||!validTime(v.start)||!validTime(v.end)){toast("Enter a subject and valid start/end times");return}v.day=+v.day;if(!Number.isInteger(v.day)||v.day<0||v.day>6){toast("Choose a valid day");return}if(minutes(v.end)<=minutes(v.start)){toast("End time must be after start time");return}const clash=data.classes.some(c=>c.id!==id&&+c.day===v.day&&minutes(v.start)<minutes(c.end)&&minutes(v.end)>minutes(c.start));if(clash&&!confirm("This class overlaps another class. Save anyway?"))return}
if(type==="routine"){if(!v.title||!validTime(v.time)){toast("Enter an activity and a valid time");return}v.day=+v.day;if(!Number.isInteger(v.day)||v.day<0||v.day>6){toast("Choose a valid day");return}const clash=data.routine.some(r=>r.id!==id&&+r.day===v.day&&r.time===v.time);if(clash){toast("There is already an activity at this time");return}}
if(type==="task"&&!v.title){toast("Enter a task name");return}if(type==="reminder"&&(!v.title||!validDate(v.date)||!validTime(v.time))){toast("Enter a reminder, valid date and valid time");return}if(type==="study"){v.subject=(v.subject||"").trim();v.topic=(v.topic||"").trim();const mins=Number(v.minutes);if(!v.subject||!validDate(v.date)||!Number.isInteger(mins)||mins<1||mins>1440){toast("Enter a subject, valid date and duration from 1 to 1440 minutes");return}v.minutes=mins}
if(id){const i=data[key].findIndex(x=>String(x.id)===String(id));data[key][i]={...data[key][i],...v}}else data[key].push({id:uid(),...v,done:false,createdAt:new Date().toISOString()});$("#editor").close();save(id?"Changes saved":"Added successfully")};
$("#taskSearch").addEventListener("input",renderTasks);$$("[data-filter]").forEach(b=>b.onclick=()=>{filter=b.dataset.filter;renderTasks()});
$("#manageSubjects").onclick=()=>{renderSubjectManager();$("#manageDialog").showModal()};$("#manageClose").onclick=()=>$("#manageDialog").close();$("#manageForm").onsubmit=e=>{e.preventDefault();$("#addSubject").click()};
function renderSubjectManager(){$("#subjectList").innerHTML=data.subjects.map((s,i)=>'<div class="row"><span class="grow">'+esc(s)+'</span><button class="small-action danger" data-subjectdel="'+i+'">Remove</button></div>').join("");$$("[data-subjectdel]").forEach(b=>b.onclick=()=>{const s=data.subjects[+b.dataset.subjectdel];if(data.classes.some(x=>x.subject===s)||data.sessions.some(x=>x.subject===s)){if(!confirm("This subject is used in your timetable or study history. Remove it anyway?"))return}data.subjects.splice(+b.dataset.subjectdel,1);persist();renderSubjectManager();render()})}
$("#addSubject").onclick=e=>{e.preventDefault();const v=$("#newSubject").value.trim();if(!v)return;if(data.subjects.some(s=>s.toLowerCase()===v.toLowerCase())){toast("Subject already exists");return}data.subjects.push(v);window.dispatchEvent(new CustomEvent("daybook-subjects-updated",{detail:data.subjects.slice()}));$("#newSubject").value="";persist();renderSubjectManager();render();toast("Subject added")};
$("#settingsBtn").onclick=()=>{$("#timeFormatSetting").value=data.settings.timeFormat||"12h";$("#settingsDialog").showModal()};$("#settingsForm").onsubmit=e=>{e.preventDefault();data.settings={...data.settings,timeFormat:$("#timeFormatSetting").value};$("#settingsDialog").close();save("Settings saved")};$("#settingsExport").onclick=exportBackup;$("#settingsImport").onclick=()=>$("#importFile").click();
$("#goalEdit").onclick=()=>{$("#goalInput").value=data.goal;$("#goalDialog").showModal()};$("#goalForm").onsubmit=e=>{e.preventDefault();data.goal=Math.min(100,Math.max(1,Number($("#goalInput").value)));$("#goalDialog").close();save("Weekly goal updated")};$$("[data-close]").forEach(b=>b.onclick=()=>$("#"+b.dataset.close).close());
function exportBackup(){persist();const blob=new Blob([JSON.stringify({app:"Daybook",version:1,exportedAt:new Date().toISOString(),data},null,2)],{type:"application/json"});const a=document.createElement("a");const url=URL.createObjectURL(blob);a.href=url;a.download="daybook-backup-"+iso(today)+".json";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast("Backup exported")}
function validateBackup(parsed){
 if(!parsed||typeof parsed!=="object"||Array.isArray(parsed))throw new Error("Invalid backup structure");
 const incoming=parsed.data&&typeof parsed.data==="object"?parsed.data:parsed;
 const keys=["subjects","classes","routine","tasks","sessions","reminders"];
 if(!keys.some(k=>Object.prototype.hasOwnProperty.call(incoming,k)))throw new Error("No Daybook data found");
 const result={};
 for(const key of keys){
  if(!Object.prototype.hasOwnProperty.call(incoming,key))continue;
  if(!Array.isArray(incoming[key]))throw new Error("Invalid "+key+" data");
  const seenIds=new Set();
  result[key]=incoming[key].map((item,index)=>{
   if(key==="subjects"){if(typeof item!=="string"||!item.trim())throw new Error("Invalid subject");return item.trim()}
   if(!item||typeof item!=="object"||Array.isArray(item))throw new Error("Invalid "+key+" entry "+(index+1));
   const copy={...item};
   if(!copy.id)copy.id=uid();
   if(typeof copy.id!=="string"&&typeof copy.id!=="number")throw new Error("Invalid record ID");
   copy.id=String(copy.id);
   if(seenIds.has(copy.id))throw new Error("Duplicate record ID in "+key);
   seenIds.add(copy.id);
   if(["tasks","routine","reminders"].includes(key)&&(!String(copy.title||"").trim()))throw new Error("A "+key+" entry has no title");
   if(key==="classes"&&(!String(copy.subject||"").trim()||!Number.isInteger(Number(copy.day))||Number(copy.day)<0||Number(copy.day)>6||!/^([01]\d|2[0-3]):[0-5]\d$/.test(copy.start||"")||!/^([01]\d|2[0-3]):[0-5]\d$/.test(copy.end||"")||minutes(copy.end)<=minutes(copy.start)))throw new Error("Invalid class entry");
   if(key==="routine"&&(copy.day!==undefined&&(!Number.isInteger(Number(copy.day))||Number(copy.day)<0||Number(copy.day)>6)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(copy.time||"")))throw new Error("Invalid routine entry");
   if(["sessions","reminders"].includes(key)&&(!/^\d{4}-\d{2}-\d{2}$/.test(copy.date||"")||iso(new Date(copy.date+"T12:00:00"))!==copy.date))throw new Error("Invalid date in "+key);
   if(key==="sessions"&&(!String(copy.subject||"").trim()||!Number.isInteger(Number(copy.minutes))||Number(copy.minutes)<1||Number(copy.minutes)>1440))throw new Error("Invalid study session");
   if(key==="reminders"&&(!/^([01]\d|2[0-3]):[0-5]\d$/.test(copy.time||"")||!["none","daily","weekly",undefined].includes(copy.repeat)))throw new Error("Invalid reminder");
   if(key==="tasks"&&copy.due&&(!/^\d{4}-\d{2}-\d{2}$/.test(copy.due)||iso(new Date(copy.due+"T12:00:00"))!==copy.due))throw new Error("Invalid task due date");
   return copy;
  });
  if(key==="routine")result[key]=result[key].flatMap(item=>item.day===undefined?DAYS.map((_,day)=>({...item,id:uid(),day})): [item]);
 }
 if(incoming.goal!==undefined&&(!Number.isFinite(Number(incoming.goal))||Number(incoming.goal)<1||Number(incoming.goal)>100))throw new Error("Invalid weekly goal");
 if(incoming.settings!==undefined&&(!incoming.settings||typeof incoming.settings!=="object"||!["12h","24h"].includes(incoming.settings.timeFormat)))throw new Error("Invalid settings");
 return {incoming,result};
}
$("#importFile").onchange=async e=>{const file=e.target.files[0];if(!file)return;try{if(file.size>5*1024*1024)throw new Error("Backup file is larger than 5 MB");const parsed=JSON.parse(await file.text());const {incoming,result}=validateBackup(parsed);if(!confirm("Import this backup and replace matching Daybook data currently stored on this device?"))return;Object.assign(data,result);if(incoming.goal!==undefined)data.goal=Number(incoming.goal);if(incoming.settings)data.settings={...data.settings,...incoming.settings};save("Backup imported")}catch(err){toast(err.message==="Backup file is larger than 5 MB"?err.message:"Backup rejected: "+(err.message||"invalid data"))}finally{e.target.value=""}};
$("#notify").onclick=async()=>{try{if(window.DaybookNative?.isNative()){const p=await window.DaybookNative.requestPermission();if(p.display==="granted")await window.DaybookNative.syncReminders(data.reminders);const exactNote=p.exactAlarm==="denied"?" (reminders may be delayed)":"";$("#notifyStatus").textContent="Android notifications: "+p.display+" · exact alarm access: "+p.exactAlarm+exactNote;return}if(!("Notification"in window)){$("#notifyStatus").textContent="Notifications are not supported by this browser.";return}const p=await Notification.requestPermission();$("#notifyStatus").textContent="Notification permission: "+p}catch(error){$("#notifyStatus").textContent="Could not enable notifications: "+(error.message||"Please check app permissions.")}};
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
 today=current;currentDateKey=key;
 $("#date").textContent=today.toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"}).toUpperCase();
 $("#today").textContent=today.toLocaleDateString("en-US",{month:"short",day:"numeric"});
 render();
}
setInterval(refreshDayBoundary,60000);
document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible")refreshDayBoundary()});
const syncNativeReminders=()=>{if(!window.DaybookNative?.isNative())return Promise.resolve();const snapshot=JSON.stringify(data.reminders);return window.DaybookNative.syncReminders(data.reminders).then(()=>{lastSyncedReminders=snapshot}).catch(()=>toast("Could not sync Android reminders"))};
window.addEventListener("daybook-native-ready",syncNativeReminders);
window.addEventListener("daybook-native-resume",syncNativeReminders);
