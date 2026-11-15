const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..", "www");
const types = { ".html":"text/html; charset=utf-8", ".js":"text/javascript; charset=utf-8", ".css":"text/css; charset=utf-8", ".svg":"image/svg+xml", ".png":"image/png", ".webmanifest":"application/manifest+json" };
http.createServer((req,res)=>{
  const pathname = decodeURIComponent(new URL(req.url,"http://localhost").pathname);
  const target = path.resolve(root, "." + (pathname === "/" ? "/index.html" : pathname));
  if (!target.startsWith(root + path.sep) && target !== path.join(root,"index.html")) { res.writeHead(403).end(); return; }
  fs.readFile(target,(error,data)=>{
    if(error){res.writeHead(404).end("Not found");return;}
    res.writeHead(200,{"Content-Type":types[path.extname(target)]||"application/octet-stream","Cache-Control":"no-store"});
    res.end(data);
  });
}).listen(4173,"127.0.0.1",()=>console.log("Serving Daybook build on http://127.0.0.1:4173"));
