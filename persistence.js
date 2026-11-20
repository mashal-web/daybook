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
 let healthy=true,recovered=false,blocked=false,recoveryError=null;
 function rawSet(key,value){native.setItem(key,value)}
 function checksum(value){
  let hash=2166136261;
  for(let i=0;i<value.length;i++){hash^=value.charCodeAt(i);hash=Math.imul(hash,16777619)}
  return (hash>>>0).toString(16).padStart(8,"0");
 }
 function journalPayload(j){const copy={...j};delete copy.checksum;return JSON.stringify(copy)}
 function sealJournal(j){j.checksum=checksum(journalPayload(j));return j}
 function validateJournal(j){
  if(!isObject(j)||j.format!=="daybook-restore"||j.version!==2||typeof j.operationId!=="string"||!j.operationId||!["prepared","applying","committed"].includes(j.state)||!Array.isArray(j.keys)||!isObject(j.before)||!isObject(j.after)||typeof j.checksum!=="string")throw Error("Invalid recovery journal structure");
  if(checksum(journalPayload(j))!==j.checksum)throw Error("Recovery journal integrity check failed");
  const seen=new Set();
  for(const key of j.keys){
   if(!Object.prototype.hasOwnProperty.call(STORES,key)||seen.has(key))throw Error("Recovery journal contains an invalid key");
   seen.add(key);
   for(const section of [j.before,j.after]){
    const item=section[key];
    if(!isObject(item)||typeof item.present!=="boolean"||(item.present?typeof item.raw!=="string":item.raw!==null))throw Error("Recovery journal contains an incomplete storage snapshot");
   }
  }
  if(Object.keys(j.before).length!==seen.size||Object.keys(j.after).length!==seen.size)throw Error("Recovery journal snapshot coverage is incomplete");
  return j;
 }
 function persistJournal(j){
  sealJournal(j);
  const serialized=JSON.stringify(j);
  rawSet(JOURNAL,serialized);
  const readback=native.getItem(JOURNAL);
  if(readback!==serialized)throw Error("Recovery journal read-back verification failed");
  validateJournal(JSON.parse(readback));
 }
 function sameSnapshot(snapshot){
  for(const key of Object.keys(snapshot)){
   const item=snapshot[key],actual=native.getItem(key);
   if(item.present?(actual!==item.raw):(actual!==null))return false;
  }
  return true;
 }
 function restoreSnapshot(snapshot){
  for(const key of Object.keys(snapshot)){
   const item=snapshot[key];
   if(item.present)rawSet(key,item.raw);else native.removeItem(key);
  }
  if(!sameSnapshot(snapshot))throw Error("Recovery rollback verification failed");
 }
 function removeJournalVerified(){
  native.removeItem(JOURNAL);
  if(native.getItem(JOURNAL)!==null)throw Error("Recovery journal cleanup verification failed");
 }
 function recover(){
  let raw;
  try{raw=native.getItem(JOURNAL)}catch(e){healthy=false;blocked=true;return}
  if(!raw)return;
  try{
   const parsed=JSON.parse(raw);
   if(parsed&&parsed.version===1&&Array.isArray(parsed.changes)){
    const seen=new Set();
    for(const c of parsed.changes){
     if(!isObject(c)||typeof c.key!=="string"||c.key===JOURNAL||seen.has(c.key)||(c.previous!==null&&typeof c.previous!=="string"))throw Error("Invalid legacy recovery journal");
     seen.add(c.key);
    }
    if(parsed.phase!=="committed"){
     for(const c of parsed.changes){if(c.previous===null)native.removeItem(c.key);else rawSet(c.key,c.previous)}
    }
    for(const c of parsed.changes)if(native.getItem(c.key)!==c.previous&&parsed.phase!=="committed")throw Error("Legacy recovery verification failed");
    removeJournalVerified();recovered=true;return;
   }
   const j=validateJournal(parsed);
   if(j.state==="committed"){
    if(!sameSnapshot(j.after))throw Error("Committed restore does not match its verified replacement state");
   }else{
    restoreSnapshot(j.before);
   }
   removeJournalVerified();
   recovered=true;
  }catch(e){healthy=false;blocked=true;recoveryError=String(e&&e.message||e)}
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
  if(blocked)throw Error("Restore is blocked because storage recovery needs attention");
  if(native.getItem(JOURNAL)!==null)throw Error("An unresolved recovery journal already exists");
  const keysToChange=Object.keys(entries);
  if(!keysToChange.length)throw Error("Backup contains no supported stores");
  for(const key of keysToChange)if(!Object.prototype.hasOwnProperty.call(STORES,key)||typeof entries[key]!=="string")throw Error("Restore plan contains an unsupported storage key");
  const before={},after={};
  for(const key of keysToChange){const previous=native.getItem(key);before[key]={present:previous!==null,raw:previous};after[key]={present:true,raw:entries[key]}}
  const operationId=typeof crypto!=="undefined"&&crypto.randomUUID?crypto.randomUUID():Date.now().toString(36)+"-"+Math.random().toString(36).slice(2);
  const journal={format:"daybook-restore",version:2,operationId,state:"prepared",keys:keysToChange,before,after};
  let committed=false,journalReady=false,preserveJournal=false;
  try{
   persistJournal(journal);journalReady=true;
   journal.state="applying";persistJournal(journal);
   for(const key of keysToChange)rawSet(key,after[key].raw);
   if(!sameSnapshot(after))throw Error("Restore replacement read-back verification failed");
   journal.state="committed";
   try{persistJournal(journal);committed=true}
   catch(commitError){
    journal.state="applying";
    try{persistJournal(journal)}catch(recoveryMarkerError){
     preserveJournal=true;healthy=false;blocked=true;
     recoveryError=String(recoveryMarkerError&&recoveryMarkerError.message||recoveryMarkerError);
    }
    throw commitError;
   }
   removeJournalVerified();
   healthy=true;blocked=false;recoveryError=null;
   return true;
  }catch(error){
   if(committed||preserveJournal)throw error;
   if(!journalReady){
    // No application key is touched until the first complete journal is verified.
    // If a write may have left an unreadable journal, retain it and block startup.
    try{if(native.getItem(JOURNAL)!==null){healthy=false;blocked=true;recoveryError="Recovery journal could not be verified and was retained"}}
    catch(readError){healthy=false;blocked=true;recoveryError="Recovery journal state could not be determined"}
    throw error;
   }
   try{
    restoreSnapshot(before);
    removeJournalVerified();
   }catch(rollbackError){
    healthy=false;blocked=true;recoveryError=String(rollbackError&&rollbackError.message||rollbackError);
   }
   throw error;
  }
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
 root.DaybookPersistence={storage,snapshot,exportFile,importFile,validateBackup,getHealth:()=>({healthy,blocked,recovered,version:VERSION,error:recoveryError}),storageKeys:keys};
})(window);
