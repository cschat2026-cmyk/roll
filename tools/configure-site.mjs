import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const [domainArg, adsenseArg, analyticsArg] = process.argv.slice(2);

if (!domainArg || !domainArg.startsWith("https://")) {
  console.error("Usage: node tools/configure-site.mjs https://yourdomain.com ca-pub-XXXX G-XXXX");
  process.exit(1);
}

const domain = domainArg.replace(/\/$/, "");
const adsense = adsenseArg || "ca-pub-2456404542897668";
const analytics = analyticsArg || "G-REPLACE_ME";
const files = await listFiles(".");

for (const file of files) {
  const before = await readFile(file, "utf8");
  const after = before
    .replaceAll("https://rollradargo.com", domain)
    .replaceAll("ca-pub-2456404542897668", adsense)
    .replaceAll("pub-2456404542897668", adsense.replace("ca-", ""))
    .replaceAll("G-REPLACE_ME", analytics);
  if (after !== before) await writeFile(file, after);
}

console.log(`Configured ${files.length} files for ${domain}`);

async function listFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const result = [];
  for (const entry of entries) {
    if (entry.name === ".git" || entry.name === "node_modules") continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      result.push(...await listFiles(full));
    } else if (/\.(html|xml|txt|json|js)$/.test(entry.name)) {
      result.push(full);
    }
  }
  return result;
}
