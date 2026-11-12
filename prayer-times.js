"use strict";
(function(){
 const KEY="daybook_prayer_settings_v1",CACHE="daybook_prayer_cache_v1",LOG="daybook_prayer_log_v1";
 const names=["Fajr","Dhuhr","Asr","Maghrib","Isha"];
 const defaults={city:"Karachi, Pakistan",latitude:24.8607,longitude:67.0011,timezone:"Asia/Karachi",method:1,school:1,offsets:{Fajr:0,Dhuhr:0,Asr:0,Maghrib:0,Isha:0},notifications:{Fajr:false,Dhuhr:false,Asr:false,Maghrib:false,Isha:false},reminderMinutes:0,preparationMinutes:5,prayerDuration:10,bedtime:"22:30",wakeTime:"05:30",sleepReminder:true,sleepReminderMinutes:15};
 const clone=x=>JSON.parse(JSON.stringify(x));
 const storage=()=>window.DaybookPersistence?.storage||localStorage;
 function read(key,fallback){try{const x=JSON.parse(storage().getItem(key));return x==null?clone(fallback):x}catch{return clone(fallback)}}
 function write(key,value){try{storage().setItem(key,JSON.stringify(value));return true}catch{return false}}
 let settings={...defaults,...read(KEY,{}),offsets:{...defaults.offsets,...(read(KEY,{}).offsets||{})},notifications:{...defaults.notifications,...(read(KEY,{}).notifications||{})}};
 let current=null,loading=false,lastDate="",lastFetch=0,log=read(LOG,{});
 const pad=n=>String(n).padStart(2,"0");
 function dateInZone(date,tz){const p=new Intl.DateTimeFormat("en-CA",{timeZone:tz,year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(date);const o={};p.forEach(x=>o[x.type]=x.value);return o.year+"-"+o.month+"-"+o.day}
 function zoneDate(date,tz){const p=new Intl.DateTimeFormat("en-US",{timeZone:tz,year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",second:"2-digit",hourCycle:"h23"}).formatToParts(date),o={};p.forEach(x=>o[x.type]=x.value);return o}
 function zonedInstant(day,time,tz){const [y,m,d]=day.split("-").map(Number),[h,mi]=time.split(":").map(Number);const target=Date.UTC(y,m-1,d,h,mi,0);let guess=target;for(let i=0;i<3;i++){const p=zoneDate(new Date(guess),tz),shown=Date.UTC(+p.year,+p.month-1,+p.day,+p.hour,+p.minute,+p.second);guess+=target-shown}return new Date(guess)}
 function cleanTime(value){const m=String(value||"").match(/(\d{1,2}):(\d{2})/);return m?pad(+m[1]%24)+":"+m[2]:null}
 function addMinutes(time,n){const [h,m]=time.split(":").map(Number),v=(h*60+m+n+1440*10)%(1440);return pad(Math.floor(v/60))+":"+pad(v%60)}
 function apiDate(day){const [y,m,d]=day.split("-");return d+"-"+m+"-"+y}
 function cacheKey(day){return [day,settings.latitude,settings.longitude,settings.method,settings.school].join("|")}
 async function load(day,force=false){
  if(loading)return;loading=true;const cached=read(CACHE,{})[cacheKey(day)];
  try{
   if(!navigator.onLine){if(cached)current={...cached,offline:true};else current={day,timings:null,offline:true,error:"No saved prayer times are available offline."};return}
   const url="https://api.aladhan.com/v1/timings/"+apiDate(day)+"?latitude="+encodeURIComponent(settings.latitude)+"&longitude="+encodeURIComponent(settings.longitude)+"&method="+encodeURIComponent(settings.method)+"&school="+encodeURIComponent(settings.school);
   const response=await fetch(url,{headers:{Accept:"application/json"},cache:force?"no-store":"default"});
   if(!response.ok)throw Error("Prayer service returned "+response.status);
   const payload=await response.json();if(payload.code!==200||!payload.data?.timings)throw Error("Prayer service returned invalid data");
   const raw=payload.data.timings,timings={};names.forEach(name=>{const key=name==="Dhuhr"?"Dhuhr":name;const t=cleanTime(raw[key]);if(!t)throw Error("Missing "+name+" time");timings[name]=addMinutes(t,Number(settings.offsets[name])||0)});
   const result={day,timings,timezone:payload.data.meta?.timezone||settings.timezone,source:"AlAdhan",offline:false,updatedAt:Date.now()};
   const all=read(CACHE,{});all[cacheKey(day)]=result;const keys=Object.keys(all);keys.slice(0,Math.max(0,keys.length-20)).forEach(k=>delete all[k]);write(CACHE,all);current=result;lastFetch=Date.now();
  }catch(error){current=cached?{...cached,offline:true,error:"Using saved prayer times. "+error.message}:{day,timings:null,offline:true,error:"Prayer times unavailable. "+error.message}}
  finally{loading=false;render();window.dispatchEvent(new Event("daybook-prayer-updated"))}
 }
 function nextPrayer(now=new Date()){
  if(!current?.timings)return null;const day=dateInZone(now,settings.timezone);let list=names.map(name=>({name,time:current.timings[name],at:zonedInstant(day,current.timings[name],settings.timezone)}));
  let next=list.find(x=>x.at>now);if(next)return next;
  const tomorrow=new Date(now.getTime()+86400000),tomorrowKey=dateInZone(tomorrow,settings.timezone),tomorrowTimes=read(CACHE,{})[cacheKey(tomorrowKey)];
  if(tomorrowTimes?.timings){const item=names.map(name=>({name,time:tomorrowTimes.timings[name],at:zonedInstant(tomorrowKey,tomorrowTimes.timings[name],settings.timezone)})).find(x=>x.at>now);if(item)return item}
  return null;
 }
 function fmt(time){if(!time)return "—";const [h,m]=time.split(":").map(Number);return new Date(2000,0,1,h,m).toLocaleTimeString([],{hour:"numeric",minute:"2-digit"})}
 function status(name,at,now,done){if(done)return "completed";return at<now?"missed":"upcoming"}
 function render(){
  const host=document.getElementById("daybookPrayerWidget");if(!host)return;
  const now=new Date(),day=dateInZone(now,settings.timezone);
  if(!current||current.day!==day){if(!loading)load(day);host.innerHTML='<p class="muted">Loading prayer times…</p>';return}
  if(!current.timings){host.innerHTML='<p class="muted">'+esc(current.error||"Prayer times unavailable")+'</p>';return}
  const upcoming=nextPrayer(now),left=upcoming?Math.max(0,upcoming.at-now):0,hh=Math.floor(left/3600000),mm=Math.floor(left%3600000/60000);
  const dayLog=log[day]||{};
  host.innerHTML='<div class="prayer-head"><div><p class="label">DAILY PRAYERS</p><h3>'+esc(settings.city)+'</h3><p class="muted">'+esc(new Date(day+"T12:00:00").toLocaleDateString(undefined,{weekday:"long",month:"long",day:"numeric"}))+' · '+esc(settings.timezone)+'</p></div><span class="prayer-source">'+(current.offline?"SAVED TIMES":"LIVE CALCULATION")+'</span></div><div class="prayer-next"><span>NEXT PRAYER</span><b>'+(upcoming?esc(upcoming.name):"—")+'</b><strong>'+(upcoming?esc(fmt(upcoming.time)):"—")+'</strong><small>'+(upcoming?hh+"h "+mm+"m remaining":"No upcoming prayer found")+'</small></div><div class="prayer-times">'+names.map(name=>{const time=current.timings[name],at=zonedInstant(day,time,settings.timezone),state=status(name,at,now,dayLog[name]===true);return '<label class="prayer-time '+state+'"><span><input type="checkbox" data-prayer-done="'+name+'" '+(state==="completed"?"checked":"")+' aria-label="Mark '+name+' prayer completed"><b>'+name+'</b></span><time>'+fmt(time)+'</time><small>'+state.toUpperCase()+'</small></label>'}).join("")+'</div><div class="prayer-foot"><span>'+(current.offline?"Offline · cached calculation":"Calculated by AlAdhan")+'</span><button type="button" id="prayerRefresh">Refresh</button><button type="button" id="prayerSettingsOpen">Prayer settings</button></div><div class="sleep-routine"><span>Sleep schedule</span><b>Bedtime '+esc(fmt(settings.bedtime))+'</b><b>Wake-up '+esc(fmt(settings.wakeTime))+'</b><small>Target '+(sleepMinutes()/60).toFixed(1)+' hours</small></div>'+(current.error?'<p class="muted">'+esc(current.error)+'</p>':"");
  host.querySelectorAll("[data-prayer-done]").forEach(input=>input.addEventListener("change",()=>{log[day]=log[day]||{};log[day][input.dataset.prayerDone]=input.checked;write(LOG,log);render()}));
  host.querySelector("#prayerRefresh").onclick=()=>load(day,true);host.querySelector("#prayerSettingsOpen").onclick=()=>openSettings();
  renderSchedule(day,now);
 }
 function esc(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
 function renderSchedule(day,now){
  const host=document.getElementById("daybookPrayerSchedule");if(!host||!current?.timings)return;
  const events=window.DaybookScheduleStore?.getForDate(day)||[],prayerRows=names.map(name=>{const time=current.timings[name],at=zonedInstant(day,time,settings.timezone),from=new Date(at.getTime()-settings.preparationMinutes*60000),to=new Date(at.getTime()+settings.prayerDuration*60000);const conflicts=events.filter(e=>{if(!e.startDateTime||!e.endDateTime)return false;const s=new Date(e.startDateTime),en=new Date(e.endDateTime);return s<to&&en>from});return {name,time,conflicts}});host.innerHTML='<div class="prayer-schedule-title"><b>Prayer anchors</b><span>Preparation '+settings.preparationMinutes+'m · Prayer '+settings.prayerDuration+'m</span></div>'+prayerRows.map(x=>'<div class="prayer-anchor"><b>'+x.name+'</b><time>'+fmt(x.time)+'</time><span>'+(x.conflicts.length?'<strong>Potential conflict:</strong> '+x.conflicts.map(e=>esc(e.title)).join(", "):"No detected conflict")+'</span></div>').join("");
 }
 function sleepMinutes(){const [bh,bm]=settings.bedtime.split(":").map(Number),[wh,wm]=settings.wakeTime.split(":").map(Number);return ((wh*60+wm-bh*60-bm+1440)%1440)||420}
 function checkWebNotifications(){if(window.DaybookNative?.isNative()||!("Notification"in window)||Notification.permission!=="granted"||!current?.timings)return;const now=new Date(),day=current.day;names.forEach(name=>{if(!settings.notifications[name])return;const due=zonedInstant(day,addMinutes(current.timings[name],-settings.reminderMinutes),settings.timezone),key="web-prayer:"+name+":"+day;if(due<=now&&now-due<60000&&!read(key,false)){notify(name+" prayer","It is time for "+name+" prayer.");write(key,true)}});if(settings.sleepReminder){const due=zonedInstant(day,addMinutes(settings.bedtime,-settings.sleepReminderMinutes),settings.timezone),key="web-sleep:"+day;if(due<=now&&now-due<60000&&!read(key,false)){notify("Bedtime routine","Prepare for sleep. Wake-up: "+fmt(settings.wakeTime));write(key,true)}}}
 function notify(title,body){const options={body,icon:"./icon.svg"};if("serviceWorker"in navigator)navigator.serviceWorker.ready.then(reg=>reg.showNotification(title,options)).catch(()=>{try{new Notification(title,options)}catch{}});else try{new Notification(title,options)}catch{}}
 function getNativeReminders(){
  if(!current?.timings)return [];const day=current.day,now=new Date(),out=[];
  names.forEach(name=>{if(!settings.notifications[name])return;const time=addMinutes(current.timings[name],-Math.max(0,Number(settings.reminderMinutes)||0)),at=zonedInstant(day,time,settings.timezone);if(at>now)out.push({id:"prayer-"+name+"-"+day,title:name+" prayer",date:day,time,timestamp:at.getTime()})});
  if(settings.sleepReminder){const at=zonedInstant(day,addMinutes(settings.bedtime,-settings.sleepReminderMinutes),settings.timezone);if(at>now)out.push({id:"sleep-"+day,title:"Bedtime routine",date:day,time:addMinutes(settings.bedtime,-settings.sleepReminderMinutes),timestamp:at.getTime()})}
  return out;
 }
 function openSettings(){
  const dialog=document.getElementById("settingsDialog"),fields=dialog?.querySelector(".fields");if(!fields)return;
  let panel=document.getElementById("prayerSettingsPanel");if(!panel){panel=document.createElement("section");panel.id="prayerSettingsPanel";panel.className="prayer-settings";panel.innerHTML='<h4>Prayer times & sleep</h4><div class="prayer-settings-grid"><label>City / location<input id="prayerCity" maxlength="100"></label><label>Latitude<input id="prayerLat" type="number" min="-90" max="90" step="0.0001"></label><label>Longitude<input id="prayerLon" type="number" min="-180" max="180" step="0.0001"></label><label>Timezone (IANA)<input id="prayerTz" maxlength="60" placeholder="Asia/Karachi"></label><label>Calculation method<select id="prayerMethod"><option value="1">Karachi</option><option value="2">ISNA</option><option value="3">Muslim World League</option><option value="4">Umm al-Qura</option><option value="5">Egyptian</option><option value="7">Tehran</option><option value="0">Jafari</option><option value="13">Diyanet</option></select></label><label>Asr method<select id="prayerSchool"><option value="1">Hanafi</option><option value="0">Shafi / Standard</option></select></label><label>Preparation time (minutes)<input id="prayerPrep" type="number" min="0" max="60"></label><label>Prayer duration (minutes)<input id="prayerDuration" type="number" min="1" max="180"></label><label>Reminder before prayer (minutes)<input id="prayerReminder" type="number" min="0" max="120"></label><div class="prayer-adjustments"><b>Manual timing adjustments (minutes)</b><div id="prayerOffsets"></div></div><div class="prayer-notify"><b>Prayer notifications</b><div id="prayerNotifyChecks"></div></div><div class="two"><label>Bedtime<input id="sleepBedtime" type="time"></label><label>Wake-up<input id="sleepWake" type="time"></label></div><label class="prayer-sleep-check"><input id="sleepReminder" type="checkbox"> Bedtime reminder</label><label>Bedtime reminder before (minutes)<input id="sleepReminderMinutes" type="number" min="0" max="120"></label><button type="button" id="prayerUseLocation">Use device location</button><button type="button" id="prayerSaveSettings">Save prayer & sleep settings</button><p class="muted" id="prayerSettingsStatus" role="status"></p></div>';
   fields.insertBefore(panel,fields.querySelector(".settings-note"));
  }
  panel.querySelector("#prayerCity").value=settings.city;panel.querySelector("#prayerLat").value=settings.latitude;panel.querySelector("#prayerLon").value=settings.longitude;panel.querySelector("#prayerTz").value=settings.timezone;panel.querySelector("#prayerMethod").value=settings.method;panel.querySelector("#prayerSchool").value=settings.school;panel.querySelector("#prayerPrep").value=settings.preparationMinutes;panel.querySelector("#prayerDuration").value=settings.prayerDuration;panel.querySelector("#prayerReminder").value=settings.reminderMinutes;panel.querySelector("#sleepBedtime").value=settings.bedtime;panel.querySelector("#sleepWake").value=settings.wakeTime;panel.querySelector("#sleepReminder").checked=settings.sleepReminder;panel.querySelector("#sleepReminderMinutes").value=settings.sleepReminderMinutes;
  panel.querySelector("#prayerOffsets").innerHTML=names.map(n=>'<label>'+n+' <input type="number" min="-60" max="60" data-offset="'+n+'" value="'+settings.offsets[n]+'"></label>').join("");
  panel.querySelector("#prayerNotifyChecks").innerHTML=names.map(n=>'<label><input type="checkbox" data-notify="'+n+'" '+(settings.notifications[n]?"checked":"")+'> '+n+'</label>').join("");
  panel.querySelector("#prayerUseLocation").onclick=()=>{if(!navigator.geolocation){panel.querySelector("#prayerSettingsStatus").textContent="Location is not supported on this device.";return}navigator.geolocation.getCurrentPosition(pos=>{panel.querySelector("#prayerLat").value=pos.coords.latitude.toFixed(4);panel.querySelector("#prayerLon").value=pos.coords.longitude.toFixed(4);panel.querySelector("#prayerSettingsStatus").textContent="Coordinates updated. Enter a city label and timezone if needed."},()=>{panel.querySelector("#prayerSettingsStatus").textContent="Location permission denied or unavailable."},{enableHighAccuracy:false,timeout:10000,maximumAge:300000})};
  panel.querySelector("#prayerSaveSettings").onclick=()=>{const lat=Number(panel.querySelector("#prayerLat").value),lon=Number(panel.querySelector("#prayerLon").value),tz=panel.querySelector("#prayerTz").value.trim();if(!Number.isFinite(lat)||lat<-90||lat>90||!Number.isFinite(lon)||lon<-180||lon>180||!tz){panel.querySelector("#prayerSettingsStatus").textContent="Enter valid coordinates and an IANA timezone.";return}try{new Intl.DateTimeFormat("en-US",{timeZone:tz})}catch{panel.querySelector("#prayerSettingsStatus").textContent="Timezone is not valid. Example: Asia/Karachi";return}
   settings={...settings,city:panel.querySelector("#prayerCity").value.trim()||"Custom location",latitude:lat,longitude:lon,timezone:tz,method:Number(panel.querySelector("#prayerMethod").value),school:Number(panel.querySelector("#prayerSchool").value),preparationMinutes:clamp(panel.querySelector("#prayerPrep").value,0,60),prayerDuration:clamp(panel.querySelector("#prayerDuration").value,1,180),reminderMinutes:clamp(panel.querySelector("#prayerReminder").value,0,120),bedtime:panel.querySelector("#sleepBedtime").value||"22:30",wakeTime:panel.querySelector("#sleepWake").value||"05:30",sleepReminder:panel.querySelector("#sleepReminder").checked,sleepReminderMinutes:clamp(panel.querySelector("#sleepReminderMinutes").value,0,120)};
   panel.querySelectorAll("[data-offset]").forEach(x=>settings.offsets[x.dataset.offset]=clamp(x.value,-60,60));panel.querySelectorAll("[data-notify]").forEach(x=>settings.notifications[x.dataset.notify]=x.checked);
   if(!write(KEY,settings)){panel.querySelector("#prayerSettingsStatus").textContent="Could not save settings on this device.";return}
   current=null;panel.querySelector("#prayerSettingsStatus").textContent="Settings saved.";const now=new Date();load(dateInZone(now,settings.timezone),true);
  };
  if(!dialog.open)dialog.showModal();
 }
 function clamp(v,min,max){const n=Number(v);return Number.isFinite(n)?Math.max(min,Math.min(max,n)):min}
 function init(){
  const home=document.querySelector("#overview .home-welcome");if(home&&!document.getElementById("daybookPrayerWidget")){const section=document.createElement("section");section.className="daybook-prayer-widget";section.id="daybookPrayerWidget";home.insertAdjacentElement("afterend",section)}
  const agenda=document.querySelector("#schedule .schedule-section");if(agenda&&!document.getElementById("daybookPrayerSchedule")){const section=document.createElement("section");section.id="daybookPrayerSchedule";section.className="daybook-prayer-schedule";agenda.append(section)}
  const open=document.getElementById("settingsBtn");if(open)open.addEventListener("click",()=>setTimeout(()=>{if(document.getElementById("prayerSettingsPanel"))return},0));
  document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible")refreshDate()});
  window.addEventListener("online",()=>load(dateInZone(new Date(),settings.timezone),true));
  lastDate=dateInZone(new Date(),settings.timezone);load(lastDate);
  setInterval(()=>{refreshDate();render();checkWebNotifications()},60000);
 }
 function refreshDate(){const day=dateInZone(new Date(),settings.timezone);if(day!==lastDate){lastDate=day;current=null;load(day)}}
 const originalOpen=document.getElementById("settingsBtn");if(originalOpen)originalOpen.addEventListener("click",()=>setTimeout(openSettings,0));
 window.DaybookPrayer={getSettings:()=>clone(settings),getNativeReminders,getPrayerIntervals:(day)=>{if(!current?.timings||current.day!==day)return [];return names.map(n=>{const at=zonedInstant(day,current.timings[n],settings.timezone);return {start:new Date(at.getTime()-settings.preparationMinutes*60000),end:new Date(at.getTime()+settings.prayerDuration*60000),name:n}})},refresh:()=>load(dateInZone(new Date(),settings.timezone),true),openSettings};
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();