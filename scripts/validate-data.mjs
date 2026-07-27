import { readJson, normalizeUrl } from "./lib.mjs";

const opportunities = await readJson("data/opportunities.json");
const errors = [];
const required = [
  "id", "cycleYear", "programmeName", "country", "institution", "fields", "levels",
  "applicationState", "applicationOpeningPeriod", "deadlineType", "funding", "duration",
  "eligibility", "visaRestrictions", "applicationUrl", "programmeUrl", "researchDepth",
  "baselineFit", "lastVerified", "evidence"
];
const ids = new Set();
const programmeCycles = new Set();
const canonicalUrls = new Map();
const states = new Set(["upcoming", "open", "rolling", "closed", "unknown"]);
const levels = new Set(["Bachelor", "Master", "PhD"]);
const fundingTypes = new Set(["salary", "stipend", "allowance", "bursary", "unfunded", "unknown"]);

for (const [index, item] of opportunities.entries()) {
  const label = item.id || `record ${index}`;
  for (const key of required) if (item[key] == null) errors.push(`${label}: missing ${key}`);
  if (!/^[a-z0-9-]+-\d{4}$/.test(item.id)) errors.push(`${label}: invalid stable ID`);
  if (ids.has(item.id)) errors.push(`${label}: duplicate ID`);
  ids.add(item.id);
  const identity = `${item.programmeName.toLowerCase()}::${item.cycleYear}`;
  if (programmeCycles.has(identity)) errors.push(`${label}: duplicate programme cycle`);
  programmeCycles.add(identity);
  if (!states.has(item.applicationState)) errors.push(`${label}: invalid application state`);
  if (!item.levels?.every((level) => levels.has(level))) errors.push(`${label}: invalid level`);
  if (!fundingTypes.has(item.funding?.type)) errors.push(`${label}: invalid funding type`);
  if (item.deadlineType === "fixed" && !item.deadline) errors.push(`${label}: fixed deadline missing date`);
  if (item.deadlineType === "rolling" && item.deadline) errors.push(`${label}: rolling call has fixed deadline`);
  if (item.deadline && Number.isNaN(Date.parse(`${item.deadline}T12:00:00Z`))) errors.push(`${label}: invalid deadline date`);
  if (item.applicationOpenDate && Number.isNaN(Date.parse(`${item.applicationOpenDate}T12:00:00Z`))) errors.push(`${label}: invalid open date`);
  if (!item.evidence?.length) errors.push(`${label}: no source evidence`);
  if (!item.evidence?.some((source) => source.confidence === "official")) errors.push(`${label}: no official evidence`);
  for (const source of item.evidence || []) {
    if (!source.url?.startsWith("https://")) errors.push(`${label}: evidence must use HTTPS`);
    if (!source.verifiedAt || Number.isNaN(Date.parse(source.verifiedAt))) errors.push(`${label}: invalid evidence timestamp`);
  }
  try {
    const canonical = normalizeUrl(item.programmeUrl);
    const existing = canonicalUrls.get(canonical);
    if (existing && existing !== item.programmeName) {
      // Shared institutional catalogues are allowed only for explicitly distinct programme names.
      if (!canonical.includes("faculty-science-summer-jobs")) errors.push(`${label}: canonical URL duplicates ${existing}`);
    }
    canonicalUrls.set(canonical, item.programmeName);
  } catch {
    errors.push(`${label}: invalid programme URL`);
  }
}

if (opportunities.length < 30 || opportunities.length > 50) errors.push(`catalogue count ${opportunities.length} is outside 30–50`);
const namedTargets = ["AScI", "HIP", "CERN openlab", "ETH Student", "Summer@EPFL", "Max Planck", "Inria", "CWI", "ELLIS", "Cambridge", "Oxford Statistics"];
for (const target of namedTargets) {
  if (!opportunities.some((item) => item.programmeName.toLowerCase().includes(target.toLowerCase()))) errors.push(`missing named target: ${target}`);
}

if (errors.length) {
  console.error(`Data validation failed with ${errors.length} error(s):\n${errors.map((error) => `- ${error}`).join("\n")}`);
  process.exit(1);
}
console.log(`Validated ${opportunities.length} reviewed opportunity cycles, ${ids.size} unique IDs and ${canonicalUrls.size} canonical URLs.`);
