"use strict";
(function(root){
 const PREFIX="daybook_",JOURNAL=PREFIX+"write_journal_v1",SCHEMA=PREFIX+"schema_version",VERSION=1;
 const native=root.localStorage;
 const STORES={
  daybook_subjects:"strings",daybook_classes:"array",daybook_routine:"array",daybook_tasks:"array",
  daybook_sessions:"array",daybook_reminders:"array",daybook_goal:"number",daybook_settings:"object",
  daybook_focus:"object",daybook_schedule_v1:"schedule",daybook_academic_courses:"array",
  daybook_academic_assessments:"array",daybook_habits:"array",daybook_habit_checks:"object",
  daybook_finance:"finance",daybook_prayer_settings_v1:"object",daybook_prayer_log_v1:"object",
  daybook_flexible_activities_v1:"array"
 };
 const EMPTY={
  daybook_subjects:[],daybook_classes:[],daybook_routine:[],daybook_tasks:[],daybook_sessions:[],
  daybook_reminders:[],daybook_goal:10,daybook_settings:{},daybook_focus:{},
  daybook_schedule_v1:{version:3,events:[],exceptions:[],tasks:[]},
  daybook_academic_courses:[],daybook_academic_assessments:[],daybook_habits:[],
  daybook_habit_checks:{},daybook_finance:{budget:0,transactions:[]},
  daybook_prayer_settings_v1:{},daybook_prayer_log_v1:{},daybook_flexible_activities_v1:[]
 };
 const LEGACY=["subjects","classes","routine","tasks","sessions","reminders","goal","settings","routineVersion"];
 const EXTENSIONS=["academic_courses","academic_assessments","habits","habit_checks","finance"];
 let healthy=true,recovered=false,blocked=false;
 function rawSet(key,value){native.setItem(key,value)}
 function recover(){
  let raw;try{raw=native.getItem(JOURNAL)}catch(e){healthy=false;blocked=true;return}
  if(!raw)return;
  try{const j=JSON.parse(raw);if(!j||j.version!==1||!Array.isArray(j.changes))throw Error("Invalid recovery journal");
   if(j.phase!=="committed")for(const c of j.changes){if(c.previous===null)native.removeItem(c.key);else rawSet(c.key,c.previous)}
   native.removeItem(JOURNAL);recovered=true;
  }catch(e){healthy=false;blocked=true}
 }
 try{recover()}catch(e){healthy=false;blocked=true}
 const storage={
  getItem(key){return native.getItem(String(key))},
  setItem(key,value){
   key=String(key);value=String(value);
   if(key.startsWith(PREFIX)){try{JSON.parse(value)}catch(e){throw Error("Stored Daybook values must be valid JSON: "+key)}}
   if(blocked)throw Error("Storage writes are paused because recovery needs attention");
   if(key===JOURNAL)throw Error("Reserved storage key");
   const previous=native.getItem(key);
   if(previous!==null&&key.startsWith(PREFIX)){try{JSON.parse(previous)}catch(e){throw Error("Refusing to overwrite unreadable stored data: "+key)}}
   const journal={version:1,phase:"pending",changes:[{key,previous,next:value}]};
   try{rawSet(JOURNAL,JSON.stringify(journal));rawSet(key,value);if(native.getItem(key)!==value)throw Error("Storage read-back verification failed");journal.phase="committed";rawSet(JOURNAL,JSON.stringify(journal));native.removeItem(JOURNAL);healthy=true}
   catch(error){try{if(previous===null)native.removeItem(key);else rawSet(key,previous);native.removeItem(JOURNAL)}catch(rollbackError){healthy=false;blocked=true}throw error}
  },
  removeItem(key){key=String(key);if(blocked)throw Error("Storage writes are paused because recovery needs attention");const previous=native.getItem(key);if(previous===null)return;const journal={version:1,phase:"pending",changes:[{key,previous,next:null}]};try{rawSet(JOURNAL,JSON.stringify(journal));native.removeItem(key);journal.phase="committed";rawSet(JOURNAL,JSON.stringify(journal));native.removeItem(JOURNAL)}catch(error){try{rawSet(key,previous);native.removeItem(JOURNAL)}catch(rollbackError){healthy=false;blocked=true}throw error}},
  key(index){return native.key(index)},get length(){return native.length}
 };
 function keys(){return Object.keys(STORES)}
 function readValue(key){const raw=native.getItem(key);if(raw===null)return structuredCloneSafe(EMPTY[key]);try{return JSON.parse(raw)}catch(e){throw Error("Stored Daybook data is unreadable: "+key)}}
 function structuredCloneSafe(value){return JSON.parse(JSON.stringify(value))}
 function isObject(value){return value!==null&&typeof value==="object"&&!Array.isArray(value)}
 function isEmpty(key,value){
  const type=STORES[key];
  if(type==="array"||type==="strings")return Array.isArray(value)&&value.length===0;
  if(type==="object")return isObject(value)&&Object.keys(value).length===0;
  if(type==="schedule")return isObject(value)&&Array.isArray(value.events)&&Array.isArray(value.exceptions||[])&&Array.isArray(value.tasks)&&!value.events.length&&!(value.exceptions||[]).length&&!value.tasks.length;
  if(type==="finance")return isObject(value)&&Number(value.budget||0)===0&&Array.isArray(value.transactions)&&value.transactions.length===0;
  return false;
 }
 function validValue(key,value){
  const type=STORES[key];
  if(value&&typeof value==="object"&&Object.prototype.hasOwnProperty.call(value,"__rawStorageValue"))return false;
  if(type==="array")return Array.isArray(value)&&value.every(isObject);
  if(type==="strings")return Array.isArray(value)&&value.every(item=>typeof item==="string");
  if(type==="object")return isObject(value);
  if(type==="number")return typeof value==="number"&&Number.isFinite(value)&&value>=1&&value<=100;
  if(type==="schedule")return isObject(value)&&[1,2,3].includes(Number(value.version))&&Array.isArray(value.events)&&Array.isArray(value.tasks)&&(value.exceptions===undefined||Array.isArray(value.exceptions));
  if(type==="finance")return isObject(value)&&Number.isFinite(Number(value.budget))&&Number(value.budget)>=0&&Array.isArray(value.transactions);
  return false;
 }
 function snapshot(){const data={};for(const key of keys())data[key]=readValue(key);return data}
 function validateV4(file){
  if(file.appId!=="daybook"||file.schemaVersion!==VERSION||file.sourceSchemaVersion!==VERSION||typeof file.exportedAt!=="string"||!Number.isFinite(Date.parse(file.exportedAt)))throw Error("Invalid version-4 backup envelope");
  if(!Array.isArray(file.manifest)||!isObject(file.data))throw Error("Version-4 backup requires a manifest and data object");
  const seen=new Set(),entries={};
  for(const item of file.manifest){
   if(!isObject(item)||typeof item.key!=="string"||!Object.prototype.hasOwnProperty.call(STORES,item.key)||seen.has(item.key))throw Error("Invalid, duplicate, or unsupported manifest entry");
   seen.add(item.key);
   if(!["empty","populated","unsupported"].includes(item.status))throw Error("Invalid manifest status: "+item.key);
   const has=Object.prototype.hasOwnProperty.call(file.data,item.key);
   if(item.status==="unsupported"){if(has)throw Error("Unsupported manifest entry must not contain data: "+item.key);continue}
   if(!has||!validValue(item.key,file.data[item.key]))throw Error("Missing or invalid manifest data: "+item.key);
   const empty=isEmpty(item.key,file.data[item.key]);
   if((item.status==="empty")!==empty)throw Error("Manifest/data status mismatch: "+item.key);
   entries[item.key]=JSON.stringify(file.data[item.key]);
  }
  if(seen.size!==keys().length||keys().some(key=>!seen.has(key)))throw Error("Version-4 manifest is incomplete");
  for(const key of Object.keys(file.data))if(!seen.has(key)||!Object.prototype.hasOwnProperty.call(STORES,key))throw Error("Unmanifested or unsupported data key: "+key);
  if(!Object.keys(entries).length)throw Error("Backup contains no supported stores");
  return entries;
 }
 function validateLegacy(file,version){
  if(!isObject(file.data))throw Error("Backup has no data section");
  const source={...file.data},entries={};
  if(version<=2){
   const allowed=new Set([...LEGACY,...EXTENSIONS]);
   for(const [key,value] of Object.entries(source)){
    if(key==="routineVersion"){if(!Number.isInteger(value)||value<0||value>3)throw Error("Invalid legacy routine metadata");continue}
    if(key===SCHEMA){if(value!==1)throw Error("Invalid historical schema metadata");continue}
    if(key==="daybook_routineVersion"){if(!Number.isInteger(value)||value<0||value>3)throw Error("Invalid historical routine metadata");continue}
    if(key==="daybook_prayer_cache_v1"){if(!isObject(value))throw Error("Invalid historical prayer cache");continue}
    const target=key.startsWith(PREFIX)?key:PREFIX+key;
    if(!allowed.has(key)&&!Object.prototype.hasOwnProperty.call(STORES,target))throw Error("Unsupported legacy backup key: "+key);
    if(!Object.prototype.hasOwnProperty.call(STORES,target))throw Error("Unsupported legacy data key: "+key);
    if(value&&typeof value==="object"&&Object.prototype.hasOwnProperty.call(value,"__rawStorageValue"))throw Error("Backup contains an unreadable record: "+key);
    if(!validValue(target,value))throw Error("Invalid legacy data: "+key);
    entries[target]=JSON.stringify(value);
   }
   if(file.extensions!==undefined){
    if(!isObject(file.extensions))throw Error("Invalid legacy extensions");
    for(const key of Object.keys(file.extensions)){
     if(!EXTENSIONS.includes(key))throw Error("Unsupported legacy extension: "+key);
     const target=PREFIX+key;if(!validValue(target,file.extensions[key]))throw Error("Invalid legacy extension data: "+key);
     entries[target]=JSON.stringify(file.extensions[key]);
    }
   }
  }else{
   for(const [key,value] of Object.entries(source)){
    if(key===SCHEMA){if(value!==1)throw Error("Invalid historical schema metadata");continue}
    if(key==="daybook_routineVersion"){if(!Number.isInteger(value)||value<0||value>3)throw Error("Invalid historical routine metadata");continue}
    if(key==="daybook_prayer_cache_v1"){if(!isObject(value))throw Error("Invalid historical prayer cache");continue}
    if(!Object.prototype.hasOwnProperty.call(STORES,key))throw Error("Backup contains an unsupported storage key: "+key);
    if(!validValue(key,value))throw Error("Invalid historical data: "+key);
    entries[key]=JSON.stringify(value);
   }
  }
  if(!Object.keys(entries).length)throw Error("Backup contains no supported planner records");
  return entries;
 }
 function validateBackup(file){
  if(!isObject(file)||file.app!=="Daybook"||![1,2,3,4].includes(Number(file.version)))throw Error("Unsupported or invalid Daybook backup");
  return Number(file.version)===4?validateV4(file):validateLegacy(file,Number(file.version));
 }
 function apply(entries){
  const changes=Object.keys(entries).map(key=>({key,previous:native.getItem(key),next:entries[key]}));
  const journal={version:1,phase:"pending",changes};
  try{rawSet(JOURNAL,JSON.stringify(journal));for(const c of changes){rawSet(c.key,c.next);if(native.getItem(c.key)!==c.next)throw Error("Could not verify "+c.key)}journal.phase="committed";rawSet(JOURNAL,JSON.stringify(journal));native.removeItem(JOURNAL);healthy=true;return true}
  catch(error){try{for(const c of changes){if(c.previous===null)native.removeItem(c.key);else rawSet(c.key,c.previous)}native.removeItem(JOURNAL)}catch(rollbackError){healthy=false;blocked=true}throw error}
 }
 function exportFile(){
  const data=snapshot(),manifest=keys().map(key=>({key,status:isEmpty(key,data[key])?"empty":"populated"}));
  const backup={app:"Daybook",appId:"daybook",version:4,exportedAt:new Date().toISOString(),schemaVersion:VERSION,sourceSchemaVersion:VERSION,manifest,data};
  validateBackup(backup);
  return new Blob([JSON.stringify(backup,null,2)],{type:"application/json"});
 }
 async function importFile(file,confirmFn){
  if(!file)throw Error("Choose a backup file first");
  if(file.size>10*1024*1024)throw Error("Backup file exceeds the 10 MB limit");
  const parsed=JSON.parse(await file.text()),entries=validateBackup(parsed),count=Object.keys(entries).length;
  if(typeof confirmFn!=="function"||!confirmFn("This backup contains "+count+" stored data groups from "+(parsed.exportedAt||"an earlier export")+". Replacing Daybook data on this device will overwrite current records. Export your current data first. Continue?"))return {cancelled:true,count};
  apply(entries);return {cancelled:false,count};
 }
 try{if(native.getItem(SCHEMA)===null)storage.setItem(SCHEMA,JSON.stringify(VERSION))}catch(e){healthy=false}
 root.DaybookPersistence={storage,snapshot,exportFile,importFile,validateBackup,getHealth:()=>({healthy,blocked,recovered,version:VERSION}),storageKeys:keys};
})(window);
