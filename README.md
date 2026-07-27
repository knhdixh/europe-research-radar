# Europe Research Internship & PhD-Prep Opportunity Radar

A public, static, source-backed dashboard for high-quality European student research opportunities in AI/ML, optimization, signal processing, applied mathematics, scientific computing, physics and engineering.

The reviewed catalogue contains **33 opportunity cycles** from official institutional sources. Personal profile data, fit overrides, notes and application status are stored only in browser `localStorage`.

## Run locally

```bash
npm install
npm run generate:csv
npm run dev
```

Open the local URL printed by Vite. Production verification:

```bash
npm run validate:data
npm test
npm run build
node scripts/check-client-privacy.mjs
```

## Data model and review rule

- `data/opportunities.json` is the only reviewed public source of truth.
- `public/opportunities.csv` is generated from that JSON.
- Each record is one programme cycle with a stable ID, dates, structured funding and duration, eligibility, visa clarity, official links, evidence and freshness.
- Exact deadlines require official evidence.
- Closed calls may inform a future opening window, but their deadline is never copied into a future cycle.
- Secondary sources can nominate a lead. Only an official institutional page can verify a published record.
- Automation outputs are review candidates. They never enter the dashboard until a human merges reviewed edits to `data/opportunities.json`.

See [docs/METHODOLOGY.md](docs/METHODOLOGY.md) for scoring and workflow details.

## Private overlay

The dashboard starts with a provisional profile: master's student, non-EU resident in Europe, interested in AI/ML and optimization. Nationality, permit, graduation, interests, statuses, notes and overrides remain in `localStorage`. The settings drawer supports private JSON import/export; the combined personal CSV is assembled locally.

No personal data is included in commits, Pages, Actions artifacts, issues, pull requests or logs. `OPENAI_API_KEY` is used only by the server-side weekly workflow and must never be named with a `VITE_` prefix.

## Automation

- Daily 08:15 Europe/Helsinki: normalize and fingerprint known official sources.
- Sunday 18:15 Europe/Helsinki: monitoring plus up to 12 live web-search query clusters and 20 retained candidates.
- One long-lived review PR stages changed fingerprints and cited candidate records.
- One issue per ISO week summarizes candidates, deadlines, openings, source changes and failures.
- Pages deploys reviewed main-branch data only.

The workflow uses the OpenAI Responses API with `gpt-5.6`, low reasoning, required live `web_search`, medium search context and complete web-search source metadata. Configure a separate API-project spending limit outside this repository.

## Scope guardrails

Generic job-board entries, ordinary industry internships and full PhD vacancies are excluded. The system never applies, creates accounts, sends email or contacts programme staff.
