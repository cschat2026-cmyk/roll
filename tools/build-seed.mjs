import { readFile, writeFile } from "node:fs/promises";

const siteData = JSON.parse(await readFile("data/site-data.json", "utf8"));
const i18n = JSON.parse(await readFile("data/i18n.json", "utf8"));

const output = `window.RollRadarSeed = ${JSON.stringify({ siteData, i18n }, null, 2)};\n`;

await writeFile("assets/js/seed-data.js", output);
console.log("Built assets/js/seed-data.js");
