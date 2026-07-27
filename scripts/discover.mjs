import fs from "node:fs/promises";
import path from "node:path";
import OpenAI from "openai";
import YAML from "yaml";
import { normalizeUrl, readJson, root, writeJson } from "./lib.mjs";

if (!process.env.OPENAI_API_KEY) {
  console.log("OPENAI_API_KEY is absent; discovery skipped without modifying reviewed data.");
  process.exit(0);
}

const config = YAML.parse(await fs.readFile(path.join(root, "config/sources.yml"), "utf8"));
const reviewed = await readJson("data/opportunities.json");
const knownUrls = new Set(reviewed.flatMap((item) => [item.programmeUrl, item.applicationUrl]).map(normalizeUrl));
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const candidates = [];
const queries = config.discovery.queries.slice(0, config.discovery.max_query_clusters);

const prompt = `Find European student research programmes, research internships, fellowships, or curated project catalogues in AI/ML, optimization, signal processing, scientific computing, applied mathematics, physics, or engineering.
Exclude generic job-board listings, ordinary industry internships, and full PhD vacancies.
Every candidate must have an official institutional page. Historical calls are allowed only as evidence and must not be presented as current.
Return ONLY a JSON array with at most 3 objects. Each object must contain: programmeName, institution, country, officialUrl, applicationState (upcoming|open|rolling|closed|unknown), deadline (YYYY-MM-DD or null), fields (array), levels (Bachelor|Master|PhD array), fundingText, eligibility, visaRestrictions, evidenceTitle, and whyRelevant. Unknown facts must be null or explicitly "Unknown".`;

for (const query of queries) {
  if (candidates.length >= config.discovery.max_candidates) break;
  const response = await client.responses.create({
    model: "gpt-5.6",
    reasoning: { effort: "low" },
    tools: [{ type: "web_search", search_context_size: "medium" }],
    tool_choice: "required",
    include: ["web_search_call.action.sources"],
    input: `${prompt}\n\nSearch cluster: ${query}`
  });
  let parsed;
  try {
    const cleaned = response.output_text.trim().replace(/^```json\s*/i, "").replace(/```$/, "");
    parsed = JSON.parse(cleaned);
  } catch {
    console.warn(`Rejected invalid model output for query: ${query}`);
    continue;
  }
  const sources = response.output
    .filter((item) => item.type === "web_search_call")
    .flatMap((item) => item.action?.sources || [])
    .filter((source) => source.url);
  const citedUrls = new Set(sources.map((source) => normalizeUrl(source.url)));
  for (const candidate of Array.isArray(parsed) ? parsed : []) {
    if (candidates.length >= config.discovery.max_candidates) break;
    if (!candidate.officialUrl || !candidate.programmeName || !candidate.institution) continue;
    let canonical;
    try { canonical = normalizeUrl(candidate.officialUrl); } catch { continue; }
    if (knownUrls.has(canonical) || candidates.some((item) => item.canonicalUrl === canonical)) continue;
    const cited = citedUrls.has(canonical) || [...citedUrls].some((url) => url.startsWith(canonical) || canonical.startsWith(url));
    const blockedHost = /(linkedin|indeed|glassdoor|jobs\.ac\.uk|scholarshipdb|euraxess)/i.test(new URL(canonical).hostname);
    if (!cited || blockedHost) continue;
    candidates.push({
      ...candidate,
      canonicalUrl: canonical,
      discoveredAt: new Date().toISOString(),
      reviewStatus: "candidate",
      sourceMetadata: sources.filter((source) => normalizeUrl(source.url) === canonical)
    });
  }
}

await writeJson("automation-output/discovered-candidates.json", candidates);
console.log(`Discovery retained ${candidates.length} cited, official-page candidates from ${queries.length} query clusters.`);
