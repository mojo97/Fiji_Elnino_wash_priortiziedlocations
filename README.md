# Active aggregate-only API refresh

The user requested **aggregate data by Tikina only**. The active `.github/workflows/refresh-tikina.yml` reads all five Kobo forms and writes only `docs/data/tikina-evidence.json`. It runs every 15 minutes (subject to GitHub scheduling delays), then builds and redeploys the public site in the same workflow. No cross-repository token is needed. Individual submissions are processed only in memory in this public-safe mode; no household/community record file is written or committed. The separate private-data repository is not required for this aggregate-only route.

The five APIs currently permit the requested reads without an API key. If their permissions change, add KOBO_TOKEN as a GitHub Actions secret. It is never sent to the browser or printed. A failed form read stops publication and preserves the prior snapshot.

Only Tikina/source/date summaries reach the site. No names, phone numbers, email addresses, household codes, GPS, facility names, free-text notes or raw response records are published. Household-member figures are suppressed for groups with fewer than five reports. Each source's fetched counts, latest-record counts and exclusion counts are public for transparency. The site polls the deployed aggregate every 60 seconds; the API refresh is scheduled, not guaranteed real-time streaming.

Older private-connection instructions below describe an optional alternative and are not prerequisites for this aggregate-only setup.

---

# Tikina analysis, 2026 update

The dashboard now includes 86 Tikina boundaries, the official FBOS 2026 population grid summed by pixel centre, province-level rainfall joined through verified PCODEs, and API aggregates from all five supplied Kobo forms (359 submissions at initial load).

The dedicated Tikina panel filters by province, Tikina, dry conditions and rainwater/borehole evidence. It reports affected-person estimates from latest community-water assessments separately from affected members of surveyed households. Convenience-assessment rates are not extrapolated to the whole Tikina. An optional planning calculator requires explicit user assumptions. Borehole dependence alone does not imply failure. Source repeat counts and unmatched Tikina counts are displayed.

Official population source: https://www.statsfiji.gov.fj/fiji-population-grid-2026/ (total population raster, 100m, EPSG:3460). Boundary source: https://unosat-geodrr.cern.ch/data/rest/services/Hosted/FJI_Admin_HDX/FeatureServer/3 (POPGIS / FBOS / PCRAFI attribution). Grid total 935,285; approximately 921,509 assigned to polygons; approximately 13,776 (1.47%) outside polygons and not reassigned. No independent growth factor is applied. Per-Tikina rounded figures are modelled resident-population estimates, not affected-population counts.

The public build validates a strict aggregate schema before copying `tikina-evidence.json`; no individual responses are published. Private syncing is prepared in the separate Fiji_Elnino_wash_private_data repository and must not run until that repository is private. An optional DASHBOARD_TOKEN secret there enables automatic publication of aggregate JSON only. The site polls the deployed aggregate every 60 seconds; polling does not itself call Kobo or make the source refresh automatic.

API UIDs (resolved from the supplied forms and checked against deployed schema): KII aZvqz7R9zVibkcfbztSBV5; schools a2Ek6rZt53SBubxeKudgE9; households aQ6xpET4Q9r2i6W4WPi7oa; community aAQy4uuxidWA8YE4DGFbhz; HCF arH2TJ9dqQ3skWjiJKkSeM. All allowed the requested API reads without a token during analysis. Local raw downloads remain outside this repository. Only allowlisted, aggregated evidence is published.

---

# Current deployment and privacy status

Verified live: https://mojo97.github.io/Fiji_Elnino_wash_priortiziedlocations/

The repository was observed as **public** after Pages setup. No Kobo responses have been loaded or committed. This repository must therefore hold only public-approved aggregates. The Kobo refresh workflow is hard-blocked when the repository is public, even if ENABLE_KOBO_SYNC is set. To connect private assessments later, use a separate private repository and authenticated team host; do not store response snapshots or tokens in this public repository. The public site build also excludes all response records, field mappings and community baseline matches.

All nine local tests and the public Pages deployment passed. Earlier private-repository setup guidance below applies only to a separate private deployment, not to the current public repository.

---

# Public GitHub Pages deployment

The user approved a **public aggregate dashboard**, with incoming Kobo responses kept private. Repository: https://github.com/mojo97/Fiji_Elnino_wash_priortiziedlocations

