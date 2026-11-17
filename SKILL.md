---
name: renda-extra-players
description: Use when asked to map, update, or track competitive advertisers ("players") in the Brazilian "Renda Extra" (side-income infoproduct) niche via the Meta Ad Library — triggers include "atualiza a pesquisa/lista de renda extra", "mapeia os players de renda extra", "quem são os maiores anunciantes agora", or "pesquisa esse player [nome] na biblioteca" for a one-off check against the same tracked niche.
---

# Renda Extra Players — Meta Ad Library competitive mapping

## Core principle

**Never report an ad count that came from a keyword search.** Meta Ad Library's "~N resultados" on a keyword search is frequently wrong — a grouping bug has shown pages with "1140 ads" that really had ~140. The only trustworthy number comes from loading the advertiser's own page directly (`view_all_page_id`) and scrolling until the card count is stable. Every number in the final output must trace back to that direct per-page check.

## Workflow

### 0. Environment check
If Playwright MCP errors with `Browser is already in use for .../mcp-chrome-<id>`, kill the zombie process and retry:
```bash
ps aux | grep "mcp-chrome-<id>" | grep -v grep | awk '{print $2}' | xargs -I{} kill -9 {}
```

### 1. Discover candidates (keyword search)
Run each search term through `scripts/extract.js` via the Playwright MCP's `browser_run_code_unsafe`, navigating first to:
```
https://www.facebook.com/ads/library/?country=BR&active_status=active&ad_type=all&media_type=all&search_type=keyword_unordered&q=<TERM>
```
Search terms (run all 5 every update): `Renda Extra Online`, `Renda Oculta`, `Renda Oculta no TikTok`, `Renda Oculta na Shopee`, `Renda Lojas Online`.

`extract.js` scrolls and clicks "Ver mais" until the card count holds steady for 3 iterations, groups cards by advertiser page, and returns up to 40 pages sorted by (unreliable) ad count. Treat this purely as a candidate list — not as final numbers — and keep every page that shows up with what looks like 3+ ads.

### 2. Verify every candidate's real count
For each candidate, grab one ad's library id (the "Identificação da biblioteca: <id>" string on its card) and run batches of ~8-10 through `scripts/verify_batch.js` (replace the `__BATCH__` placeholder with a JSON array of `{name, lib}` objects) via `browser_run_code_unsafe`. The script, per candidate:
1. Opens `?id=<lib>`, waits, and extracts `view_all_page_id` from the resolved page's own links (don't trust `?id=` alone — the SPA can retain stale filter state from prior navigation and fail to resolve the card).
2. Re-navigates to a clean `?view_all_page_id=<pid>&search_type=page&active_status=active&ad_type=all&country=BR&media_type=all` URL and scrolls to stability.
3. Returns the real total, the oldest "Veiculação iniciada em" date found, the top destination domains (via `l.facebook.com/l.php?u=`), and the resolved page name.

If a batch call runs past ~120s it becomes a background task — wait for the completion notification rather than re-sending the same call.

### 3. Classify offer type
From the destination domain/LP (open it if ambiguous): `VSL`, `LP curta`, `Quiz`, `Catálogo/revenda`, `SaaS/ferramenta`, `Evento/webinar`, `Checkout direto`, or `Presell/cloaker` (page that hides the real offer behind a "Continuar" button).

### 4. Build the table
Columns: `# | Página | Site | Tipo de oferta | # ads ativos | Tempo no ar (1º ad)`. Sort descending by the *verified* count from step 2. Only include advertisers with 3+ real active ads.

### 5. Diff against the last snapshot
Check `history/renda-extra.md`. Call out explicitly:
- **New entrants** not in the last snapshot
- **Grew / shrank** significantly (note both old and new count)
- **Zeroed out** — before calling it a ban, check the Gotchas table below (disabled vs. temporarily zero vs. permanently deleted)
- **Clone/rebrand pattern** — see Recurring Patterns below

### 6. Persist the new snapshot
Append a dated row to `history/renda-extra.md`'s timeline, and replace its "current snapshot" table with the new one (keep the previous snapshot's key facts in the timeline prose rather than deleting the file's memory of it).

## Gotchas (already debugged — don't rediscover)

| Symptom | Fix |
|---|---|
| `Browser is already in use for .../mcp-chrome-<id>` | Kill the zombie Chrome process (step 0) |
| `browser_run_code_unsafe` result huge / gets truncated | Harness saves it to a `.txt` under `tool-results/`; the JSON is usually on line 2 — `sed -n '2p' file.txt > /tmp/x.json`, then parse with Python |
| Navigating straight to `?id=<lib>` doesn't resolve the card | SPA keeps stale filter state from the previous page. Always extract `view_all_page_id` first, then re-navigate to a clean `?view_all_page_id=...` URL (step 2.1-2.2) |
| Screenshot lands in `~/shotsN/` instead of the project folder | Relative screenshot paths resolve against the Playwright process's cwd, not the project dir — `find ~ -maxdepth 2 -iname "shotsN"` and move it |
| Page shows 0 ads | Check body text for `Depois de analisar esta Página` = Meta disabled the page (ban). `Nenhum anúncio corresponde` = just no active ads right now, page is otherwise fine. To confirm permanent deletion, visit `facebook.com/<page_id>` directly — `foi excluído` = gone for good |
| Local venv script (xlsx/table builder) fails with `ModuleNotFoundError` or a broken symlink | A system Python upgrade broke `.venv/bin/python` — invoke the versioned binary directly (`.venv/bin/python3.X`) or recreate the venv |

## Recurring patterns in this niche (context for interpretation, not mechanical rules)

1. **Clonagem pós-banimento** — after Meta disables a page, the operator relaunches within days under a near-identical name, same offer/destination (observed independently 3+ times: Jeoo.Pereiraa² → Jeopereira² → JeoPereiraaa; Elida Dias → Elida Mentora → Elida Lives → Elida Scale → Elida Mentora again).
2. **Contas multi-oferta de agência** — one page running ads for several completely unrelated clients/domains is a media-buyer/agency account, not a single dedicated player. Signal: wildly varied destination domains on the same page. Flag it rather than counting its total as one competitor's volume.
3. **Template de copy/funil compartilhado** — the same landing-page template or copy block reused by multiple differently-named "affiliate" pages (shared mentoria/produto, many affiliates driving their own traffic).
4. **Picos ligados a evento com data marcada** — sharp ramp-up pre-webinar/launch that crashes to near-zero right after the event date passes.
5. **Domínios suspeitos** — an unusual domain (mimicking a wallet/app, or matching the user's own brand) is worth a quick check before treating the page as a legitimate niche reference or counting it at face value.

## Output format

A markdown table (columns per step 4), sorted descending by verified count, followed by short prose: what's new, what moved, what disappeared and why (if known), and anything flagged under Recurring Patterns.

For a WhatsApp-ready version of the same data: flat emoji-numbered list, `*bold*` for names, no markdown tables (WhatsApp doesn't render them).

## Files

- `scripts/extract.js` — keyword-search candidate extraction (Playwright code string; run via `browser_run_code_unsafe` after navigating to the search URL)
- `scripts/verify_batch.js` — page_id resolution + real count + destinations + oldest date for a batch of candidates (fill the `__BATCH__` placeholder before running)
- `history/renda-extra.md` — dated timeline plus the current Top 30 snapshot table to diff each new run against
