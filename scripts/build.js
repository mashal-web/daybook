const fs = require("fs");
const path = require("path");
const root = path.resolve(__dirname, "..");
const out = path.join(root, "www");
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
for (const file of ["index.html", "app.js", "styles.css", "manifest.webmanifest", "icon.svg"]) {
  fs.copyFileSync(path.join(root, file), path.join(out, file));
}
console.log("Daybook web assets prepared in www/");