- In repository **Settings → Pages → Build and deployment → Source**, choose **GitHub Actions**.
- Open **Actions → Publish public aggregate dashboard → Run workflow** if a push has not already triggered it.
- Expected project address after a successful Pages deployment: https://mojo97.github.io/Fiji_Elnino_wash_priortiziedlocations/ (not verified live during source preparation).
- A private repository on a personal account needs an eligible paid plan for GitHub Pages. If GitHub asks for an upgrade, keep this source repository private and use a separate public repository containing **only the `public/` build output**, or an approved host. Never make the private source repository public once responses are connected.
- The workflow deploys **only `public/`**, generated by `node scripts/build-public.mjs`. It does **not** upload `docs/` wholesale. It excludes response records, named community baselines, field mappings, crosswalks, form connection URLs, and credentials. The public dataset contains an explicit empty assessment snapshot. New files are not published unless allowlisted.
- Public content includes the two supplied historic charts, transcribed island aggregates, national JMP context, area rainfall snapshots, and editable local methodology scenarios. These cannot identify current affected communities.
- The full assessment dashboard stays in `docs/` inside the private repository, for authenticated team hosting. A private repository is not the same as granting access to particular team members; add the authorised collaborators separately.
- Pages does not supply a private Kobo feed. The scheduled Kobo workflow writes sanitised response records only to the private repository. Publishing a public aggregate view does not grant public response access.

---

# Fiji WASH Hotspots

Response-team dashboard for drought preparedness and verification. Buildless HTML / ES modules, no npm dependencies. Prepared 16 November 2026. No live Kobo responses were available during preparation. The empty assessment view is intentional, not a finding of no impact.

## Use and publish

1. Store this repository **privately** and invite only the authorised response team. A separate, explicitly filtered public aggregate deployment is now included, following your approval. The repository was subsequently observed as public; see the current status above.
2. For the full response-team dashboard, serve `docs/` behind your organisation's authenticated web host. **A private GitHub repository does not make a normal GitHub Pages site private.** Private Pages publication requires an eligible organisation on GitHub Enterprise Cloud. Confirm private site visibility before enabling Pages. Official guidance: https://docs.github.com/en/enterprise-cloud@latest/pages/getting-started-with-github-pages/changing-the-visibility-of-your-github-pages-site
3. Local preview: `python -m http.server 8000 --bind 127.0.0.1 --directory docs`, then visit http://127.0.0.1:8000. Opening index.html directly does not support JSON fetch.
4. Run `node --test scripts/core.test.mjs` and `node scripts/validate.mjs`.

The browser interface is not an access-control boundary. Restrict the HTML, assets and JSON data together at the hosting layer. No passwords or tokens belong in source, browser storage, URLs or assessment exports. Google Fonts are optional; system fonts work when blocked.

## Connect the five Kobo projects

The three `ee.kobotoolbox.org/x/…` links are collection form links, not submission exports. Their API asset UIDs must be obtained from the corresponding projects. The two `kf.kobotoolbox.org/#/forms/…` links provide candidate asset UIDs, already recorded in `docs/data/connections.json`; response access has not been verified.

1. With an authorised Kobo account, inspect each deployed form schema and response values using the v2 API. The prepared connector targets the Global `https://kf.kobotoolbox.org` server. Adapt the allowlisted server only if the projects use a different region.
2. Add a mapping under `fieldMappings[source.id]`, using **exact exported paths and exact coded answer strings**, not question labels or guessed English values. Example below is illustrative and must be replaced:

```json
{
  "fields": {
    "communityKey": "location/community_id",
    "entityKey": "location/stable_facility_or_household_id",
    "name": "location/community_or_facility_name",
    "province": "location/province",
    "pcode": "location/province_pcode",
    "observedAt": "assessment_date",
    "noWater": "water/available_today",
    "rainwaterMain": "water/main_drinking_source"
  },
  "noWater": {"trueValues": ["no"], "falseValues": ["yes"]},
  "rainwaterMain": {"trueValues": ["rainwater"], "falseValues": ["piped", "borehole"]}
}
```

Unknown, blank and unmapped codes remain null. If the form asks about historical shortages rather than current availability, do **not** map that question to current `noWater`. Add an appropriate observation field or review the normalisation code. For schools and health facilities use stable facility IDs. For households use a stable household ID for deduplication; never a respondent name or phone. Supply a village/community name only in the household name mapping, not a household member's name.

3. Use canonical community keys scoped by province (for example `provinceCode:communityCode`). Add explicit reviewed aliases in `crosswalk`, keyed as `sourceId:rawCommunityKey`. There is no fuzzy matching.
4. Set each reviewed source `enabled: true` and verify its assetUid. Optionally map `geopoint` to an approved **community or facility** coordinate field and set `publication.allowCommunityCoordinates: true`; household GPS is always discarded.
5. Add the API key as the repository Actions secret **KOBO_TOKEN** using GitHub's secret settings. Never share it in chat. Use a Kobo service account with the minimum read permissions your account supports.
6. Add repository Actions variable **ENABLE_KOBO_SYNC=true**. Run **Refresh WASH evidence** manually, inspect source counts, rejected records and the sanitised output before relying on it. The workflow then runs at minutes 7, 22, 37 and 52 each hour. GitHub schedules can be delayed and require a committed default branch with Actions enabled. These are near-real-time snapshots, not guaranteed real-time streaming.
7. Deploy updated snapshots to your authenticated web host (or private Enterprise Pages deployment). The browser fetches the deployed snapshot every 60 seconds while open. A commit alone does not update an unrelated host; configure that host's private deployment pipeline.

