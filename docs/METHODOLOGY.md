# Methodology

## What qualifies

A record must be a student research programme, research internship, student fellowship, PhD-preparation experience or curated research-project catalogue hosted in Europe. It must have an official institutional page and meaningful alignment with AI/ML, optimization, signal processing, scientific ML, applied mathematics, scientific computing, physics or engineering.

Generic job-board listings, ordinary industry internships and full PhD vacancies are out of scope.

## Evidence and dates

Every material record includes at least one `SourceEvidence` entry with the official URL, page title, verification timestamp, source status, confidence and supported facts. `official` means the institution itself states the fact. `historical-estimate` is visibly non-current. `unverified` cannot substantiate publication.

Fixed deadlines are shown only when an official page states them. A closed 2026 call can support “likely winter opening” for 2027, but its 2026 deadline never becomes a 2027 deadline.

## Deterministic fit score

The score is an integer from 1 to 5:

| Component | Weight |
| --- | ---: |
| Research alignment | 40% |
| PhD preparation / research depth | 25% |
| Eligibility and visa feasibility | 20% |
| Funding | 10% |
| Timing feasibility | 5% |

Definitive ineligibility forces score 1 and provides a reason. Missing nationality or permit details yields a provisional score and a “verify eligibility” flag. The user may set a private score override; the computed explanation remains visible.

## Monitoring

Known pages are fetched, stripped of scripts/styles/volatile boilerplate, normalized and SHA-256 fingerprinted. An unchanged fingerprint produces no candidate change. Redirects, 404s, blocks and timeouts appear in the weekly digest. Dynamic sites may need a later site-specific extractor.

The weekly discovery job:

1. Runs no more than 12 query clusters.
2. Uses required live web search and requests complete source metadata.
3. Rejects invalid JSON, uncited results, blocked job-board hosts and known canonical URLs.
4. Retains at most 20 candidates.
5. Opens or updates one review PR; it does not edit the reviewed catalogue.

## Human review checklist

- Open every official source.
- Confirm the programme identity and cycle year.
- Re-check opening state, exact dates and timezone.
- Confirm level, enrolment, nationality and visa conditions without inference.
- Confirm funding currency, cadence and whether travel or housing is separate.
- Attach evidence to each material fact.
- Deduplicate by canonical URL and programme identity.
- Run validation and tests before merge.
