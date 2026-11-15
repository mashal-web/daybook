const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require("playwright");

const root = path.resolve(__dirname, "..", "www");
let swRevision = "";
const mime = { ".html":"text/html", ".js":"text/javascript", ".css":"text/css", ".webmanifest":"application/manifest+json", ".png":"image/png", ".svg":"image/svg+xml" };
const server = http.createServer((req,res) => {
  const pathname = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
  const relative = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
  const file = path.resolve(root, relative);
  if (!file.startsWith(root + path.sep) && file !== path.join(root,"index.html")) { res.writeHead(403).end(); return; }
  if (relative === "sw.js" && req.method === "GET") {
    res.writeHead(200, {"Content-Type":"text/javascript","Cache-Control":"no-store","Service-Worker-Allowed":"./"});
    res.end(fs.readFileSync(file,"utf8") + swRevision); return;
  }
  fs.readFile(file,(err,data) => {
    if (err) { res.writeHead(404).end("Not found"); return; }
    res.writeHead(200, {"Content-Type":mime[path.extname(file)] || "application/octet-stream","Cache-Control":"no-cache"});
    res.end(data);
  });
});

(async()=>{
 const failures=[], checks={};
 const check=(name,ok,detail)=>{checks[name]={ok:!!ok,detail:detail||null};if(!ok)failures.push(name)};
 let browser;
 try {
  for(const f of ["index.html","manifest.webmanifest","sw.js","icon-192.png","icon-512.png","icon.svg","native.js"]) check("build-file:"+f,fs.existsSync(path.join(root,f)));
  server.listen(4173,"127.0.0.1");
  await new Promise(resolve=>server.once("listening",resolve));
  browser=await chromium.launch({headless:true,args:["--no-sandbox"]});
  const context=await browser.newContext();
  const page=await context.newPage();
  const pageErrors=[]; page.on("pageerror",e=>pageErrors.push(String(e)));
  await page.goto("http://127.0.0.1:4173/",{waitUntil:"networkidle"});
  const manifest=await page.evaluate(async()=>{
   const link=document.querySelector('link[rel="manifest"]'); if(!link)return {present:false};
   const response=await fetch(link.href); const data=await response.json();
   return {present:true,status:response.status,data,icons:await Promise.all((data.icons||[]).map(async i=>{const u=new URL(i.src,link.href);const r=await fetch(u);if(i.type==="image/svg+xml")return {src:i.src,status:r.status,width:null,height:null,type:i.type,purpose:i.purpose};const b=await createImageBitmap(await r.blob());return {src:i.src,status:r.status,width:b.width,height:b.height,type:i.type,purpose:i.purpose}}))};
  });
  check("manifest-valid",manifest.present&&manifest.status===200&&manifest.data.name&&manifest.data.short_name&&manifest.data.start_url&&manifest.data.scope&&manifest.data.display==="standalone"&&manifest.data.icons.length>=2,manifest);
  check("manifest-icons",manifest.icons?.some(i=>i.status===200&&i.width===192&&i.height===192)&&manifest.icons?.some(i=>i.status===200&&i.width===512&&i.height===512),manifest.icons);
  const sw=await page.evaluate(async()=>{
   if(!("serviceWorker" in navigator))return {supported:false};
   const reg=await navigator.serviceWorker.ready;
   return {supported:true,scope:reg.scope,active:!!reg.active,state:reg.active?.state,controller:!!navigator.serviceWorker.controller,script:reg.active?.scriptURL};
  });
  check("service-worker-active",sw.supported&&sw.active&&sw.state==="activated"&&sw.controller,sw);
  const installability=await page.evaluate(async()=>{
   const m=await navigator.serviceWorker.getRegistration();
   const link=document.querySelector('link[rel="manifest"]');
   const u=new URL("./",location.href);
   return {secure:isSecureContext,manifest:!!link,serviceWorker:!!m?.active,scope:m?.scope||null,startUrl:new URL("./",location.href).href,display:document.querySelector('link[rel="manifest"]')?.href||null};
  });
  check("installability-prerequisites",installability.secure&&installability.manifest&&installability.serviceWorker,installability);
  const cdp=await context.newCDPSession(page);
  let manifestAudit=null;
  try { manifestAudit=await cdp.send("Page.getAppManifest"); } catch(e) { manifestAudit={error:String(e)}; }
  check("chromium-manifest-audit",!!manifestAudit&&!manifestAudit.error&&(!manifestAudit.errors||manifestAudit.errors.length===0),manifestAudit);
  const initialCache=await page.evaluate(async()=>({keys:await caches.keys(),count:(await caches.open((await caches.keys()).find(k=>k.startsWith("daybook-")))).then(c=>c.keys()).then(x=>x.length)}));
  check("core-assets-cached",initialCache.keys.some(k=>k.startsWith("daybook-"))&&initialCache.count>=15,initialCache);
  const appSections=await page.evaluate(()=>["overview","schedule","tasks","planner","academics","habits","finance","reminders","analytics"].map(id=>({id,exists:!!document.getElementById(id)})));
  check("core-modules-present",appSections.every(x=>x.exists),appSections);
  await page.evaluate(()=>{window.DaybookPersistence.storage.setItem("daybook_phase24_offline_probe",JSON.stringify({token:"offline-integrity",value:41}));});
  await context.setOffline(true);
  const offlineReload=await page.reload({waitUntil:"domcontentloaded"});
  const offlineStatus=await page.evaluate(async()=>({online:navigator.onLine,controller:!!navigator.serviceWorker.controller,title:document.title,probe:JSON.parse(window.DaybookPersistence.storage.getItem("daybook_phase24_offline_probe")||"null")}));
  check("offline-startup",!!offlineReload&&offlineStatus.controller&&offlineStatus.probe?.token==="offline-integrity",offlineStatus);
  for(const id of ["schedule","tasks","planner","academics","habits","finance","reminders","analytics"]){
   const nav=page.locator('[data-view="'+id+'"]').first();
   if(await nav.count()) await nav.click();
   const active=await page.locator("#"+id).evaluate(el=>el.classList.contains("active")).catch(()=>false);
   check("offline-module:"+id,active);
  }
  const offlineAsset=await page.evaluate(async()=>{const r=await fetch("./styles.css");return {status:r.status,ok:r.ok,bytes:(await r.text()).length}});
  check("offline-cached-assets",offlineAsset.ok&&offlineAsset.bytes>1000,offlineAsset);
  await page.evaluate(()=>{window.DaybookPersistence.storage.setItem("daybook_phase24_offline_probe",JSON.stringify({token:"offline-integrity",value:42,offline:true}));});
  const offlineExport=await page.evaluate(async()=>{
   const blob=window.DaybookPersistence.exportFile(); const parsed=JSON.parse(await blob.text());
   return {app:parsed.app,version:parsed.version,probe:parsed.data.daybook_phase24_offline_probe,financeKey:Object.keys(parsed.data).some(k=>k.includes("finance"))};
  });
  check("offline-backup-export",offlineExport.app==="Daybook"&&offlineExport.probe?.value===42,offlineExport);
  await context.setOffline(false);
  await page.waitForFunction(()=>navigator.onLine===true);
  await page.reload({waitUntil:"networkidle"});
  const reconnect=await page.evaluate(()=>JSON.parse(window.DaybookPersistence.storage.getItem("daybook_phase24_offline_probe")||"null"));
  check("reconnect-retains-offline-data",reconnect?.value===42&&reconnect.offline===true,reconnect);
  swRevision="\n// phase24 service-worker update verification";
  const update=await page.evaluate(async()=>{
   const reg=await navigator.serviceWorker.getRegistration();
   await reg.update();
   const deadline=Date.now()+10000;
   while(Date.now()<deadline){if(reg.active?.state==="activated"&&reg.active.scriptURL)break;await new Promise(r=>setTimeout(r,100));}
   return {active:reg.active?.state,waiting:reg.waiting?.state||null,controller:!!navigator.serviceWorker.controller};
  });
  check("service-worker-update",update.active==="activated"&&!update.waiting,update);
  await page.reload({waitUntil:"networkidle"});
  const afterUpdate=await page.evaluate(()=>({controller:!!navigator.serviceWorker.controller,title:document.title,probe:JSON.parse(window.DaybookPersistence.storage.getItem("daybook_phase24_offline_probe")||"null")}));
  check("reload-after-update",afterUpdate.controller&&afterUpdate.probe?.value===42,afterUpdate);
  const storageKeys=await page.evaluate(()=>window.DaybookPersistence.storageKeys());
  check("storage-keys-preserved",storageKeys.includes("daybook_phase24_offline_probe")&&storageKeys.includes("daybook_schema_version"),storageKeys);
  const financeText=await page.locator("#finance").innerText().catch(()=> "");
  check("finance-module-rendered",financeText.length>0,{length:financeText.length});
  check("no-page-errors",pageErrors.length===0,pageErrors);
  await page.evaluate(()=>window.DaybookPersistence.storage.removeItem("daybook_phase24_offline_probe"));
  const report={ok:failures.length===0,failures,checks};
  fs.writeFileSync(path.resolve(__dirname,"../pwa-verification-report.json"),JSON.stringify(report,null,2));
  console.log(JSON.stringify(report,null,2));
  if(failures.length)process.exitCode=1;
 } catch(e) { const report={ok:false,failures:["uncaught"],error:e.stack||String(e),checks};fs.writeFileSync(path.resolve(__dirname,"../pwa-verification-report.json"),JSON.stringify(report,null,2));console.error(e.stack||String(e));process.exitCode=1; }
 finally {if(browser)await browser.close();server.close();}
})();