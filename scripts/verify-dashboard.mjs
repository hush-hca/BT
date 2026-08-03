import { access, readFile } from "node:fs/promises";

const requiredFiles = [
  "index.html",
  "app.js",
  "styles.css",
  "charts/config-5016-btc-equity.png",
  "charts/config-5016-eth-equity.png",
  "vercel.json",
];

for (const file of requiredFiles) await access(file);

const html = await readFile("index.html", "utf8");
const javascript = await readFile("app.js", "utf8");
for (const requiredText of ["styles.css", "app.js", "report-selector", "reports", "language-toggle", "config-detail-row", "supportAge", "touchBand", "charts/config-5016-btc-equity.png", "charts/config-5016-eth-equity.png"]) {
  if (!`${html}\n${javascript}`.includes(requiredText)) throw new Error(`Missing dashboard content: ${requiredText}`);
}

console.log("Dashboard deployment verification passed.");
