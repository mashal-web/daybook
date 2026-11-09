"use strict";
(function(root){
 const PREFIX="daybook_",JOURNAL=PREFIX+"write_journal_v1",SCHEMA=PREFIX+"schema_version",VERSION=1;
 const native=root.localStorage;
 let healthy=true,recovered=false;
 function rawSet(key,value){native.setItem(key,value)}
 function recover(){
  let raw;try{raw=native.getItem(JOURNAL)}catch(e){healthy=false;return}
  if(!raw)return;
  try{const j=JSON.parse(raw);if(!j||j.version!==1||!Array.isArray(j.changes))throw Error("Invalid recovery journal");
   if(j.phase!=="committed")for(const c of j.changes){if(c.previous===null)native.removeItem(c.key);else rawSet(c.key,c.previous)}
   native.removeItem(JOURNAL);recovered=true;
  }catch(e){healthy=false}
 }
 try{recover()}catch(e){healthy=false}
 const storage={
  getItem(key){return native.getItem(String(key))},
  setItem(key,value){
   key=String(key);value=String(value);
   if(key===JOURNAL)throw Error("Reserved storage key");
   const previous=native.getItem(key),journal={version:1,phase:"pending",changes:[{key,previous,next:value}]};
   try{
    rawSet(JOURNAL,JSON.stringify(journal));rawSet(key,value);
    if(native.getItem(key)!==value)throw Error("Storage read-back verification failed");
    journal.phase="committed";rawSet(JOURNAL,JSON.stringify(journal));native.removeItem(JOURNAL);healthy=true;
   }catch(error){
    try{if(previous===null)native.removeItem(key);else rawSet(key,previous);native.removeItem(JOURNAL)}catch(rollbackError){healthy=false}
    throw error;
   }
  },
  removeItem(key){key=String(key);const previous=native.getItem(key);if(previous===null)return;this.setItem(key,"");native.removeItem(key)},
  key(index){return native.key(index)},
  get length(){return native.length}
 };
 function keys(){const out=[];for(let i=0;i<storage.length;i++){const k=storage.key(i);if(k&&k.startsWith(PREFIX)&&k!==JOURNAL)out.push(k)}return out.sort()}
 function snapshot(){const data={};for(const key of keys()){const raw=storage.getItem(key);try{data[key]=JSON.parse(raw)}catch(e){data[key]={__rawStorageValue:raw}}}return data}
 function validateBackup(file){
  if(!file||typeof file!=="object"||Array.isArray(file)||file.app!=="Daybook"||![1,2,3].includes(Number(file.version)))throw Error("Unsupported or invalid Daybook backup");
  if(!file.data||typeof file.data!=="object"||Array.isArray(file.data))throw Error("Backup has no data section");
  const entries={};
  for(const [key,value] of Object.entries(file.data)){
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
   try{for(const c of changes){if(c.previous===null)native.removeItem(c.key);else rawSet(c.key,c.previous)}native.removeItem(JOURNAL)}catch(rollbackError){healthy=false}
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
 root.DaybookPersistence={storage,snapshot,exportFile,importFile,validateBackup,getHealth:()=>({healthy,recovered,version:VERSION}),storageKeys:keys};
})(window);
