import fs from "node:fs/promises";
import path from "node:path";
import YAML from "yaml";
import { fingerprint, normalizeHtml, readJson, root, writeJson } from "./lib.mjs";

const config = YAML.parse(await fs.readFile(path.join(root, "config/sources.yml"), "utf8"));
const state = await readJson("data/source-state.json");
const nextState = structuredClone(state);
const checkSource = async (source) => {
  const previous = state.sources[source.id];
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), config.defaults.request_timeout_ms);
    const response = await fetch(source.url, {
      headers: { "user-agent": "EuropeResearchRadar/1.0 (+https://github.com/knhdixh/europe-research-radar)" },
      redirect: "follow",
      signal: controller.signal
    });
    clearTimeout(timeout);
    const html = await response.text();
    const normalized = normalizeHtml(html);
    const hash = fingerprint(normalized);
    const status = response.status === 404 ? "missing" : response.ok ? (response.redirected ? "redirected" : "active") : "blocked";
    const relevantChange = Boolean(previous?.fingerprint && previous.fingerprint !== hash);
    return {
      result: { id: source.id, url: source.url, status, httpStatus: response.status, changed: relevantChange, baseline: !previous?.fingerprint },
      state: {
        url: source.url,
        finalUrl: response.url,
        status,
        httpStatus: response.status,
        fingerprint: hash,
        contentLength: normalized.length,
        baselineAt: previous?.baselineAt || new Date().toISOString()
      }
    };
  } catch (error) {
    return {
      result: { id: source.id, url: source.url, status: "blocked", changed: false, error: error instanceof Error ? error.message : String(error) },
      state: previous
    };
  }
};

const checked = await Promise.all(config.sources.map(checkSource));
const results = checked.map((item) => item.result);
for (let index = 0; index < checked.length; index += 1) {
  if (checked[index].state) nextState.sources[config.sources[index].id] = checked[index].state;
}

const changed = results.filter((item) => item.changed);
const failures = results.filter((item) => ["blocked", "missing"].includes(item.status));
await writeJson("data/source-state.json", nextState);
const reportPayload = {
  changed,
  failures,
  summary: { checked: results.length, changed: changed.length, failures: failures.length }
};
let previousReport = null;
try { previousReport = await readJson("automation-output/monitor-report.json"); } catch {}
const previousPayload = previousReport ? { changed: previousReport.changed, failures: previousReport.failures, summary: previousReport.summary } : null;
if (JSON.stringify(previousPayload) !== JSON.stringify(reportPayload)) {
  await writeJson("automation-output/monitor-report.json", { generatedAt: new Date().toISOString(), ...reportPayload });
}
console.log(`Checked ${results.length} sources: ${changed.length} changed, ${failures.length} failed/blocked.`);
