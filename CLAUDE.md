# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

KPI Team Dashboard — internal Shopee logistics dashboard. React frontend + Express/TypeScript backend, reading operational data from Google Sheets and gating access to `@shopee.com` Google accounts. The only fully built-out screen so far is `/bau` (Business as Usual): three KPI panels (ATs no piso, Drivers, SPR) sharing one filter bar and one detail table.

## Commands

It is **one application** in two npm projects (`backend/`, `frontend/`) driven by root scripts (`npm run install:all` once, then):
- `npm run dev` — runs both with `concurrently`: backend on `:3001`, Vite on `:5173`. Open `:5173`; Vite proxies `/api` to the backend (`frontend/vite.config.ts`), so the frontend always calls relative `/api/...` URLs.
- `npm run build` + `npm start` — production: the backend serves `frontend/dist` itself (static files + SPA fallback in `app.ts`) and the API on a single port (`PORT`, default `:3001`). One process, one origin.

You can still `cd` into each project and use its own scripts. CORS in `backend/src/app.ts` only allows `http://localhost:5173` (only relevant in dev, since the proxy makes requests same-origin anyway).

Backend (`backend/`):
- `npm run dev` — ts-node-dev with auto-restart (the normal way to run it locally). It runs with `--transpile-only`, so **it does not type-check**; only `npm run build` does.
- `npm run build` — `tsc` to `dist/` (`outDir` is set; without it `tsc` would emit `.js` next to the sources)
- `npm start` — run the built `dist/server.js`
- No lint script. No test framework configured (`npm test` is a placeholder that exits with an error).

Frontend (`frontend/`):
- `npm run dev` — Vite dev server
- `npm run build` — `tsc -b && vite build`
- `npm run preview` — preview the production build
- No lint script. No test framework configured.

### Required env vars

`backend/.env` (see `backend/.env.example`): `PORT`, `GOOGLE_CLIENT_ID`, optional `SESSION_SECRET` (otherwise generated once into gitignored `backend/.cache/session_secret.txt`), `GOOGLE_SHEETS_CREDENTIALS_PATH` (path to a gitignored service-account JSON key), `GOOGLE_SHEETS_SPREADSHEET_ID`, `GOOGLE_SHEETS_BAROMETRO_SPREADSHEET_ID` (required for `/barometro`; a different spreadsheet with no fallback, shared with the service account as Viewer). Optionally `GOOGLE_SHEETS_DRIVERS_SPREADSHEET_ID` / `GOOGLE_SHEETS_SPR_SPREADSHEET_ID` — each falls back to `GOOGLE_SHEETS_SPREADSHEET_ID` when unset, so the three KPI domains can live in one sheet or be split across sheets per environment.

`frontend/.env`: `VITE_GOOGLE_CLIENT_ID` only (read at build time by `main.tsx`; it must be set when running `npm run build`). There is no API URL variable — all calls are relative `/api/...`.

Other conventions: commits follow Conventional Commits in Portuguese (`feat(bau): ...`, `fix(config): ...`), and UI text and code comments are in Portuguese. `backend/testSheets.js` is a manual connectivity script for the sheets (`node testSheets.js` from `backend/`), not a test suite. The service-account key is gitignored via `backend/kpis-team-dashboard-*.json` — keep rotated keys following that name.

## Architecture

### Data flow (backend)

