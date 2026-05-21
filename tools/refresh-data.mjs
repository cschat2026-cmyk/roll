import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const dataPath = path.join(root, "data", "site-data.json");
const args = new Map(process.argv.slice(2).map((arg) => {
  const [key, ...rest] = arg.replace(/^--/, "").split("=");
  return [key, rest.join("=") || "true"];
}));

const now = args.has("at") ? new Date(args.get("at")) : new Date();
if (Number.isNaN(now.getTime())) {
  throw new Error(`Invalid --at value: ${args.get("at")}`);
}
const cadenceHours = Number(args.get("cadence") || 6);
const reviewNote = args.get("note") || "Daily data review completed. Expired public/community items are hidden, and player-facing source labels remain intact.";

const data = JSON.parse(fs.readFileSync(dataPath, "utf8"));
const next = new Date(now.getTime() + cadenceHours * 60 * 60 * 1000);

data.meta.updatedAt = now.toISOString();
data.meta.nextRefreshAt = next.toISOString();
data.meta.updateCadenceHours = cadenceHours;
data.meta.updateNote = reviewNote;

const beforeDice = data.diceLinks.length;
const beforeEvents = data.events.length;
data.diceLinks = data.diceLinks.filter((link) => {
  if (link.source === "official") return true;
  return new Date(link.expiresAt).getTime() > now.getTime();
});

data.events = data.events.filter((event) => new Date(event.endsAt).getTime() > now.getTime() - 60 * 60 * 1000);
const sourceCounts = [...data.diceLinks, ...data.events].reduce((counts, item) => {
  counts[item.source] = (counts[item.source] || 0) + 1;
  return counts;
}, {});
const staleEvents = data.events.filter((event) => event.source !== "official" && event.status === "watch").map((event) => event.name);

data.changelog = [
  {
    date: now.toISOString().slice(0, 10),
    items: [
      reviewNote,
      `Active content after pruning: ${data.diceLinks.length} reward routes, ${data.events.length} event windows. Removed ${beforeDice - data.diceLinks.length} expired reward routes and ${beforeEvents - data.events.length} old event windows.`
    ]
  },
  ...data.changelog.filter((entry) => entry.date !== now.toISOString().slice(0, 10))
].slice(0, 12);

fs.writeFileSync(dataPath, `${JSON.stringify(data, null, 2)}\n`);
execFileSync("node", [path.join(root, "tools", "build-seed.mjs")], { stdio: "inherit" });
console.log(`Refreshed ${path.relative(root, dataPath)} at ${data.meta.updatedAt}`);
console.log(`Next review: ${data.meta.nextRefreshAt}`);
console.log(`Active dice routes: ${data.diceLinks.length} (${beforeDice - data.diceLinks.length} pruned)`);
console.log(`Active events: ${data.events.length} (${beforeEvents - data.events.length} pruned)`);
console.log(`Source mix: ${Object.entries(sourceCounts).map(([key, value]) => `${key}=${value}`).join(", ") || "none"}`);
if (staleEvents.length) console.log(`Community watch items needing in-game confirmation: ${staleEvents.join(", ")}`);
