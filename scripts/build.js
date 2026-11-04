const fs = require("fs");
const path = require("path");
const root = path.resolve(__dirname, "..");
const out = path.join(root, "www");
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
for (const file of ["index.html", "app.js", "styles.css", "manifest.webmanifest", "icon.svg"]) {
  fs.copyFileSync(path.join(root, file), path.join(out, file));
}
const bundledIndex = fs.readFileSync(path.join(out, "index.html"), "utf8").replace('<script src="app.js"></script>', '<script type="module" src="native.js"></script><script src="app.js"></script>');
fs.writeFileSync(path.join(out, "index.html"), bundledIndex);
require("esbuild").buildSync({
  entryPoints: [path.join(root, "native.js")],
  bundle: true,
  format: "esm",
  target: ["es2020"],
  outfile: path.join(out, "native.js")
});
console.log("Daybook web assets prepared and native plugins bundled in www/");
