"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const source=fs.readFileSync("persistence.js","utf8");
const JOURNAL="daybook_write_journal_v1";
const SCHEMA="daybook_schema_version";
function harness(seed={},fault=null){
 const map=new Map(Object.entries(seed).map(([k,v])=>[k,String(v)]));
 let armed=fault, counts={set:new Map(),get:new Map(),remove:new Map()};
 const hit=(op,key)=>{const id=op+":"+key,n=(counts[op].get(key)||0)+1;counts[op].set(key,n);if(armed&&armed(op,key,n))throw Error("Injected "+id+" #"+n)};
 const native={
  get length(){return map.size},key:i=>[...map.keys()][i]??null,
  getItem(key){hit("get",key);return map.has(key)?map.get(key):null},
  setItem(key,value){hit("set",key);map.set(key,String(value))},
  removeItem(key){hit("remove",key);map.delete(key)}
 };
 const win={localStorage:native};
 new Function("window","Blob","crypto",source)(win,class BlobMock{constructor(parts,options){this.parts=parts;this.type=options.type}},undefined);
 return {map,native,api:win.DaybookPersistence,arm(fn){armed=fn;counts={set:new Map(),get:new Map(),remove:new Map()}},disarm(){armed=null;counts={set:new Map(),get:new Map(),remove:new Map()}},counts};
}
function makeV4(api,changes={}){
 const blob=api.exportFile(),file=JSON.parse(blob.parts.join(""));
 for(const [key,value] of Object.entries(changes)){
  file.data[key]=value;
  const item=file.manifest.find(x=>x.key===key);
  item.status=(Array.isArray(value)&&value.length===0)||(value&&typeof value==="object"&&!Array.isArray(value)&&Object.keys(value).length===0)?"empty":"populated";
 }
 return {size:JSON.stringify(file).length,text:async()=>JSON.stringify(file)};
}
function seedData(){return {
 daybook_subjects:JSON.stringify(["before-subject"]),
 daybook_tasks:JSON.stringify([{id:"before",title:"Before"}]),
 daybook_classes:JSON.stringify([{id:"class-before"}]),
 daybook_schema_version:"1",
 daybook_routineVersion:"3",
 daybook_prayer_cache_v1:JSON.stringify({cache:true})
}}
async function rejected(promise,pattern){await assert.rejects(promise,pattern)}
(async()=>{
 // Happy path: exact values replace, protected metadata and cache remain untouched.
 const ok=harness(seedData()),backup=makeV4(ok.api,{daybook_subjects:["after-subject"],daybook_tasks:[{id:"after",title:"After"}],daybook_classes:[]});
 const result=await ok.api.importFile(backup,()=>true);
 assert.equal(result.cancelled,false);
 assert.deepEqual(JSON.parse(ok.map.get("daybook_subjects")),["after-subject"]);
 assert.deepEqual(JSON.parse(ok.map.get("daybook_tasks")),[{id:"after",title:"After"}]);
 assert.equal(ok.map.get("daybook_classes"),"[]");
 for(const key of [SCHEMA,"daybook_routineVersion","daybook_prayer_cache_v1"])assert.equal(ok.map.get(key),seedData()[key],"Protected metadata/cache must not be modified");
 assert.equal(ok.map.has(JOURNAL),false);

 // Journal creation and journal read-back failures happen before application writes.
 for(const [label,fault] of [
  ["journal creation",(op,key,n)=>op==="set"&&key===JOURNAL&&n===1],
  ["journal verification",(op,key,n)=>op==="get"&&key===JOURNAL&&n===2]
 ]){
  const h=harness(seedData());const b=makeV4(h.api,{daybook_tasks:[{id:"new"}]});h.arm(fault);
  await rejected(h.api.importFile(b,()=>true),/Injected|verification/i);
  assert.equal(h.map.get("daybook_tasks"),seedData().daybook_tasks,label+" must not change application data");
 }

 // Replacement-write and post-write verification failures roll back.
 for(const [label,fault] of [
  ["first replacement write",(op,key,n)=>op==="set"&&key==="daybook_subjects"&&n===1],
  ["middle replacement write",(op,key,n)=>op==="set"&&key==="daybook_tasks"&&n===1],
  ["post-write verification",(op,key,n)=>op==="get"&&key==="daybook_subjects"&&n===2]
 ]){
  const h=harness(seedData()),b=makeV4(h.api,{daybook_subjects:["incoming"],daybook_tasks:[{id:"incoming"}]});h.arm(fault);
  await rejected(h.api.importFile(b,()=>true),/Injected|verification/i);
  for(const key of ["daybook_subjects","daybook_tasks","daybook_classes"])assert.equal(h.map.get(key),seedData()[key],label+" must restore prior value");
  assert.equal(h.map.has(JOURNAL),false,label+" should clear a verified rollback journal");
 }

 // Commit-state write failure rolls back all modified stores.
 {
  const h=harness(seedData()),b=makeV4(h.api,{daybook_tasks:[{id:"new"}]});
  h.arm((op,key,n)=>op==="set"&&key===JOURNAL&&n===3);
  await rejected(h.api.importFile(b,()=>true),/Injected/i);
  assert.equal(h.map.get("daybook_tasks"),seedData().daybook_tasks);
  assert.equal(h.map.has(JOURNAL),false);
 }

 // An incomplete rollback keeps the journal; a fresh persistence context completes it.
 {
  const h=harness(seedData()),b=makeV4(h.api,{daybook_subjects:["incoming"],daybook_tasks:[{id:"incoming"}]});
  h.arm((op,key,n)=>op==="set"&&key==="daybook_subjects"&&(n===1||n===2));
  await rejected(h.api.importFile(b,()=>true),/Injected/i);
  assert.equal(h.map.has(JOURNAL),true,"Failed rollback must retain recovery information");
  assert.equal(h.api.getHealth().blocked,true);
  h.disarm();
  const fresh=harness(Object.fromEntries(h.map));
  assert.equal(fresh.api.getHealth().blocked,false);
  assert.equal(fresh.api.getHealth().recovered,true);
  for(const key of ["daybook_subjects","daybook_tasks","daybook_classes"])assert.equal(fresh.map.get(key),seedData()[key],"Fresh-context recovery must restore exact pre-import values");
  assert.equal(fresh.map.has(JOURNAL),false);
  const again=harness(Object.fromEntries(fresh.map));
  assert.equal(again.api.getHealth().blocked,false,"Repeated startup must remain safe");
 }

 // A failure to verify rollback retains a retryable journal.
 {
  const h=harness(seedData()),b=makeV4(h.api,{daybook_tasks:[{id:"incoming"}]});
  h.arm((op,key,n)=>(op==="set"&&key==="daybook_tasks"&&n===1)||(op==="get"&&key==="daybook_tasks"&&n===2));
  await rejected(h.api.importFile(b,()=>true),/Injected/i);
  assert.equal(h.map.has(JOURNAL),true,"Rollback verification failure must retain journal");
  h.disarm();
  const fresh=harness(Object.fromEntries(h.map));
  assert.equal(fresh.api.getHealth().recovered,true);
  assert.equal(fresh.map.get("daybook_tasks"),seedData().daybook_tasks);
 }

 // A committed transaction survives a failed cleanup and is finalized by a new context.
 {
  const h=harness(seedData()),b=makeV4(h.api,{daybook_tasks:[{id:"committed"}]});
  h.arm((op,key,n)=>op==="remove"&&key===JOURNAL&&n===1);
  await rejected(h.api.importFile(b,()=>true),/Injected|cleanup/i);
  assert.equal(JSON.parse(h.map.get("daybook_tasks"))[0].id,"committed");
  assert.equal(h.map.has(JOURNAL),true);
  h.disarm();
  const fresh=harness(Object.fromEntries(h.map));
  assert.equal(JSON.parse(fresh.map.get("daybook_tasks"))[0].id,"committed","Committed state must be preserved at startup");
  assert.equal(fresh.map.has(JOURNAL),false);
 }

 // Simulate a process termination after one store write: no catch/rollback runs.
 // A newly evaluated persistence module must recover from the durable journal alone.
 {
  const seed=seedData(),before={},after={};
  const keys=["daybook_subjects","daybook_tasks","daybook_classes"];
  for(const key of keys){before[key]={present:Object.prototype.hasOwnProperty.call(seed,key),raw:seed[key]??null};after[key]={present:true,raw:JSON.stringify(key==="daybook_subjects"?["crash-new"]:key==="daybook_tasks"?[{id:"crash-new"}]:[])}}
  const journal={format:"daybook-restore",version:2,operationId:"fresh-context-crash-test",state:"applying",keys,before,after};
  const payload={...journal};const encoded=JSON.stringify(payload);let hash=2166136261;
  for(let i=0;i<encoded.length;i++){hash^=encoded.charCodeAt(i);hash=Math.imul(hash,16777619)}
  journal.checksum=(hash>>>0).toString(16).padStart(8,"0");
  const crashed={...seed,daybook_subjects:after.daybook_subjects.raw,daybook_write_journal_v1:JSON.stringify(journal)};
  const fresh=harness(crashed);
  assert.equal(fresh.api.getHealth().recovered,true,"Fresh context must detect and recover an interrupted applying transaction");
  for(const key of keys)assert.equal(fresh.map.get(key),seed[key]??null,"Fresh-context crash recovery must restore the exact prior key state");
  assert.equal(fresh.map.has(JOURNAL),false);
  const repeat=harness(Object.fromEntries(fresh.map));
  assert.equal(repeat.api.getHealth().blocked,false);
  assert.equal(repeat.api.getHealth().recovered,false,"Repeated startup after completed recovery must be idempotent");
 }
 // Previously absent keys are represented explicitly and restored as absent.
 {
  const h=harness({daybook_tasks:JSON.stringify([{id:"before"}])});
  const blob=makeV4(h.api,{daybook_tasks:[{id:"after"}]});
  await h.api.importFile(blob,()=>true);
  const journal={format:"daybook-restore",version:2,operationId:"absent-key-recovery",state:"applying",keys:["daybook_tasks","daybook_focus"],before:{daybook_tasks:{present:true,raw:JSON.stringify([{id:"before"}])},daybook_focus:{present:false,raw:null}},after:{daybook_tasks:{present:true,raw:JSON.stringify([{id:"after"}])},daybook_focus:{present:true,raw:"{}"}}};
  const payload={...journal};let hash=2166136261;const encoded=JSON.stringify(payload);for(let i=0;i<encoded.length;i++){hash^=encoded.charCodeAt(i);hash=Math.imul(hash,16777619)}journal.checksum=(hash>>>0).toString(16).padStart(8,"0");
  h.map.set("daybook_focus","{}");h.map.set(JOURNAL,JSON.stringify(journal));
  const fresh=harness(Object.fromEntries(h.map));
  assert.equal(fresh.map.has("daybook_focus"),false,"Recovery must restore a previously absent key as absent");
  assert.deepEqual(JSON.parse(fresh.map.get("daybook_tasks")),[{id:"before"}]);
 }
 // Legacy restore preview must explicitly describe partial compatibility behavior.
 {
  const h=harness(seedData());
  const legacy={size:100,text:async()=>JSON.stringify({app:"Daybook",version:3,exportedAt:"2026-11-20T00:00:00.000Z",data:{daybook_tasks:[{id:"legacy-preview",title:"Legacy import"}]}})};
  let preview="";
  const result=await h.api.importFile(legacy,message=>{preview=message;return true});
  assert.equal(result.cancelled,false);
  assert.match(preview,/LEGACY V3 COMPATIBILITY IMPORT/);
  assert.match(preview,/only stores present in this backup/i);
  assert.match(preview,/absent from the backup remain unchanged/i);
  assert.match(preview,/daybook_tasks/);
  assert.deepEqual(JSON.parse(h.map.get("daybook_subjects")),JSON.parse(seedData().daybook_subjects),"Legacy preview import must preserve absent stores");
 }

 // Invalid journal blocks writes without changing application data.
 {
  const h=harness(seedData());h.map.set(JOURNAL,JSON.stringify({format:"daybook-restore",version:2,state:"applying",keys:["daybook_tasks"],before:{},after:{},checksum:"bad"}));
  const fresh=harness(Object.fromEntries(h.map));
  assert.equal(fresh.api.getHealth().blocked,true);
  assert.equal(fresh.map.get("daybook_tasks"),seedData().daybook_tasks);
  assert.throws(()=>fresh.api.storage.setItem("daybook_tasks","[]"),/paused|blocked/i);
  assert.equal(fresh.map.has(JOURNAL),true);
 }

 // Cancellation and invalid backups never begin a transaction.
 {
  const h=harness(seedData()),b=makeV4(h.api,{daybook_tasks:[{id:"not-applied"}]});
  const cancelled=await h.api.importFile(b,()=>false);
  assert.equal(cancelled.cancelled,true);assert.equal(h.map.get("daybook_tasks"),seedData().daybook_tasks);assert.equal(h.map.has(JOURNAL),false);
  const invalid={size:20,text:async()=>JSON.stringify({app:"Daybook",version:4,appId:"daybook",schemaVersion:1,sourceSchemaVersion:1,exportedAt:new Date().toISOString(),manifest:[],data:{}})};
  await rejected(h.api.importFile(invalid,()=>true),/manifest/i);
  assert.equal(h.map.get("daybook_tasks"),seedData().daybook_tasks);
 }
 console.log("Transactional restore, failure injection and fresh-context recovery checks passed.");
})().catch(error=>{console.error(error);process.exitCode=1});