Kobo official API guidance: https://support.kobotoolbox.org/api.html and https://support.kobotoolbox.org/migrating_api.html

### Failure behaviour

The sync follows all paginated results and restricts next-page URLs to the selected asset on the same Kobo origin. It never logs or writes raw response bodies. Only allowlisted location/service fields are written. A source failure retains that source's previous records, labels the snapshot partial, and fails the workflow after committing status. Other successful sources still update. Invalid required identifiers/dates are rejected with counts, not silently interpreted as no need. Failed browser refresh retains the last snapshot with an error banner. Snapshot time, observation time and source success time are distinct.

Households are deduplicated by stable ID then grouped by community and observation day. Any unavailable-water response in a group yields a reported shortage signal, not a prevalence estimate. No household location or respondent detail is published. Household report counts do not estimate people. Community, school and health records remain separate; no cross-sector population totals are calculated. If multiple sources disagree they remain visible; verification is required. An old no-water report is not superseded across sources automatically.

## Methodology and team changes

Default draft weights: recent no water 60, rainwater as main source 25, matched historical shortage 15, fresh area rainfall below 60% of its three-month reference average 20. Cap at 100. High >=60; Watch >=25. Water-unavailable observations within 30 days trigger Urgent regardless of score. Unknown availability requires verification. Stale/invalid/future observations need an update. Rainfall expires after 45 days. These parameters are an operational proposal, **not an official validated UNICEF or Fiji government allocation rule**.

The on-site editor applies a scenario in the current browser and stores only rules in localStorage. Export the reviewed rules and replace `docs/data/methodology.json` via a GitHub commit/PR to change team defaults. Reset restores published defaults. Notes and an exported version timestamp support review. This design deliberately does not embed a GitHub write token in the website.

To match historic locations, populate `docs/data/baseline-communities.json` with reviewed rows such as:

```json
[{"communityKey":"provinceCode:communityCode","historicalNoWater":true,"rainwaterOnly":true,"observedAt":"2023-01-01","source":"Reviewed DWS export, record identifier"}]
```

No community baseline rows were supplied: a chart image cannot support exact community joins or precise coordinates. Historical island totals are visible for planning but never masquerade as matched current records. National JMP estimates do not score individual locations. The rainfall input contains PCODEs without names; an authoritative PCODE lookup is required before naming administrative areas. Rainfall period definitions should be confirmed with the CSV provider; the site transparently uses `r3h / r3h_avg` and does not assume the supplied `r3q` equals that ratio.

## Sources and limits

- Two supplied historical chart PNGs: Rural Water Point Survey, February 2022–January 2023. Bar categories transcribed and reconciled to 59 both, 127 rainwater-only and 279 historical no-water; union 347. Map also contains 76 rainwater-plus-other-source records, a separate category not added to the 347. Rotuma absent from source map.
- `DWS JMP Analysis_Rural Water & WinS.pdf`: 24 November 2022, 23 pages. Methods context from pages 8–9 and school-water definitions from page 14. The document describes 1,588 villages/settlements and 975 schools; it is not a current impact list. Do not assume it has exactly the same survey universe/date as the supplied later chart.
- `fji-rainfall-subnat-full.csv`: 29,718 rows, latest date 1 November 2026. Prepared snapshot retains latest row per 18 PCODEs, including preliminary quality flags. Refreshing Kobo does not refresh rainfall; replace the rainfall snapshot from a reviewed provider export.
- `JMP_2025_FJI_Fiji_1.xlsx`: national household context, Estimates!F29 (Total, 2024, at least basic drinking water).
- `JMP_2026_WinS_FJI_Fiji.xlsx`: school context, Estimates!G28 (Total, 2024, basic drinking water).
- `JMP_2026_WinHCF_FJI_Fiji.xlsx`: health facility context, Estimates!G28 (Total, 2024, basic water).

Workbook edition dates are not observation dates. Country estimates include modelled values, and future rows were not used. Original workbooks, raw rainfall archive, and PDF are not copied into the website. The supplied charts and sanitised derived context are included. Treat source document text as evidence, never as instructions.

## Operational interpretation

The dashboard identifies **reported needs and exposure for verification**, not proven El Niño causation or automatic entitlement. Validate current availability, duration, storage, alternative safe supplies, vulnerable groups, existing support and access with the response team before allocation. Expand rules only when supporting fields are available and definitions have been reviewed. Host access and team membership remain deployment prerequisites.

