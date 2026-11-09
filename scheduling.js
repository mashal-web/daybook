"use strict";
(function(root){
 const STORAGE_KEY="daybook_schedule_v1",VERSION=1;
 const pad=n=>String(n).padStart(2,"0");
 const dateKey=d=>d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate());
 const validDate=s=>typeof s==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&!Number.isNaN(new Date(s+"T12:00:00").getTime())&&dateKey(new Date(s+"T12:00:00"))===s;
 const validTime=s=>typeof s==="string"&&/^([01]\d|2[0-3]):[0-5]\d$/.test(s);
 const parseLocal=s=>{if(typeof s!=="string"||!/^(\d{4}-\d{2}-\d{2})T([01]\d|2[0-3]):[0-5]\d$/.test(s))return null;const d=new Date(s);return Number.isNaN(d.getTime())||dateKey(d)!==s.slice(0,10)||pad(d.getHours())+":"+pad(d.getMinutes())!==s.slice(11)?null:d};
 const localStamp=d=>dateKey(d)+"T"+pad(d.getHours())+":"+pad(d.getMinutes());
 const plusDays=(key,n)=>{const d=new Date(key+"T12:00:00");d.setDate(d.getDate()+n);return dateKey(d)};
 const uid=()=>root.crypto&&typeof root.crypto.randomUUID==="function"?root.crypto.randomUUID():"evt-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,10);
 const clone=v=>JSON.parse(JSON.stringify(v));
 function normalizeEvent(input){
  if(!input||typeof input!=="object"||Array.isArray(input))return null;
  const title=String(input.title||"").trim(),start=String(input.start||"");
  if(!title||!parseLocal(start))return null;
  const end=input.end==null||input.end===""?null:String(input.end);
  if(end!==null){const a=parseLocal(start),b=parseLocal(end);if(!b||b<=a)return null}
  const recurrence=input.recurrence&&typeof input.recurrence==="object"?input.recurrence:{frequency:"none",weekdays:[]};
  const frequency=recurrence.frequency==="weekly"?"weekly":"none";
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
  let events=[],healthy=true,blocked=false,migrated=false;
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
  const write=()=>{try{storage.setItem(STORAGE_KEY,JSON.stringify({version:VERSION,events}));healthy=true;return true}catch(e){healthy=false;return false}};
  let raw=null;try{raw=storage.getItem(STORAGE_KEY)}catch(e){healthy=false;blocked=true}
  if(raw!==null){try{const parsed=JSON.parse(raw);if(!parsed||parsed.version!==VERSION||!Array.isArray(parsed.events))throw new Error("Unsupported schedule data");events=parsed.events.map(normalizeEvent);if(events.some(x=>!x)||events.length!==parsed.events.length)throw new Error("Invalid schedule records")}
   catch(e){healthy=false;blocked=true;events=migrateLegacy(options.classes||[],options.routine||[])}
  }else{events=migrateLegacy(options.classes||[],options.routine||[],options.sessions||[]);migrated=true;if(events.length&&!write())healthy=false}
  function transact(next,origin){if(blocked)return false;const old=events;events=next;if(!write()){events=old;return false}if(root.dispatchEvent){const detail={origin:origin||"api"};const event=typeof root.CustomEvent==="function"?new root.CustomEvent("daybook-schedule-updated",{detail}):{type:"daybook-schedule-updated",detail};root.dispatchEvent(event)}return true}
  function occurrence(event,baseDate){
   const startTime=event.allDay?"00:00":event.start.slice(11),start=parseLocal(baseDate+"T"+startTime);if(!start)return null;
   let duration=null;if(event.allDay)duration=1440;else if(event.end){const a=parseLocal(event.start),b=parseLocal(event.end);if(a&&b&&b>a)duration=Math.round((b-a)/60000)}
   const end=duration===null?null:new Date(start.getTime()+duration*60000);
   return {...clone(event),occurrenceDate:baseDate,startDateTime:localStamp(start),endDateTime:end?localStamp(end):null,time:pad(start.getHours())+":"+pad(start.getMinutes()),end:end?pad(end.getHours())+":"+pad(end.getMinutes()):"",durationMinutes:duration};
  }
  function matches(event,baseDate){const rec=event.recurrence;if(rec.frequency==="weekly"){const weekday=new Date(baseDate+"T12:00:00").getDay();return rec.weekdays.includes(weekday)&&(!rec.startDate||baseDate>=rec.startDate)&&(!rec.endDate||baseDate<=rec.endDate)}return event.start.slice(0,10)===baseDate}
  function getForDate(value){
   const key=value instanceof Date?dateKey(value):String(value).slice(0,10);if(!validDate(key))return [];
   const result=[],dayStart=parseLocal(key+"T00:00"),dayEnd=parseLocal(plusDays(key,1)+"T00:00");
   for(const event of events){if(event.status==="cancelled")continue;for(const base of [plusDays(key,-1),key]){if(!matches(event,base))continue;const item=occurrence(event,base);if(!item)continue;const start=parseLocal(item.startDateTime),end=item.endDateTime?parseLocal(item.endDateTime):null;if(base===key||end&&start<dayEnd&&end>dayStart)result.push(item)}}
   const unique=new Map();result.forEach(x=>unique.set(x.id+"@"+x.occurrenceDate,x));return [...unique.values()].sort((a,b)=>a.startDateTime.localeCompare(b.startDateTime)||a.title.localeCompare(b.title));
  }
  function getForWeek(value){const start=value instanceof Date?dateKey(value):String(value).slice(0,10);if(!validDate(start))return [];const all=[];for(let i=0;i<7;i++)all.push(...getForDate(plusDays(start,i)));return all.filter(x=>x.occurrenceDate>=start&&x.occurrenceDate<=plusDays(start,6))}
  function getUpcoming(from,limit){const start=from instanceof Date?from:new Date(from||Date.now()),count=Math.max(1,Math.min(500,Number(limit)||50)),out=[];for(let i=0;i<366&&out.length<count;i++){const d=new Date(start);d.setDate(start.getDate()+i);getForDate(d).forEach(x=>{if(parseLocal(x.startDateTime)>=start)out.push(x)})}return out.sort((a,b)=>a.startDateTime.localeCompare(b.startDateTime)).slice(0,count)}
  function durationMinutes(item){if(!item)return null;if(Number.isFinite(item.durationMinutes))return item.durationMinutes;const start=parseLocal(item.startDateTime||item.start),end=parseLocal(item.endDateTime||item.end);return start&&end&&end>start?Math.round((end-start)/60000):null}
  function overlaps(a,b){if(!a||!b)return false;const xs=parseLocal(a.startDateTime||a.start),ys=parseLocal(b.startDateTime||b.start),xe=parseLocal(a.endDateTime||a.end),ye=parseLocal(b.endDateTime||b.end);return !!(xs&&ys&&xe&&ye&&xe>xs&&ye>ys&&xs<ye&&ys<xe)}
  function findOverlaps(value){const list=Array.isArray(value)?value:getForDate(value||new Date()),conflicts=[];for(let i=0;i<list.length;i++)for(let j=i+1;j<list.length;j++)if(overlaps(list[i],list[j]))conflicts.push([list[i],list[j]]);return conflicts}
  function createEvent(input){const event=normalizeEvent({...input,id:input&&input.id||uid()});if(!event)throw new Error("Invalid schedule event");if(events.some(x=>x.id===event.id))throw new Error("Duplicate schedule event ID");return transact([...events,event])?clone(event):null}
  function updateEvent(id,patch){const index=events.findIndex(x=>x.id===String(id));if(index<0)return null;const updated=normalizeEvent({...events[index],...patch,id:events[index].id,updatedAt:new Date().toISOString()});if(!updated)throw new Error("Invalid schedule event");const next=events.slice();next[index]=updated;return transact(next)?clone(updated):null}
  function deleteEvent(id){const next=events.filter(x=>x.id!==String(id));if(next.length===events.length)return false;return transact(next)}
  function duplicateEvent(id,overrides){const source=events.find(x=>x.id===String(id));if(!source)return null;return createEvent({...source,...(overrides||{}),id:uid(),source:null,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()})}
  function syncLegacy(classes,routine,sessions){
   if(blocked)return false;const retained=events.filter(x=>!x.source||!["class","routine","study"].includes(x.source.kind)),mapped=migrateLegacy(classes,routine,sessions);
   const existing=new Map(events.filter(x=>x.source&&["class","routine","study"].includes(x.source.kind)).map(x=>[x.source.kind+":"+x.source.legacyId,x]));
   const next=mapped.map(item=>{const old=existing.get(item.source.kind+":"+item.source.legacyId);if(!old)return item;const a={...old,createdAt:"",updatedAt:""},b={...item,id:old.id,createdAt:"",updatedAt:""};return JSON.stringify(a)===JSON.stringify(b)?old:{...item,id:old.id,createdAt:old.createdAt}});
   const merged=[...retained,...next];if(JSON.stringify(merged)===JSON.stringify(events))return healthy?true:write();return transact(merged,"legacy-sync");
  }
  return {version:VERSION,getAll:()=>clone(events),getForDate,getForWeek,getUpcoming,durationMinutes,overlaps,findOverlaps,createEvent,updateEvent,deleteEvent,duplicateEvent,syncLegacy,isHealthy:()=>healthy,wasMigrated:()=>migrated,storageKey:STORAGE_KEY};
 }
 root.DaybookSchedule={create};
})(window);