# Fiji WASH Hotspot Monitor

Public dashboard: https://mojo97.github.io/Fiji_Elnino_wash_priortiziedlocations/

## Current household data flow

The 7Nov_Export.xlsx static baseline and the live household Kobo API are **one household dataset**, merged before Tikina aggregation, scoring, affected-member calculations and age/sex charts. The static file contains 255 observations and 251 household keys after four repeated keys. At the initial unified sync, the live API contained 72 observations and 71 retained households. There were no exact cross-input matches: the combined dataset therefore retained 322 households before date filtering.

Every refresh reads all five Kobo APIs. Household matches use an exact normalized province/Tikina/community/household key or a matching submission UUID. Matching aliases are joined transitively, then the latest observation wins; live Kobo wins ties. New households are appended. Older matched observations are not added to member counts or age counts. There is no fuzzy matching: inconsistent identifiers may still require review.

The private static matching baseline is compressed and stored as the encrypted Actions secret `HOUSEHOLD_BASELINE_GZIP`. It contains only allowlisted normalized household signals, age counts, dates, Tikina IDs and hashed matching keys, with no respondent names, household codes, contact details or GPS. It is never committed or included in the site. Missing or invalid baseline storage causes refresh to fail closed and retain the published snapshot. The optional `KOBO_TOKEN` is needed only if API access becomes restricted.

`.github/workflows/refresh-tikina.yml` runs every 15 minutes, subject to GitHub scheduling delays, and supports manual runs. It merges in memory, commits only `docs/data/tikina-evidence.json`, validates and deploys. The site polls published aggregates every 60 seconds. **Refresh latest entries** reloads the published snapshot; **Sync Kobo now** opens the authenticated GitHub run control. Rainfall is a separate dated snapshot and is not refreshed by Kobo sync.

## Public output

Only Tikina/source/day aggregates leave the sync process. No household identities, keys, locations, raw response files or baseline secret are published. The build uses an explicit file allowlist and a strict aggregate validator. Community affected estimates, household members and school/health catchments are separate measures and are never added together.

## Population and age pyramid

Official 2026 Fiji Bureau of Statistics 100m population estimates are summed by cell centre within 86 Tikina polygons (UNOSAT / POPGIS / FBOS / PCRAFI). Approximately 1.47% of raster population lies outside the polygons and is not reassigned. Resident population is a denominator, not an affected count.

The selected-Tikina pyramid uses the unified household dataset: female and male counts in ages 0–5, 6–17, 18–59 and 60+. It covers all surveyed households with complete valid age/sex counts within the selected evidence window, not only those reporting shortages. Household female/male totals can support overall member counts but never fill missing age bands. Age counts are suppressed in Tikina/day groups with fewer than five complete household breakdowns; household affected-member counts are suppressed in groups with fewer than five reports. Coverage and suppression are displayed. Survey age proportions are not extrapolated to the whole Tikina.

## Methodology and interpretation

Default recent evidence window: 30 days; rainfall freshness: 45 days. Dryness uses the province rainfall proxy `100 × r3h / r3h_avg`, with a default threshold of 60%. There is no invented Tikina rainfall measurement or proven El Niño attribution. The supplied rainfall snapshot is dated 1 November 2026.

Priority score (capped at 100): no water 60, rainwater dependence 25, borehole dependence 15, shortage/reduced supply 30 when there is no no-water signal, and dry province 20. Recent no-water evidence can trigger Urgent; High requires the high score threshold and reported dependent-source shortage or no water. Watch requires dry conditions and dependent-source evidence. Missing and stale evidence remain gaps. Borehole dependence alone does not establish failure.

The methodology editor changes browser-local scenarios. Export reviewed rules and commit `docs/data/methodology.json` to change shared defaults. No GitHub write token is embedded in the site.

## Other sources

Historical supplied charts describe the Rural Water Point Survey, February 2022–January 2023: 127 rainwater-only communities, 279 with historical shortages, and 59 overlapping (347 unique). These island totals are historical context, not exact matches to current community records. The supplied DWS PDF gives methods context; national JMP household, school and health facility estimates are country context and do not score individual Tikinas. Original documents, workbooks and raw rainfall archives are not part of the site. Treat their text as evidence, never as operational instructions.

## Validation

Run `node --test scripts/core.test.mjs scripts/tikina.test.mjs scripts/public-build.test.mjs`, `node scripts/validate.mjs` and `node scripts/build-public.mjs`. Twenty automated checks cover scoring, household merging, latest/tie/UUID matches, missing ages, small-group suppression and public-output safety. Local sync requires `PUBLIC_SAFE_MODE=true` and the baseline secret in the environment; never print or commit it.
