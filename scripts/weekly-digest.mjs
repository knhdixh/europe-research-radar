import fs from "node:fs/promises";
import path from "node:path";
import { isoWeek, readJson, root } from "./lib.mjs";

const opportunities = await readJson("data/opportunities.json");
const safeRead = async (file, fallback) => {
  try { return await readJson(file); } catch { return fallback; }
};
const monitor = await safeRead("automation-output/monitor-report.json", { changed: [], failures: [] });
const candidates = await safeRead("automation-output/discovered-candidates.json", []);
const now = new Date();
const inDays = (date) => date ? Math.ceil((new Date(`${date}T12:00:00Z`) - now) / 86400000) : null;
const approaching = opportunities.filter((item) => {
  const days = inDays(item.deadline);
  return days != null && days >= 0 && days <= 30;
});
const upcoming = opportunities.filter((item) => {
  const days = inDays(item.applicationOpenDate);
  return days != null && days >= 0 && days <= 60;
});
const highFit = candidates.filter((item) => /machine learning|optimization|scientific computing|mathematics|signal processing/i.test((item.fields || []).join(" ")));
const bullet = (items, render) => items.length ? items.map((item) => `- ${render(item)}`).join("\n") : "- None this week.";
const week = isoWeek();
const markdown = `# Europe Research Radar — ${week}

Generated from reviewed main-branch data. Candidates and source changes require human review before publication.

## New high-fit candidates
${bullet(highFit, (item) => `[${item.programmeName}](${item.officialUrl}) — ${item.institution}`)}

## Deadlines within 30 days
${bullet(approaching, (item) => `[${item.programmeName}](${item.programmeUrl}) — ${item.deadline}`)}

## Expected openings within 60 days
${bullet(upcoming, (item) => `[${item.programmeName}](${item.programmeUrl}) — ${item.applicationOpenDate}`)}

## Changed sources
${bullet(monitor.changed || [], (item) => `[${item.id}](${item.url})`)}

## Failed or blocked sources
${bullet(monitor.failures || [], (item) => `[${item.id}](${item.url}) — ${item.status}`)}

## Guardrails
- No candidate was merged automatically.
- Historical deadlines were not copied forward.
- No applications, accounts, emails, or contact messages were created.
`;
const output = path.join(root, "automation-output", "weekly-digest.md");
await fs.mkdir(path.dirname(output), { recursive: true });
await fs.writeFile(output, markdown);
console.log(`Prepared digest ${week}.`);
