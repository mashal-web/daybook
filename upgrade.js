(()=>{"use strict";
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const read=(k,f)=>{try{const v=JSON.parse(localStorage.getItem("daybook_"+k));return v===null?f:v}catch{return f}};
const write=(k,v)=>{try{localStorage.setItem("daybook_"+k,JSON.stringify(v));return true}catch{return false}};
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const keyDate=d=>{const x=new Date(d);return x.getFullYear()+"-"+String(x.getMonth()+1).padStart(2,"0")+"-"+String(x.getDate()).padStart(2,"0")};
const today=()=>keyDate(new Date()),money=n=>"PKR "+Number(n||0).toLocaleString("en-PK",{maximumFractionDigits:0});
const id=()=>crypto.randomUUID?crypto.randomUUID():Date.now().toString(36)+Math.random().toString(36).slice(2,8);
const toast=s=>{const t=$("#toast");if(t){t.textContent=s;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),2200)}};
let courses=read("academic_courses",null);
if(!Array.isArray(courses)){courses=(Array.isArray(read("subjects",[]))?read("subjects",[]):[]).map(name=>({id:id(),name,code:"",credits:0}));write("academic_courses",courses)}
let assessments=read("academic_assessments",[]);if(!Array.isArray(assessments))assessments=[];
let habits=read("habits",null);
if(!Array.isArray(habits)){habits=[["Fajr prayer","Faith"],["Tilawat","Faith"],["Morning exercise","Wellbeing"],["Focused study","Study"],["Maghrib tilawat","Faith"],["Sleep by 9:30 PM","Wellbeing"]].map(([name,category])=>({id:id(),name,category}));write("habits",habits)}
let checks=read("habit_checks",{});if(!checks||typeof checks!=="object"||Array.isArray(checks))checks={};
let finance=read("finance",{budget:0,transactions:[]});if(!finance||typeof finance!=="object"||!Array.isArray(finance.transactions))finance={budget:0,transactions:[]};
let agendaMode="week";
function persist(){const ok=[["academic_courses",courses],["academic_assessments",assessments],["habits",habits],["habit_checks",checks],["finance",finance]].every(([k,v])=>write(k,v));if(!ok)toast("Storage is full. Export a backup and free device space.");return ok}
function stat(label,value,sub){return '<div class="upgrade-stat"><small>'+label+'</small><strong>'+value+'</strong><span>'+sub+'</span></div>'}
function renderAcademics(){
 const stats=$("#academicStats");if(!stats)return;
 const pending=assessments.filter(x=>!x.done).length,overdue=assessments.filter(x=>!x.done&&x.due<today()).length;
 stats.innerHTML=stat("COURSES",courses.length,"Registered subjects")+stat("PENDING WORK",pending,"Assessments to complete")+stat("OVERDUE",overdue,"Past due assessments");
 const select=$("#assessmentCourse");select.innerHTML=courses.map(c=>'<option value="'+esc(c.name)+'">'+esc(c.name)+'</option>').join("")||'<option value="">Add a course first</option>';
 $("#courseList").innerHTML=courses.map(c=>'<div class="upgrade-item"><div class="item-main"><b>'+esc(c.name)+'</b><small>'+esc(c.code||"Course")+(c.credits?" · "+c.credits+" credits":"")+'</small></div><button data-course-delete="'+esc(c.id)+'" type="button">'+window.daybookIcon("trash")+'<span>Remove</span></button></div>').join("")||'<p class="muted">Add your semester courses to begin.</p>';
 $("#assessmentList").innerHTML=assessments.slice().sort((a,b)=>a.due.localeCompare(b.due)).map(a=>'<div class="upgrade-item"><div class="item-main"><b>'+esc(a.title)+'</b><small>'+esc(a.kind)+' · '+esc(a.course)+' · Due '+esc(a.due)+'</small></div><button type="button" data-assessment-toggle="'+esc(a.id)+'">'+(a.done?window.daybookIcon("rotate")+'<span>Reopen</span>':window.daybookIcon("check")+'<span>Complete</span>')+'</button><button type="button" class="icon-action danger" data-assessment-delete="'+esc(a.id)+'" aria-label="Delete assessment" title="Delete">'+window.daybookIcon("trash")+'</button></div>').join("")||'<p class="muted">No assessments yet. Add an assignment, quiz or exam.</p>';
}
function streakFor(hid){let n=0,d=new Date();for(let i=0;i<366;i++){const k=keyDate(d);if((checks[k]||[]).includes(hid)){n++;d.setDate(d.getDate()-1)}else if(i===0){d.setDate(d.getDate()-1)}else break}return n}
function renderHabits(){
 if(!$("#habitList"))return;const day=today(),done=checks[day]||[],rate=habits.length?Math.round(done.filter(x=>habits.some(h=>h.id===x)).length/habits.length*100):0;
 $("#habitDate").textContent=new Date().toLocaleDateString("en",{weekday:"long",month:"short",day:"numeric"});
 $("#habitProgress").textContent=done.length+"/"+habits.length+" COMPLETE";
 $("#habitStats").innerHTML=stat("TODAY",rate+"%","Habit completion")+stat("COMPLETED",done.length,"Today's check-ins")+stat("ACTIVE HABITS",habits.length,"Your daily commitments");
 $("#habitList").innerHTML=habits.map(h=>{const checked=done.includes(h.id);return '<div class="habit-card '+(checked?"done":"")+'"><input class="habit-check" type="checkbox" data-habit-check="'+esc(h.id)+'" '+(checked?"checked":"")+' aria-label="Mark '+esc(h.name)+' complete"><div class="item-main"><b>'+esc(h.name)+'</b><small>'+esc(h.category)+' · '+streakFor(h.id)+' day streak</small></div><button type="button" data-habit-delete="'+esc(h.id)+'" aria-label="Remove '+esc(h.name)+'" title="Remove">'+window.daybookIcon("trash")+'</button></div>'}).join("")||'<p class="muted">Add a habit to start building consistency.</p>';
}
function monthTransactions(){const month=today().slice(0,7);return finance.transactions.filter(t=>t.date.slice(0,7)===month)}
function renderFinance(){
 if(!$("#financeStats"))return;const tx=monthTransactions(),spent=tx.filter(t=>t.type==="expense").reduce((n,t)=>n+t.amount,0),income=tx.filter(t=>t.type==="income").reduce((n,t)=>n+t.amount,0),remaining=finance.budget?finance.budget-spent:0;
 $("#financeStats").innerHTML=stat("MONTHLY SPENDING",money(spent),"Expenses this month")+stat("INCOME",money(income),"Income this month")+stat("AVAILABLE",finance.budget?money(remaining):"—",finance.budget?"Budget minus expenses":"Set a monthly budget");
 $("#monthlyBudget").value=finance.budget||"";const pct=finance.budget?Math.min(100,Math.max(0,spent/finance.budget*100)):0;$("#budgetFill").style.width=pct+"%";$("#budgetCaption").textContent=finance.budget?money(spent)+" spent of "+money(finance.budget)+" · "+(remaining>=0?money(remaining)+" remaining":money(-remaining)+" over budget"):"Set a budget to see your monthly spending progress.";
 $("#transactionList").innerHTML=finance.transactions.slice().sort((a,b)=>b.date.localeCompare(a.date)).slice(0,30).map(t=>'<div class="upgrade-item"><div class="item-main"><b>'+esc(t.note||t.category)+'</b><small>'+esc(t.category)+' · '+esc(t.date)+'</small></div><b class="'+(t.type==="income"?"finance-positive":"finance-negative")+'">'+(t.type==="income"?"+":"−")+money(t.amount)+'</b><button type="button" data-transaction-delete="'+esc(t.id)+'" aria-label="Delete transaction" title="Delete">'+window.daybookIcon("trash")+'</button></div>').join("")||'<p class="muted">No transactions recorded yet.</p>';
}
function renderInsights(){
 const host=$("#upgradeInsights");if(!host)return;const d=new Date(),done=checks[today()]||[],week=[];for(let i=0;i<7;i++){const x=new Date(d);x.setDate(d.getDate()-i);week.push(checks[keyDate(x)]||[])}
 const possible=habits.length*7,completed=week.reduce((n,a)=>n+a.filter(x=>habits.some(h=>h.id===x)).length,0),habitRate=possible?Math.round(completed/possible*100):0;
 const month=monthTransactions(),spend=month.filter(t=>t.type==="expense").reduce((n,t)=>n+t.amount,0);
 host.innerHTML='<div class="upgrade-stats">'+stat("7-DAY HABIT RATE",habitRate+"%","Completed habit check-ins")+stat("THIS MONTH",money(spend),"Recorded expenses")+stat("TODAY'S HABITS",done.length+"/"+habits.length,"Completed check-ins")+'</div>';
}
function renderAgenda(){
 const host=$("#scheduleAgenda");if(!host)return;const engine=window.DaybookSchedule;if(!engine)return;const fmt=t=>{if(!t)return "";const [h,m]=t.split(":").map(Number);return (h%12||12)+":"+String(m).padStart(2,"0")+" "+(h>=12?"PM":"AM")};
 const items=engine.getForDate(new Date()).map(x=>({time:x.time,title:x.title,detail:(x.type==="class"?"University":x.category||"Personal")+" · "+fmt(x.time)+(x.end?" – "+fmt(x.end):"")+(x.location?" · "+x.location:"")}));
 host.innerHTML=items.map(x=>'<div class="agenda-row"><span class="agenda-time">'+fmt(x.time)+'</span><div><b>'+esc(x.title)+'</b><small>'+esc(x.detail)+'</small></div></div>').join("")||'<p class="muted">Nothing scheduled today.</p>';
}
function renderSmartPlan(){
 const host=$("#smartPlan");if(!host)return;const tasks=read("tasks",[]).filter(t=>!t.done).sort((a,b)=>({High:0,Normal:1,Low:2}[a.priority]??1)-({High:0,Normal:1,Low:2}[b.priority]??1)||(a.due||"9999").localeCompare(b.due||"9999")).slice(0,4);
 const busy=(window.DaybookSchedule?.getForDate(new Date())||[]).slice().sort((a,b)=>a.time.localeCompare(b.time)).map(x=>[x.time,x.end,x.durationMinutes]);
 const gaps=[];let cursor=480;for(let i=0;i<busy.length;i++){const [s,e,duration]=busy[i],start=toMin(s),next=busy[i+1],end=e&&Number.isFinite(duration)?start+duration:next?Math.max(start,toMin(next[0])):1320;if(start-cursor>=45)gaps.push([cursor,start]);cursor=Math.max(cursor,end)}if(1320-cursor>=45)gaps.push([cursor,1320]);
 const suggestions=gaps.filter(g=>g[1]-g[0]>=45).slice(0,3).map(([a,b])=>'<div class="agenda-row"><span class="agenda-time">'+fromMin(a)+' – '+fromMin(b)+'</span><div><b>Available focus window</b><small>'+Math.floor((b-a)/60)+'h '+((b-a)%60)+'m available</small></div></div>').join("");
 host.innerHTML='<div class="upgrade-columns"><div><p class="label">PRIORITY QUEUE</p><div class="upgrade-list">'+(tasks.map(t=>'<div class="upgrade-item"><div class="item-main"><b>'+esc(t.title)+'</b><small>'+esc(t.priority||"Normal")+(t.due?" · Due "+esc(t.due):"")+'</small></div></div>').join("")||'<p class="muted">No pending tasks. Add tasks to receive planning suggestions.</p>')+'</div></div><div><p class="label">TODAY\'S OPEN WINDOWS</p><div class="upgrade-list">'+(suggestions||'<p class="muted">No clear 45-minute window found in the current timetable.</p>')+'</div></div></div>';
}
function toMin(t){const [h,m]=String(t||"00:00").split(":").map(Number);return h*60+m}function fromMin(n){return String(Math.floor(n/60)).padStart(2,"0")+":"+String(n%60).padStart(2,"0")}function addMinutes(t,n){return fromMin(toMin(t)+n)}
function renderAll(){renderAcademics();renderHabits();renderFinance();renderInsights();renderAgenda();renderSmartPlan()}
$("#courseForm")?.addEventListener("submit",e=>{e.preventDefault();const f=new FormData(e.currentTarget),name=String(f.get("name")||"").trim();if(!name)return;if(courses.some(c=>c.name.toLowerCase()===name.toLowerCase()))return toast("Course already exists");courses.push({id:id(),name,code:String(f.get("code")||"").trim(),credits:Number(f.get("credits")||0)});write("subjects",[...new Set([...read("subjects",[]),name])]);window.DaybookUpdateSubjects?.(read("subjects",[]));e.currentTarget.reset();persist();renderAll();toast("Course added")});
$("#assessmentForm")?.addEventListener("submit",e=>{e.preventDefault();const f=new FormData(e.currentTarget);if(!courses.length)return toast("Add a course first");assessments.push({id:id(),title:String(f.get("title")).trim(),course:f.get("course"),kind:f.get("kind"),due:f.get("due"),done:false});e.currentTarget.reset();persist();renderAll();toast("Assessment added")});
$("#habitForm")?.addEventListener("submit",e=>{e.preventDefault();const f=new FormData(e.currentTarget),name=String(f.get("name")||"").trim();if(!name)return;if(habits.some(h=>h.name.toLowerCase()===name.toLowerCase()))return toast("Habit already exists");habits.push({id:id(),name,category:f.get("category")});e.currentTarget.reset();persist();renderAll();toast("Habit added")});
$("#habitList")?.addEventListener("change",e=>{const input=e.target.closest("[data-habit-check]");if(!input)return;const day=today(),arr=new Set(checks[day]||[]);input.checked?arr.add(input.dataset.habitCheck):arr.delete(input.dataset.habitCheck);checks[day]=[...arr];persist();renderAll()});
document.addEventListener("click",e=>{
 const b=e.target.closest("button");if(!b)return;
 if(b.dataset.courseDelete){if(!confirm("Remove this course from the academic register?"))return;const removed=courses.find(c=>c.id===b.dataset.courseDelete);courses=courses.filter(c=>c.id!==b.dataset.courseDelete);if(removed){const names=read("subjects",[]).filter(n=>n!==removed.name);write("subjects",names);window.DaybookUpdateSubjects?.(names)}persist();renderAll()}
 if(b.dataset.assessmentToggle){const a=assessments.find(x=>x.id===b.dataset.assessmentToggle);if(a)a.done=!a.done;persist();renderAll()}
 if(b.dataset.assessmentDelete){assessments=assessments.filter(x=>x.id!==b.dataset.assessmentDelete);persist();renderAll()}
 if(b.dataset.habitDelete){habits=habits.filter(x=>x.id!==b.dataset.habitDelete);persist();renderAll()}
 if(b.dataset.transactionDelete){finance.transactions=finance.transactions.filter(x=>x.id!==b.dataset.transactionDelete);persist();renderAll()}
 if(b.id==="clearFinance"&&confirm("Delete all transaction history?")){finance.transactions=[];persist();renderAll()}
 if(b.dataset.scheduleMode){agendaMode=b.dataset.scheduleMode;$$("[data-schedule-mode]").forEach(x=>x.classList.toggle("active",x===b));$("#weekGrid").hidden=agendaMode!=="week";$("#scheduleAgenda").hidden=agendaMode!=="agenda";renderAgenda()}
});
$("#budgetForm")?.addEventListener("submit",e=>{e.preventDefault();finance.budget=Math.max(0,Number(new FormData(e.currentTarget).get("budget")||0));persist();renderAll();toast("Budget saved")});
$("#financeForm")?.addEventListener("submit",e=>{e.preventDefault();const f=new FormData(e.currentTarget),amount=Number(f.get("amount")),date=String(f.get("date")||"");if(!Number.isFinite(amount)||amount<=0||!/^\d{4}-\d{2}-\d{2}$/.test(date))return toast("Enter a valid amount and date");finance.transactions.push({id:id(),type:f.get("type"),category:f.get("category"),amount,note:String(f.get("note")||"").trim(),date});e.currentTarget.reset();e.currentTarget.elements.date.value=today();persist();renderAll();toast("Transaction saved")});
const mode=document.createElement("div");mode.className="schedule-mode";mode.innerHTML='<button type="button" class="active" data-schedule-mode="week">'+window.daybookIcon("calendar")+'<span>Weekly grid</span></button><button type="button" data-schedule-mode="agenda">'+window.daybookIcon("task")+'<span>Today agenda</span></button>';
const grid=$("#weekGrid");if(grid){grid.parentElement.insertBefore(mode,grid);const agenda=document.createElement("div");agenda.id="scheduleAgenda";agenda.className="agenda-list";agenda.hidden=true;grid.parentElement.appendChild(agenda)}
const insight=document.createElement("article");insight.id="upgradeInsights";insight.className="panel upgrade-panel";insight.innerHTML='<div class="panel-head"><h3>Life & habit overview</h3><span class="live-tag">LAST 7 DAYS</span></div>';$("#analytics")?.appendChild(insight);
const smart=document.createElement("article");smart.id="smartPlan";smart.className="panel upgrade-panel";smart.innerHTML='<div class="panel-head"><div><p class="label">DAYBOOK INTELLIGENCE</p><h3>Suggested plan for today</h3></div><span class="live-tag">LOCAL RULES</span></div>';$("#overview")?.appendChild(smart);
const exportBtn=$("#settingsExport"),importInput=$("#importFile");
if(exportBtn)exportBtn.onclick=()=>{const base={};["subjects","classes","routine","tasks","sessions","reminders","goal","settings"].forEach(k=>base[k]=read(k,k==="goal"?10:[]));const backup={app:"Daybook",version:2,exportedAt:new Date().toISOString(),data:base,extensions:{academic_courses:courses,academic_assessments:assessments,habits,habit_checks:checks,finance}};const blob=new Blob([JSON.stringify(backup,null,2)],{type:"application/json"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="daybook-complete-backup-"+today()+".json";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast("Complete backup exported")};
if(importInput){const oldHandler=importInput.onchange;importInput.onchange=async e=>{const file=e.target.files?.[0];if(!file)return;let parsed;try{parsed=JSON.parse(await file.text())}catch{}let accepted=false;const originalConfirm=window.confirm;window.confirm=message=>{accepted=originalConfirm(message);return accepted};try{if(oldHandler)await oldHandler.call(importInput,e)}finally{window.confirm=originalConfirm}if(!accepted||!parsed?.extensions)return;const x=parsed.extensions;if(Array.isArray(x.academic_courses)&&x.academic_courses.every(c=>c&&typeof c.name==="string"&&typeof c.id==="string"))courses=x.academic_courses;if(Array.isArray(x.academic_assessments)&&x.academic_assessments.every(a=>a&&typeof a.title==="string"))assessments=x.academic_assessments;if(Array.isArray(x.habits)&&x.habits.every(h=>h&&typeof h.name==="string"&&typeof h.id==="string"))habits=x.habits;if(x.habit_checks&&typeof x.habit_checks==="object"&&!Array.isArray(x.habit_checks))checks=x.habit_checks;if(x.finance&&Array.isArray(x.finance.transactions)&&Number.isFinite(Number(x.finance.budget)))finance={budget:Math.max(0,Number(x.finance.budget)),transactions:x.finance.transactions.filter(t=>t&&Number.isFinite(Number(t.amount))&&Number(t.amount)>0&&["expense","income"].includes(t.type)&&/^\\d{4}-\\d{2}-\\d{2}$/.test(t.date||""))};persist();window.DaybookUpdateSubjects?.(read("subjects",[]));renderAll();toast("Complete Daybook backup restored")}}
document.addEventListener("click",e=>{const n=e.target.closest("[data-view]");if(n)setTimeout(renderAll,0)});
window.addEventListener("daybook-subjects-updated",e=>{const names=Array.isArray(e.detail)?e.detail:[];for(const name of names)if(typeof name==="string"&&!courses.some(c=>c.name.toLowerCase()===name.toLowerCase()))courses.push({id:id(),name,code:"",credits:0});persist();renderAcademics()});
window.addEventListener("storage",e=>{if(e.key?.startsWith("daybook_"))renderAll()});
window.addEventListener("daybook-schedule-updated",()=>{renderAgenda();renderSmartPlan()});
if($("#financeForm"))$("#financeForm").elements.date.value=today();
renderAll();
})();