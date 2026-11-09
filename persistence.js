"use strict";
(function(root){
 const PREFIX="daybook_",JOURNAL=PREFIX+"write_journal_v1",SCHEMA=PREFIX+"schema_version",VERSION=1;
 const native=root.localStorage;
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
   try{
    rawSet(JOURNAL,JSON.stringify(journal));rawSet(key,value);
    if(native.getItem(key)!==value)throw Error("Storage read-back verification failed");
    journal.phase="committed";rawSet(JOURNAL,JSON.stringify(journal));native.removeItem(JOURNAL);healthy=true;
   }catch(error){
    try{if(previous===null)native.removeItem(key);else rawSet(key,previous);native.removeItem(JOURNAL)}catch(rollbackError){healthy=false;blocked=true}
    throw error;
   }
  },
  removeItem(key){key=String(key);if(blocked)throw Error("Storage writes are paused because recovery needs attention");const previous=native.getItem(key);if(previous===null)return;const journal={version:1,phase:"pending",changes:[{key,previous,next:null}]};try{rawSet(JOURNAL,JSON.stringify(journal));native.removeItem(key);journal.phase="committed";rawSet(JOURNAL,JSON.stringify(journal));native.removeItem(JOURNAL)}catch(error){try{rawSet(key,previous);native.removeItem(JOURNAL)}catch(rollbackError){healthy=false;blocked=true}throw error}},
  key(index){return native.key(index)},
  get length(){return native.length}
 };
 function keys(){const out=[];for(let i=0;i<storage.length;i++){const k=storage.key(i);if(k&&k.startsWith(PREFIX)&&k!==JOURNAL)out.push(k)}return out.sort()}
 function snapshot(){const data={};for(const key of keys()){const raw=storage.getItem(key);try{data[key]=JSON.parse(raw)}catch(e){data[key]={__rawStorageValue:raw}}}return data}
 function validateBackup(file){
  if(!file||typeof file!=="object"||Array.isArray(file)||file.app!=="Daybook"||![1,2,3].includes(Number(file.version)))throw Error("Unsupported or invalid Daybook backup");
  if(!file.data||typeof file.data!=="object"||Array.isArray(file.data))throw Error("Backup has no data section");
  const entries={};
  const legacy=["subjects","classes","routine","tasks","sessions","reminders","goal","settings","routineVersion"];
  const source={...file.data};
  if(Number(file.version)<3){
   for(const key of legacy)if(Object.prototype.hasOwnProperty.call(source,key)){source[PREFIX+key]=source[key];delete source[key]}
   if(file.extensions&&typeof file.extensions==="object")for(const key of ["academic_courses","academic_assessments","habits","habit_checks","finance"])if(Object.prototype.hasOwnProperty.call(file.extensions,key))source[PREFIX+key]=file.extensions[key];
  }
  for(const [key,value] of Object.entries(source)){
   if(!key.startsWith(PREFIX)||key===JOURNAL)throw Error("Backup contains an unsupported storage key: "+key);
   if(value&&typeof value==="object"&&Object.prototype.hasOwnProperty.call(value,"__rawStorageValue"))throw Error("Backup contains an unreadable record: "+key);
   entries[key]=JSON.stringify(value);
  }
  if(!Object.keys(entries).length)throw Error("Backup contains no planner records");
  return entries;
 }
 function apply(entries){
  const changes=Object.keys(entries).map(key=>({key,previous:native.getItem(key),next:entries[key]}));
  const journal={version:1,phase:"pending",changes};
  try{
   rawSet(JOURNAL,JSON.stringify(journal));
   for(const c of changes){rawSet(c.key,c.next);if(native.getItem(c.key)!==c.next)throw Error("Could not verify "+c.key)}
   journal.phase="committed";rawSet(JOURNAL,JSON.stringify(journal));native.removeItem(JOURNAL);healthy=true;return true;
  }catch(error){
   try{for(const c of changes){if(c.previous===null)native.removeItem(c.key);else rawSet(c.key,c.previous)}native.removeItem(JOURNAL)}catch(rollbackError){healthy=false;blocked=true}
   throw error;
  }
 }
 function exportFile(){
  const data=snapshot();const backup={app:"Daybook",version:3,exportedAt:new Date().toISOString(),schemaVersion:VERSION,data};
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
