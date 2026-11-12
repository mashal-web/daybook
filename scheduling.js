"use strict";
(function(root){
 const STORAGE_KEY="daybook_schedule_v1",VERSION=3;
 const pad=n=>String(n).padStart(2,"0");
 const dateKey=d=>d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate());
 const validDate=s=>typeof s==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&!Number.isNaN(new Date(s+"T12:00:00").getTime())&&dateKey(new Date(s+"T12:00:00"))===s;
 const validTime=s=>typeof s==="string"&&/^([01]\d|2[0-3]):[0-5]\d$/.test(s);
 const parseLocal=s=>{if(typeof s!=="string"||!/^(\d{4}-\d{2}-\d{2})T([01]\d|2[0-3]):[0-5]\d$/.test(s))return null;const d=new Date(s);return Number.isNaN(d.getTime())||dateKey(d)!==s.slice(0,10)||pad(d.getHours())+":"+pad(d.getMinutes())!==s.slice(11)?null:d};
 const localStamp=d=>dateKey(d)+"T"+pad(d.getHours())+":"+pad(d.getMinutes());
 const plusDays=(key,n)=>{const d=new Date(key+"T12:00:00");d.setDate(d.getDate()+n);return dateKey(d)};
 const uid=()=>root.crypto&&typeof root.crypto.randomUUID==="function"?root.crypto.randomUUID():"evt-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,10);
 const clone=v=>JSON.parse(JSON.stringify(v));
 function normalizeTask(input){
  if(!input||typeof input!=="object"||Array.isArray(input))return null;
  const title=String(input.title||"").trim(),id=String(input.id||"");if(!title||!id)return null;
  const dateOrNull=value=>value==null||value===""?null:(validDate(String(value))?String(value):undefined);
  const planDate=dateOrNull(input.planDate),dueDate=dateOrNull(input.dueDate),postponedTo=dateOrNull(input.postponedTo);
  if(planDate===undefined||dueDate===undefined||postponedTo===undefined)return null;
  const duration=Number(input.durationMinutes??input.duration??60);if(!Number.isInteger(duration)||duration<1||duration>1440)return null;
  const repeat=["none","daily","weekly"].includes(input.repeat)?input.repeat:"none";
  const weekdays=[...new Set((Array.isArray(input.weekdays)?input.weekdays:[]).map(Number).filter(n=>Number.isInteger(n)&&n>=0&&n<=6))].sort((a,b)=>a-b);
  if(repeat==="weekly"&&!weekdays.length)return null;
  const completedDates=Array.isArray(input.completedDates)?[...new Set(input.completedDates.filter(validDate))]:[];
  const scheduledStart=input.scheduledStart==null||input.scheduledStart===""?null:String(input.scheduledStart),scheduledEnd=input.scheduledEnd==null||input.scheduledEnd===""?null:String(input.scheduledEnd);
  if(scheduledStart&&!parseLocal(scheduledStart))return null;if(scheduledEnd&&!parseLocal(scheduledEnd))return null;
  if(scheduledStart&&scheduledEnd&&parseLocal(scheduledEnd)<=parseLocal(scheduledStart))return null;
  const repeatStart=dateOrNull(input.repeatStart)||planDate,repeatEnd=dateOrNull(input.repeatEnd);if(repeatEnd===undefined)return null;
  return {id,title,category:String(input.category||"Personal"),kind:["fixed","flexible","optional","task"].includes(input.kind)?input.kind:"flexible",
   priority:["low","normal","high","urgent"].includes(String(input.priority||"").toLowerCase())?String(input.priority).toLowerCase():"normal",
   durationMinutes:duration,planDate,dueDate,postponedTo,repeat,weekdays,repeatStart,repeatEnd,completedDates,
   status:["open","completed","cancelled"].includes(input.status)?input.status:"open",scheduledStart,scheduledEnd,notes:String(input.notes||""),
   createdAt:typeof input.createdAt==="string"?input.createdAt:new Date().toISOString(),updatedAt:typeof input.updatedAt==="string"?input.updatedAt:new Date().toISOString(),
   source:input.source&&typeof input.source==="object"?clone(input.source):null};
 }
 function normalizeEvent(input){
  if(!input||typeof input!=="object"||Array.isArray(input))return null;
  const title=String(input.title||"").trim(),start=String(input.start||"");
  if(!title||!parseLocal(start))return null;
  const end=input.end==null||input.end===""?null:String(input.end);
  if(end!==null){const a=parseLocal(start),b=parseLocal(end);if(!b||b<=a)return null}
  const recurrence=input.recurrence&&typeof input.recurrence==="object"?input.recurrence:{frequency:"none",weekdays:[]};
  const frequency=["daily","weekly"].includes(recurrence.frequency)?recurrence.frequency:"none";
  const weekdays=frequency==="weekly"?[...new Set((Array.isArray(recurrence.weekdays)?recurrence.weekdays:[]).map(Number).filter(n=>Number.isInteger(n)&&n>=0&&n<=6))].sort((a,b)=>a-b):[];
  if(frequency==="weekly"&&!weekdays.length)return null;
  const recurrenceStart=recurrence.startDate==null||recurrence.startDate===""?null:String(recurrence.startDate);
  const recurrenceEnd=recurrence.endDate==null||recurrence.endDate===""?null:String(recurrence.endDate);
  if((recurrenceStart&&!validDate(recurrenceStart))||(recurrenceEnd&&!validDate(recurrenceEnd))||(recurrenceStart&&recurrenceEnd&&recurrenceEnd<recurrenceStart))return null;
  const type=["class","routine","study","event"].includes(input.type)?input.type:"event",now=new Date().toISOString();
  const reminder=input.reminder&&typeof input.reminder==="object"?{enabled:input.reminder.enabled===true,minutesBefore:Math.max(0,Math.min(10080,Number(input.reminder.minutesBefore)||0))}:{enabled:false,minutesBefore:0};
  return {id:String(input.id||uid()),title,category:String(input.category||(type==="class"?"University":type==="study"?"Study":"Personal")),type,start,end,allDay:input.allDay===true,
   recurrence:{frequency,weekdays,startDate:recurrenceStart,endDate:recurrenceEnd},description:String(input.description||""),notes:String(input.notes||""),location:String(input.location||""),
   priority:["low","normal","high","urgent"].includes(String(input.priority||"").toLowerCase())?String(input.priority).toLowerCase():"normal",
   status:["scheduled","completed","cancelled"].includes(input.status)?input.status:"scheduled",reminder,
   createdAt:typeof input.createdAt==="string"?input.createdAt:now,updatedAt:typeof input.updatedAt==="string"?input.updatedAt:now,
   source:input.source&&typeof input.source==="object"?clone(input.source):null,metadata:input.metadata&&typeof input.metadata==="object"?clone(input.metadata):{}};
 }
 function create(options){
  const storage=options&&options.storage;if(!storage)throw new Error("Scheduling storage is required");
  let events=[],exceptions=[],tasks=[],healthy=true,blocked=false,migrated=false;
  const migrateLegacy=(classes,routine,sessions)=>{
   const out=[],seen=new Set();
   function add(item,type){
    if(!item||typeof item!=="object")return;
    const legacyId=String(item.id||uid()),key=type+":"+legacyId;if(seen.has(key))return;seen.add(key);
    const day=Number(item.day);if(!Number.isInteger(day)||day<0||day>6)return;
    const time=type==="class"?item.start:item.time;if(!validTime(time))return;
    const anchor=plusDays("2000-01-02",day),start=anchor+"T"+time;let end=null;const endTime=item.end;
    if(validTime(endTime)){const endDay=endTime<=time?plusDays(anchor,1):anchor;end=endDay+"T"+endTime}
    const title=String(type==="class"?item.subject:item.title||"").trim();if(!title)return;const now=new Date().toISOString();
    out.push(normalizeEvent({id:"legacy-"+type+"-"+legacyId,title,category:type==="class"?"University":item.category||"Personal",type,start,end,
     recurrence:{frequency:"weekly",weekdays:[day],startDate:null,endDate:null},location:type==="class"?(item.room||""):(item.location||""),
     createdAt:item.createdAt||now,updatedAt:item.updatedAt||now,source:{kind:type,legacyId},
     metadata:type==="class"?{subject:title,room:item.room||""}:{legacyCategory:item.category||"Personal"}}));
   }
   (Array.isArray(classes)?classes:[]).forEach(x=>add(x,"class"));(Array.isArray(routine)?routine:[]).forEach(x=>add(x,"routine"));
   (Array.isArray(sessions)?sessions:[]).forEach(item=>{
    if(!item||typeof item!=="object"||!validDate(item.date)||!validTime(item.startTime))return;
    const mins=Number(item.minutes);if(!Number.isInteger(mins)||mins<1||mins>1440)return;
    const start=item.date+"T"+item.startTime,finish=new Date(parseLocal(start).getTime()+mins*60000);
    const title=String(item.topic||item.subject||"Study session").trim();if(!title)return;
    const now=new Date().toISOString();
    out.push(normalizeEvent({id:"legacy-study-"+String(item.id||uid()),title,category:"Study",type:"study",start,end:localStamp(finish),
     recurrence:{frequency:"none",weekdays:[]},notes:item.notes||"",priority:"normal",status:item.done?"completed":"scheduled",
     createdAt:item.createdAt||now,updatedAt:item.updatedAt||now,source:{kind:"study",legacyId:String(item.id||"")},
     metadata:{subject:item.subject||"",topic:item.topic||"",minutes:mins,done:item.done===true}}));
   });
   return out.filter(Boolean);
  };
  const write=()=>{try{storage.setItem(STORAGE_KEY,JSON.stringify({version:VERSION,events,exceptions,tasks}));healthy=true;return true}catch(e){healthy=false;return false}};
  const EXCEPTION_TYPES=["modified","rescheduled","cancelled"],OVERRIDE_FIELDS=["title","category","type","startDateTime","endDateTime","allDay","description","notes","location","priority","status","reminder"];
  function occurrenceId(seriesId,originalDate){if(typeof seriesId!=="string"||!seriesId||!validDate(originalDate))return null;return "occ:"+encodeURIComponent(seriesId)+":"+originalDate}
  function normalizeException(input,seriesList){
   if(!input||typeof input!=="object"||Array.isArray(input))return null;
   const seriesId=String(input.seriesId||""),originalDate=String(input.originalDate||""),series=(seriesList||events).find(x=>x.id===seriesId);
   if(!series||series.recurrence.frequency==="none"||!validDate(originalDate)||!matches(series,originalDate))return null;
   const identity=occurrenceId(seriesId,originalDate),type=input.type;
   if(!EXCEPTION_TYPES.includes(type)||input.occurrenceId!==identity)return null;
   let override=null;
   if(type==="cancelled"){if(input.override!=null&&(!input.override||typeof input.override!=="object"||Array.isArray(input.override)||Object.keys(input.override).length))return null}
   else{
    if(!input.override||typeof input.override!=="object"||Array.isArray(input.override))return null;
    override={};for(const [key,value] of Object.entries(input.override)){if(!OVERRIDE_FIELDS.includes(key))return null;override[key]=value}
    if("title" in override&&(!String(override.title).trim()))return null;
    if("type" in override&&!["class","routine","study","event"].includes(override.type))return null;
    if("startDateTime" in override&&!parseLocal(override.startDateTime))return null;
    if("endDateTime" in override&&override.endDateTime!==null&&override.endDateTime!==""&&!parseLocal(override.endDateTime))return null;
    if(override.startDateTime&&override.endDateTime&&parseLocal(override.endDateTime)<=parseLocal(override.startDateTime))return null;
    if("allDay" in override&&typeof override.allDay!=="boolean")return null;
    if("priority" in override&&!["low","normal","high","urgent"].includes(override.priority))return null;
    if("status" in override&&!["scheduled","completed","cancelled"].includes(override.status))return null;
    if("reminder" in override){const r=override.reminder;if(!r||typeof r!=="object"||typeof r.enabled!=="boolean"||!Number.isFinite(Number(r.minutesBefore))||Number(r.minutesBefore)<0||Number(r.minutesBefore)>10080)return null;override.reminder={enabled:r.enabled,minutesBefore:Number(r.minutesBefore)}}
    for(const key of ["category","description","notes","location"])if(key in override&&typeof override[key]!=="string")return null;
    if(type==="rescheduled"&&!override.startDateTime)return null;
   }
   const modifiedAt=typeof input.modifiedAt==="string"&&Number.isFinite(Date.parse(input.modifiedAt))?input.modifiedAt:null;if(!modifiedAt)return null;
   return {seriesId,occurrenceId:identity,originalDate,type,override,modifiedAt};
  }
  let raw=null;try{raw=storage.getItem(STORAGE_KEY)}catch(e){healthy=false;blocked=true}
  if(raw!==null){try{const parsed=JSON.parse(raw);if(!parsed||![1,2,VERSION].includes(parsed.version)||!Array.isArray(parsed.events))throw new Error("Unsupported schedule data");events=parsed.events.map(normalizeEvent);if(events.some(x=>!x)||events.length!==parsed.events.length)throw new Error("Invalid schedule records");if(parsed.version===1){exceptions=[];tasks=[];migrated=true}else{if(!Array.isArray(parsed.exceptions))throw new Error("Invalid schedule exceptions");exceptions=parsed.exceptions.map(x=>normalizeException(x,events));if(exceptions.some(x=>!x)||exceptions.length!==parsed.exceptions.length)throw new Error("Invalid schedule exceptions");if(new Set(exceptions.map(x=>x.occurrenceId)).size!==exceptions.length)throw new Error("Duplicate schedule exceptions");if(parsed.version===2){tasks=[];migrated=true}else{if(!Array.isArray(parsed.tasks))throw new Error("Invalid task records");tasks=parsed.tasks.map(normalizeTask);if(tasks.some(x=>!x)||tasks.length!==parsed.tasks.length||new Set(tasks.map(x=>x.id)).size!==tasks.length)throw new Error("Invalid task records")}}}
   catch(e){healthy=false;blocked=true;events=migrateLegacy(options.classes||[],options.routine||[]);exceptions=[]}
  }else{events=migrateLegacy(options.classes||[],options.routine||[],options.sessions||[]);exceptions=[];migrated=true;if(events.length&&!write())healthy=false}
  function transact(next,origin){if(blocked)return false;const old=events;events=next;if(!write()){events=old;return false}if(root.dispatchEvent){const detail={origin:origin||"api"};const event=typeof root.CustomEvent==="function"?new root.CustomEvent("daybook-schedule-updated",{detail}):{type:"daybook-schedule-updated",detail};root.dispatchEvent(event)}return true}
  function transactWithExceptions(nextEvents,nextExceptions){if(blocked)return false;const oldEvents=events,oldExceptions=exceptions;events=nextEvents;exceptions=nextExceptions;if(!write()){events=oldEvents;exceptions=oldExceptions;return false}if(root.dispatchEvent){const detail={origin:"api"};const event=typeof root.CustomEvent==="function"?new root.CustomEvent("daybook-schedule-updated",{detail}):{type:"daybook-schedule-updated",detail};root.dispatchEvent(event)}return true}
  function occurrence(event,baseDate){
   const startTime=event.allDay?"00:00":event.start.slice(11),start=parseLocal(baseDate+"T"+startTime);if(!start)return null;
   let duration=null;if(event.allDay)duration=1440;else if(event.end){const a=parseLocal(event.start),b=parseLocal(event.end);if(a&&b&&b>a)duration=Math.round((b-a)/60000)}
   const end=duration===null?null:new Date(start.getTime()+duration*60000);
   return {...clone(event),occurrenceDate:baseDate,occurrenceId:occurrenceId(event.id,baseDate),startDateTime:localStamp(start),endDateTime:end?localStamp(end):null,time:pad(start.getHours())+":"+pad(start.getMinutes()),end:end?pad(end.getHours())+":"+pad(end.getMinutes()):"",durationMinutes:duration};
  }
  function matches(event,baseDate){const rec=event.recurrence;if(rec.frequency==="daily")return (!rec.startDate||baseDate>=rec.startDate)&&(!rec.endDate||baseDate<=rec.endDate);if(rec.frequency==="weekly"){const weekday=new Date(baseDate+"T12:00:00").getDay();return rec.weekdays.includes(weekday)&&(!rec.startDate||baseDate>=rec.startDate)&&(!rec.endDate||baseDate<=rec.endDate)}return event.start.slice(0,10)===baseDate}
  function materializeOccurrence(event,baseDate){
   const item=occurrence(event,baseDate);if(!item)return null;const exception=exceptions.find(x=>x.occurrenceId===item.occurrenceId);if(exception&&exception.type==="cancelled")return null;
   if(exception&&exception.override){const originalStart=parseLocal(item.startDateTime),originalEnd=item.endDateTime?parseLocal(item.endDateTime):null,duration=originalStart&&originalEnd?originalEnd-originalStart:null;Object.assign(item,clone(exception.override));item.exceptionType=exception.type;item.exceptionModifiedAt=exception.modifiedAt;if(item.startDateTime){const d=parseLocal(item.startDateTime);item.time=pad(d.getHours())+":"+pad(d.getMinutes());if(!("endDateTime" in exception.override)&&duration!==null)item.endDateTime=localStamp(new Date(d.getTime()+duration))}if(item.endDateTime){const d=parseLocal(item.endDateTime);item.end=pad(d.getHours())+":"+pad(d.getMinutes())}else item.end="";item.durationMinutes=durationMinutes(item)}
   return item;
  }
  function getForDate(value){
   const key=value instanceof Date?dateKey(value):String(value).slice(0,10);if(!validDate(key))return [];
   const result=[],dayStart=parseLocal(key+"T00:00"),dayEnd=parseLocal(plusDays(key,1)+"T00:00");
   for(const event of events){if(event.status==="cancelled")continue;for(const base of [plusDays(key,-1),key]){if(!matches(event,base))continue;const item=materializeOccurrence(event,base);if(!item)continue;const start=parseLocal(item.startDateTime),end=item.endDateTime?parseLocal(item.endDateTime):null;if(start&&start<dayEnd&&(!end||end>dayStart))result.push(item)}}
   for(const exception of exceptions){if(exception.type!=="rescheduled"||!exception.override||!exception.override.startDateTime||exception.override.startDateTime.slice(0,10)!==key)continue;const series=events.find(x=>x.id===exception.seriesId);if(!series||series.status==="cancelled")continue;const item=materializeOccurrence(series,exception.originalDate);if(item&&!result.some(x=>x.occurrenceId===item.occurrenceId))result.push(item)}
   const unique=new Map();result.forEach(x=>unique.set(x.occurrenceId,x));return [...unique.values()].sort((a,b)=>a.startDateTime.localeCompare(b.startDateTime)||a.title.localeCompare(b.title));
  }
  function getForWeek(value){const start=value instanceof Date?dateKey(value):String(value).slice(0,10);if(!validDate(start))return [];const all=[];for(let i=0;i<7;i++)all.push(...getForDate(plusDays(start,i)));const unique=new Map();all.forEach(x=>unique.set(x.occurrenceId||x.id+"@"+x.occurrenceDate,x));return [...unique.values()].sort((a,b)=>a.startDateTime.localeCompare(b.startDateTime))}
  function getUpcoming(from,limit){const start=from instanceof Date?from:new Date(from||Date.now()),count=Math.max(1,Math.min(500,Number(limit)||50)),out=[];for(let i=0;i<366&&out.length<count;i++){const d=new Date(start);d.setDate(start.getDate()+i);getForDate(d).forEach(x=>{if(parseLocal(x.startDateTime)>=start)out.push(x)})}return out.sort((a,b)=>a.startDateTime.localeCompare(b.startDateTime)).slice(0,count)}
  function durationMinutes(item){if(!item)return null;if(Number.isFinite(item.durationMinutes))return item.durationMinutes;const start=parseLocal(item.startDateTime||item.start),end=parseLocal(item.endDateTime||item.end);return start&&end&&end>start?Math.round((end-start)/60000):null}
  function overlaps(a,b){if(!a||!b)return false;const xs=parseLocal(a.startDateTime||a.start),ys=parseLocal(b.startDateTime||b.start),xe=parseLocal(a.endDateTime||a.end),ye=parseLocal(b.endDateTime||b.end);return !!(xs&&ys&&xe&&ye&&xe>xs&&ye>ys&&xs<ye&&ys<xe)}
  function findOverlaps(value){const list=Array.isArray(value)?value:getForDate(value||new Date()),conflicts=[];for(let i=0;i<list.length;i++)for(let j=i+1;j<list.length;j++)if(overlaps(list[i],list[j]))conflicts.push([list[i],list[j]]);return conflicts}
  function createEvent(input){const event=normalizeEvent({...input,id:input&&input.id||uid()});if(!event)throw new Error("Invalid schedule event");if(events.some(x=>x.id===event.id))throw new Error("Duplicate schedule event ID");return transact([...events,event])?clone(event):null}
  function getOccurrenceId(seriesId,originalDate){const series=events.find(x=>x.id===String(seriesId));if(!series||series.recurrence.frequency==="none"||!validDate(originalDate)||!matches(series,originalDate))return null;return occurrenceId(series.id,originalDate)}
  function createException(input){const series=events.find(x=>x.id===String(input&&input.seriesId||""));const identity=series&&getOccurrenceId(series.id,String(input.originalDate||""));if(!identity)throw new Error("Invalid recurring occurrence reference");if(exceptions.some(x=>x.occurrenceId===identity))throw new Error("Duplicate occurrence exception");const record=normalizeException({...input,occurrenceId:identity,modifiedAt:new Date().toISOString()},events);if(!record)throw new Error("Invalid occurrence exception");return transactExceptions([...exceptions,record])?clone(record):null}
  function updateException(identity,patch){const index=exceptions.findIndex(x=>x.occurrenceId===String(identity));if(index<0)return null;const candidate=normalizeException({...exceptions[index],...patch,seriesId:exceptions[index].seriesId,originalDate:exceptions[index].originalDate,occurrenceId:exceptions[index].occurrenceId,modifiedAt:new Date().toISOString()},events);if(!candidate)throw new Error("Invalid occurrence exception");const next=exceptions.slice();next[index]=candidate;return transactExceptions(next)?clone(candidate):null}
  function deleteException(identity){const next=exceptions.filter(x=>x.occurrenceId!==String(identity));if(next.length===exceptions.length)return false;return transactExceptions(next)}
  function transactExceptions(next){if(blocked)return false;const old=exceptions;exceptions=next;if(!write()){exceptions=old;return false}if(root.dispatchEvent){const detail={origin:"occurrence-exception"};const event=typeof root.CustomEvent==="function"?new root.CustomEvent("daybook-schedule-updated",{detail}):{type:"daybook-schedule-updated",detail};root.dispatchEvent(event)}return true}
  function updateEvent(id,patch){const index=events.findIndex(x=>x.id===String(id));if(index<0)return null;const updated=normalizeEvent({...events[index],...patch,id:events[index].id,updatedAt:new Date().toISOString()});if(!updated)throw new Error("Invalid schedule event");if(exceptions.some(x=>x.seriesId===updated.id&&!matches(updated,x.originalDate)))throw new Error("Cannot change recurrence while occurrence exceptions exist");const next=events.slice();next[index]=updated;return transact(next)?clone(updated):null}
  function deleteEvent(id){const next=events.filter(x=>x.id!==String(id));if(next.length===events.length)return false;const remaining=exceptions.filter(x=>x.seriesId!==String(id));return transactWithExceptions(next,remaining)}
  function duplicateEvent(id,overrides){const source=events.find(x=>x.id===String(id));if(!source)return null;return createEvent({...source,...(overrides||{}),id:uid(),source:null,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()})}
  function getTasks(){return clone(tasks)}
  function emit(origin){if(root.dispatchEvent){const detail={origin};const event=typeof root.CustomEvent==="function"?new root.CustomEvent("daybook-schedule-updated",{detail}):{type:"daybook-schedule-updated",detail};root.dispatchEvent(event)}}
  function createTask(input){const task=normalizeTask({...input,id:input&&input.id||uid()});if(!task)throw new Error("Invalid flexible activity");if(tasks.some(x=>x.id===task.id))throw new Error("Duplicate activity ID");const old=tasks;tasks=[...tasks,task];if(!write()){tasks=old;return null}emit("task-create");return clone(task)}
  function updateTask(id,patch){const index=tasks.findIndex(x=>x.id===String(id));if(index<0)return null;const next=tasks.slice();next[index]=normalizeTask({...tasks[index],...patch,id:tasks[index].id,updatedAt:new Date().toISOString()});if(!next[index])throw new Error("Invalid flexible activity");const old=tasks;tasks=next;if(!write()){tasks=old;return null}emit("task-update");return clone(tasks[index])}
  function deleteTask(id){const next=tasks.filter(x=>x.id!==String(id));if(next.length===tasks.length)return false;const old=tasks;tasks=next;if(!write()){tasks=old;return false}emit("task-delete");return true}
  function getTasksForDate(value){const day=value instanceof Date?dateKey(value):String(value).slice(0,10);if(!validDate(day))return [];return tasks.filter(task=>{if(task.status==="cancelled")return false;if(task.postponedTo===day)return true;if(task.repeat==="daily")return (!task.repeatStart||day>=task.repeatStart)&&(!task.repeatEnd||day<=task.repeatEnd);if(task.repeat==="weekly")return (!task.repeatStart||day>=task.repeatStart)&&(!task.repeatEnd||day<=task.repeatEnd)&&task.weekdays.includes(new Date(day+"T12:00:00").getDay());return task.planDate===day||!!(task.dueDate&&task.dueDate<=day&&task.status!=="completed")}).map(task=>({...clone(task),occurrenceDate:day,occurrenceStatus:task.repeat!=="none"?(task.completedDates.includes(day)?"completed":"open"):task.status}))}
  function availableSlots(day,timed,options){const opts=options||{},start=Number.isInteger(opts.dayStart)?opts.dayStart:360,end=Number.isInteger(opts.dayEnd)?opts.dayEnd:1380,min=Math.max(1,Number(opts.minimumMinutes)||15),dayStart=parseLocal(day+"T00:00"),dayEnd=parseLocal(plusDays(day,1)+"T00:00"),ranges=timed.map(x=>{const a=parseLocal(x.start),b=x.end?parseLocal(x.end):null;if(!a||!b)return null;const lo=Math.max(a.getTime(),dayStart.getTime()),hi=Math.min(b.getTime(),dayEnd.getTime());return hi>lo?[(lo-dayStart.getTime())/60000,(hi-dayStart.getTime())/60000]:null}).filter(Boolean).sort((a,b)=>a[0]-b[0]);const out=[];let cursor=start;for(const [a,b] of ranges){if(a-cursor>=min)out.push({start:cursor,end:a,duration:a-cursor});cursor=Math.max(cursor,b)}if(end-cursor>=min)out.push({start:cursor,end,duration:end-cursor});return out.map(x=>({...x,startTime:String(Math.floor(x.start/60)).padStart(2,"0")+":"+String(x.start%60).padStart(2,"0"),endTime:String(Math.floor(x.end/60)).padStart(2,"0")+":"+String(x.end%60).padStart(2,"0")}))}
  function getDayPlan(value,options){const day=value instanceof Date?dateKey(value):String(value).slice(0,10);if(!validDate(day))return null;const opts=options||{},eventsForDay=getForDate(day),activities=getTasksForDate(day),anchors=Array.isArray(opts.anchors)?clone(opts.anchors):[],items=[...eventsForDay.map(x=>({...x,planKind:"event"})),...activities.map(x=>({...x,planKind:"task",scheduled:x.scheduledStart?{start:x.scheduledStart,end:x.scheduledEnd}:null})),...anchors.map(x=>({...x,planKind:"anchor"}))];items.sort((a,b)=>String(a.startDateTime||a.scheduled?.start||a.start||"9999").localeCompare(String(b.startDateTime||b.scheduled?.start||b.start||"9999")));const timed=items.filter(x=>x.startDateTime||x.scheduled?.start||x.start).map(x=>({id:x.occurrenceId||x.id,title:x.title,start:x.startDateTime||x.scheduled?.start||x.start,end:x.endDateTime||x.scheduled?.end||x.end||null,kind:x.type==="class"?"fixed":x.planKind==="anchor"?"anchor":x.planKind==="task"?x.kind:"fixed"}));const conflicts=[];for(let i=0;i<timed.length;i++)for(let j=i+1;j<timed.length;j++)if(timed[i].end&&timed[j].end&&overlaps(timed[i],timed[j]))conflicts.push({first:timed[i].id,second:timed[j].id,firstTitle:timed[i].title,secondTitle:timed[j].title});return {date:day,items,events:eventsForDay,activities,anchors,conflicts,available:availableSlots(day,timed,opts)}}
  function syncTasks(items){if(blocked)return false;const next=(Array.isArray(items)?items:[]).map(x=>normalizeTask(x));if(next.some(x=>!x)||new Set(next.map(x=>x.id)).size!==next.length)return false;if(JSON.stringify(next)===JSON.stringify(tasks))return healthy?true:write();const old=tasks;tasks=next;if(!write()){tasks=old;return false}emit("task-sync");return true}
  function syncLegacy(classes,routine,sessions,legacyTasks){
   if(blocked)return false;const retained=events.filter(x=>!x.source||!["class","routine","study"].includes(x.source.kind)),mapped=migrateLegacy(classes,routine,sessions);
   const existing=new Map(events.filter(x=>x.source&&["class","routine","study"].includes(x.source.kind)).map(x=>[x.source.kind+":"+x.source.legacyId,x]));
   const next=mapped.map(item=>{const old=existing.get(item.source.kind+":"+item.source.legacyId);if(!old)return item;const a={...old,createdAt:"",updatedAt:""},b={...item,id:old.id,createdAt:"",updatedAt:""};return JSON.stringify(a)===JSON.stringify(b)?old:{...item,id:old.id,createdAt:old.createdAt}});
   const merged=[...retained,...next];if(exceptions.some(x=>{const series=merged.find(e=>e.id===x.seriesId);return !series||!matches(series,x.originalDate)}))return false;const mappedTasks=(Array.isArray(legacyTasks)?legacyTasks:[]).map(x=>{const legacyId=String(x.id||""),previous=tasks.find(t=>t.source?.kind==="legacy-task"&&t.source.legacyId===legacyId);return normalizeTask({id:previous?.id||legacyId||uid(),title:x.title,category:x.category||"Personal",kind:"task",priority:String(x.priority||"normal").toLowerCase(),durationMinutes:Number(x.durationMinutes)||previous?.durationMinutes||30,dueDate:x.due||x.dueDate||null,status:x.done?"completed":"open",notes:x.notes||"",createdAt:x.createdAt||previous?.createdAt||new Date().toISOString(),source:{kind:"legacy-task",legacyId}})}).filter(Boolean);
   const taskOld=tasks,mergedTasks=[...tasks.filter(x=>x.source?.kind!=="legacy-task"),...mappedTasks];
   if(JSON.stringify(merged)===JSON.stringify(events)&&JSON.stringify(mergedTasks)===JSON.stringify(taskOld))return healthy?true:write();
   const oldEvents=events;events=merged;tasks=mergedTasks;if(!write()){events=oldEvents;tasks=taskOld;return false}emit("legacy-sync");return true;
  }
  if(migrated&&raw!==null&&!blocked&&!write())healthy=false;
  return {version:VERSION,getAll:()=>clone(events),getForDate,getForWeek,getUpcoming,durationMinutes,overlaps,findOverlaps,createEvent,updateEvent,deleteEvent,duplicateEvent,syncLegacy,getOccurrenceId,createException,updateException,deleteException,getExceptions:()=>clone(exceptions),getException:id=>clone(exceptions.find(x=>x.occurrenceId===String(id))||null),getTasks,getTasksForDate,getDayPlan,createTask,updateTask,deleteTask,syncTasks,isHealthy:()=>healthy,wasMigrated:()=>migrated,storageKey:STORAGE_KEY};
 }
 root.DaybookSchedule={create};
})(window);