`googleSheets.ts` is the only thing that talks to the Sheets API (`spreadsheets.values.get`, read-only scope) — it just returns raw `string[][]` for a given A1 range, against an optional spreadsheet ID (default `GOOGLE_SHEETS_SPREADSHEET_ID`). Every service reads the tab named `Base`: `kpi.service.ts` uses `Base!A:F` (inline, twice), `drivers.service.ts` `Base!A:U` (`DRIVERS_RANGE`), `spr.service.ts` `Base!A:G` (`SPR_RANGE`). Each KPI domain (`kpi`, `drivers`, `spr`) has its own service that:
1. fetches a fixed column range and parses rows into a typed shape by column *index* (there's no header-name mapping — reordering sheet columns silently breaks parsing),
2. applies the same filter shape everywhere (`startDate`, `endDate`, `station`, `stationId`, `stationName`),
3. aggregates **daily first**, then derives weekly/monthly by re-grouping and re-computing metrics from the summed/averaged raw daily numbers — never by summing or averaging already-computed daily percentages. This is an explicit, previously-buggy invariant (see the long comments in `drivers.service.ts` and `spr.service.ts`): percentages and rates aren't additive, so weekly/monthly figures must be recalculated from raw counts (drivers) or averaged from the rate values (SPR), not rolled up from daily percentages.

Two files exist but are **empty (0 bytes)**: `repositories/kpi.repository.ts` and `config/env.ts`. There's no repository layer; controllers call services directly. `types/` and `utils/` in the backend only hold `.gitkeep`.

Routes are thin: `controller → service`, one route file per domain, all mounted under `/api` in `app.ts`:
- `POST /api/auth/google` (public) and `GET /api/ping` (public health check); everything below requires a session token (`requireAuth`)
- `GET /api/kpis/at-no-piso`, `GET /api/kpis/stations`
- `GET /api/drivers`
- `GET /api/spr`
- `GET /api/barometro` — série completa (todas as colunas de dia/semana) de cada hub × indicador + metadados; gzip via `compression`
- `GET /api/updates?limit=N` — unrelated to KPI data; shells out to `git log` (`git.service.ts`, `cwd` = repo root) so the frontend Topbar can show a "recent changes" notification feed. In a deploy without `.git` the feed will be empty.

Monday-start "week" bucketing is implemented **independently** in `kpi.service.ts`, `drivers.service.ts`, `spr.service.ts`, and again in the frontend (`BAU.tsx`'s `weekStartIso`) — all four must stay in sync if the week-start rule ever changes.

### Auth

Same scheme as the Live panel project (credentials — client ID, service account — are this project's own). Google Sign-In (`@react-oauth/google`) on the frontend → `POST /api/auth/google` → `auth.service.ts` verifies the ID token via `google-auth-library` and hard-rejects any email not ending in `@shopee.com` (checks both the suffix and, if present, the `hd` claim) → `session.service.ts` issues a stateless HMAC-signed token (`<payload>.<signature>`, 30-day TTL, secret from `SESSION_SECRET` or a persisted file). The frontend keeps `{ token, user }` in **`sessionStorage`** (`kpi_session`, helpers in `frontend/src/utils/session.ts`), so it's dropped when the tab closes.

Enforcement is two-layered: `middleware/auth.middleware.ts` (`requireAuth`, header `x-session-token`) protects every `/api/kpis|drivers|spr|updates` route (the real gate), and `components/ProtectedRoute.tsx` guards `/dashboard` and `/bau` in the UI only. All authenticated fetches must go through `authFetch` (adds the header; on a 401 it clears the session and redirects to `/login`). No admin allowlist, rate limiting or audit log (the Live panel has those; not ported).

### Barômetro (`/barometro`)

Read-only hub-by-hub matrix of the sheet "Barômetro | Indicadores operação – All in One BR", tab `Report` (one row per Hub × Indicator, 37 indicators; time columns = 7 daily columns followed by a `Wnn` weekly column, rolling ~5 weeks; memorial de cálculo in the `Premissas` tab). `barometro.service.ts` reads the tab with **unformatted values**, caches it 5 min, and maps indicators by their sheet label through `barometro.config.ts` (key, group, kind, `goodWhen` direction used only to color). Parsing quirks it handles: percentages arrive as text (`"95.74%"`) or fractions (values > 1.5 are assumed 0–100), times as `"5h 09m"`, `#DIV/0!` errors → null; the sheet fills future days/no-operation hubs with `0`, so a hub with no routed/expedited packages in a period becomes all-null; some indicators use `0` for "no data" (`zeroIsMissing`); survey indicators (nota, % bom/ruim, participantes, comentários) and churn exist only in the weekly column. Hubs are keyed by name (some have no code; four `OF` hubs have no regional). There are **no Regional/Brasil totals** — by decision the screen is hub-only, so nothing is summed or averaged across hubs. The `goodWhen` directions are our reading of each indicator and can be adjusted in `barometro.config.ts`.

The page (`frontend/src/pages/Barometro/`) mirrors the sheet's layout: **one block per hub**, indicators as rows (grouped in bands, sub-indicators indented), and time as columns — 7 daily columns followed by the weekly column, oldest first, opening scrolled to the latest weeks. The response carries every column for every hub (`series[indicator][periodIndex]`, aligned with `periods`); the client filters (Regional → Subregional, hub search, toggle chips per indicator group, "Dias + semanas" / "Só semanas") and renders hubs progressively (8 at a time, IntersectionObserver) because 200+ hubs × 37 rows is too heavy to mount at once. Cells are colored per row against that same row's min/max (days and weeks compared separately; only indicators with a `goodWhen` direction). CSV/XLSX export is long-format (one row per hub × indicator) for all filtered hubs.

### Frontend — visual identity

The look matches the Live panel project: Inter, Shopee orange `#EE4D2D`, dark (`#0b0d17` page, `#181c32` cards) and light themes. **Never hardcode colors in CSS/TSX** — use the tokens in `frontend/src/styles/variables.css` (`--bg`, `--card`, `--border`, `--text`, `--muted`, `--orange`, `--green`, `--red`, `--blue`) or their `--*-rgb` channels for transparency (`rgba(var(--orange-rgb), 0.2)`; `--ov-rgb` is the white/dark overlay tint and `--line-rgb` the neutral line tint). The theme lives in `context/ThemeContext.tsx` (`data-theme` on `<html>`, persisted in `localStorage` key `kpi-theme`, toggle button in the Topbar). Chart fills reference the tokens (`var(--blue)` etc.), so they follow the theme. Login is a centered card on the plain `--bg` background (no image) with `public/logo-shopee-fleet.png` (copied from the Live panel).

### Frontend — routing and layout

`AppRoutes.tsx`: `/` and any unknown path redirect to `/login`; `/login` → `Login` (skips straight to `/dashboard` if a session exists); `/dashboard` → `Dashboard` (area picker, currently a single BAU card) and `/bau` → `BAU`, both wrapped in `ProtectedRoute`. `Sidebar` and `Topbar` (in `components/layout/`) wrap the authenticated pages. The frontend folders `components/`, `contexts/`, `services/`, `types/` only hold `.gitkeep`.

### Frontend — the BAU page

`frontend/src/pages/BAU/BAU.tsx` (~2200 lines, with ~1100 lines of `BAU.css`) holds fetching, filters, the detail table and export wiring in one file — read the relevant section instead of the whole file, and avoid adding more to it when a separate component fits. KPI metadata lives in `bauKpis.ts`. It independently fetches all three domain endpoints (`/api/kpis/at-no-piso`, `/api/drivers`, `/api/spr`) with the same filters, because each underlying sheet can update on a different cadence and have different date coverage. `buildPeriodAxis()` derives a single shared period axis from the date-filter range (not from whichever data happens to come back) so all charts and the shared detail table line up on the same x-axis even when one series is missing recent days. The three responses are joined into the "Detalhamento" table by a `period|station_code` key.

`SummaryCards.tsx` renders the six headline cards above the charts (latest value, variation vs the previous period, sparkline). They're computed in `BAU.tsx` (`summaryItems`) from the same per-period series as the charts, ignore the in-progress period (today / current week / current month) and periods without a base (e.g. `drivers_confirmados` = 0), and color the delta by whether up or down is good for that KPI. `ChartSkeleton.tsx` is the shimmer placeholder used while each chart loads; the table colors the GAP column green/red (`bau-gap--pos/neg`). Entry animations and skeleton styles live in `SummaryCards.css` and respect `prefers-reduced-motion`.

Charts (`DriversBarChart.tsx`, `SprGapChart.tsx`) are hand-rolled inline SVG, not a charting library — `echarts` is in `package.json` but **unused**. Keep new charts consistent with the hand-rolled SVG ones; `echarts` can be removed (`npm uninstall echarts` in `frontend/`) unless someone deliberately adopts it. Each chart sits in a `.bau-chart-scroll` wrapper (horizontal scroll) and reserves `MIN_PERIOD_WIDTH` (34px) per period via `minWidth` on the measured container, so with many days the SVG widens instead of squeezing the bars; `useScrollToEnd` starts the scroll at the most recent days. The Y axis is part of the SVG, so it scrolls out of view with the content. They use `useContainerWidth` (a callback-ref-based `ResizeObserver` hook) to keep the SVG `viewBox` matched to the real rendered size; this exists specifically because charts that mount before data arrives (behind a loading state) don't get sized correctly with a plain `useRef` + `useEffect`.

`frontend/src/utils/exportTable.ts` builds CSV and XLSX exports **with zero external dependencies** — the XLSX is a hand-assembled ZIP of the minimal OOXML parts (`[Content_Types].xml`, `workbook.xml`, `styles.xml`, `sheet1.xml`) including a hand-rolled CRC32/ZIP writer. This is intentional (avoids adding a spreadsheet library for one feature); don't replace it with a library without discussing it first, and don't assume `xlsx`/`exceljs`-style APIs apply here.

### Repo housekeeping

`claude/` at the repo root is **tracked** and holds project skills for Claude (currently `claude/skills/engineer/skill.md`, a Portuguese engineering skill that tells Claude to read this file before changing code). It is not part of the application. `README.md` is just a two-line stub — this file is the real documentation, so keep it updated when the architecture changes.
