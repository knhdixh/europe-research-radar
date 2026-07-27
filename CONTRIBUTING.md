# Contributing reviewed opportunity data

Edit `data/opportunities.json` only after reading the official institutional source. A candidate from `automation-output/` is a lead, not verified data.

Run:

```bash
npm run validate:data
npm test
npm run generate:csv
npm run build
```

Pull requests must state which official page supports each new or changed deadline, eligibility, funding and nationality rule. Do not add personal notes, scores or application activity.
