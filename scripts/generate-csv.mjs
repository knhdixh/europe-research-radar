import fs from "node:fs/promises";
import path from "node:path";
import { readJson, root } from "./lib.mjs";

const data = await readJson("data/opportunities.json");
const headers = ["Programme name", "Country", "Institution", "Field", "Level", "Deadline", "Application opening period", "Funding / salary", "Duration", "Eligibility", "Visa / nationality restrictions", "Link", "Contact person", "Fit score 1–5", "Notes", "Status"];
const quote = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
const rows = data.map((item) => [
  item.programmeName, item.country, item.institution, item.fields.join("; "), item.levels.join("; "),
  item.deadline || "", item.applicationOpeningPeriod, item.funding.text, item.duration.text,
  item.eligibility, item.visaRestrictions, item.programmeUrl,
  item.contactPerson || item.contactEmail || "", item.baselineFit, item.notes, "To check"
]);
await fs.mkdir(path.join(root, "public"), { recursive: true });
await fs.writeFile(path.join(root, "public", "opportunities.csv"), `${[headers, ...rows].map((row) => row.map(quote).join(",")).join("\n")}\n`);
console.log(`Generated public/opportunities.csv with ${rows.length} records.`);
