import { access, readFile } from "node:fs/promises";

const requiredFiles = [
  "index.html",
  "app.js",
  "styles.css",
  "public/charts/config-5016-btc-equity.png",
  "public/charts/config-5016-eth-equity.png",
  "vercel.json",
];

for (const file of requiredFiles) await access(file);

const html = await readFile("index.html", "utf8");
const javascript = await readFile("app.js", "utf8");
for (const requiredText of ["styles.css", "app.js", "Config #5016", "config-5016-btc-equity.png", "config-5016-eth-equity.png"]) {
  if (!`${html}\n${javascript}`.includes(requiredText)) throw new Error(`Missing dashboard content: ${requiredText}`);
}

console.log("Dashboard deployment verification passed.");
