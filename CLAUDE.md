# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

KPI Team Dashboard — internal Shopee logistics dashboard. React frontend + Express/TypeScript backend, reading operational data from Google Sheets and gating access to `@shopee.com` Google accounts. The only fully built-out screen so far is `/bau` (Business as Usual): three KPI panels (ATs no piso, Drivers, SPR) sharing one filter bar and one detail table.

## Commands

There is no root `package.json` — `backend/` and `frontend/` are independent npm projects; `cd` into each separately. Both must run at once for local dev (backend on `:3001`, frontend on `:5173` — CORS in `backend/src/app.ts` only allows that exact origin).

Backend (`backend/`):
- `npm run dev` — ts-node-dev with auto-restart (the normal way to run it locally). It runs with `--transpile-only`, so **it does not type-check**; only `npm run build` does.
- `npm run build` — `tsc` to `dist/`
- `npm start` — run the built `dist/server.js`
- No lint script. No test framework configured (`npm test` is a placeholder that exits with an error).

Frontend (`frontend/`):
- `npm run dev` — Vite dev server
- `npm run build` — `tsc -b && vite build`
- `npm run preview` — preview the production build
- No lint script. No test framework configured.

### Required env vars

`backend/.env` (see `backend/.env.example`): `PORT`, `GOOGLE_CLIENT_ID`, `GOOGLE_SHEETS_CREDENTIALS_PATH` (path to a gitignored service-account JSON key), `GOOGLE_SHEETS_SPREADSHEET_ID`. Optionally `GOOGLE_SHEETS_DRIVERS_SPREADSHEET_ID` / `GOOGLE_SHEETS_SPR_SPREADSHEET_ID` — each falls back to `GOOGLE_SHEETS_SPREADSHEET_ID` when unset, so the three KPI domains can live in one sheet or be split across sheets per environment.

`frontend/.env`: `VITE_GOOGLE_CLIENT_ID`, `VITE_API_URL`. **Note:** only `Login.tsx` actually reads `VITE_API_URL`. `BAU.tsx` (6 fetches: `/api/kpis/stations`, `/api/kpis/at-no-piso`, `/api/drivers`, `/api/spr`) and `Topbar.tsx` (`/api/updates`) hardcode `http://localhost:3001`. Fix all of them before pointing the frontend at anything but localhost.

Other conventions: commits follow Conventional Commits in Portuguese (`feat(bau): ...`, `fix(config): ...`), and UI text and code comments are in Portuguese. `backend/testSheets.js` is a manual connectivity script for the sheets (`node testSheets.js` from `backend/`), not a test suite. The service-account key is gitignored via `backend/kpis-team-dashboard-*.json` — keep rotated keys following that name.

## Architecture

### Data flow (backend)

`googleSheets.ts` is the only thing that talks to the Sheets API (`spreadsheets.values.get`, read-only scope) — it just returns raw `string[][]` for a given A1 range, against an optional spreadsheet ID (default `GOOGLE_SHEETS_SPREADSHEET_ID`). Every service reads the tab named `Base`: `kpi.service.ts` uses `Base!A:F` (inline, twice), `drivers.service.ts` `Base!A:U` (`DRIVERS_RANGE`), `spr.service.ts` `Base!A:G` (`SPR_RANGE`). Each KPI domain (`kpi`, `drivers`, `spr`) has its own service that:
1. fetches a fixed column range and parses rows into a typed shape by column *index* (there's no header-name mapping — reordering sheet columns silently breaks parsing),
2. applies the same filter shape everywhere (`startDate`, `endDate`, `station`, `stationId`, `stationName`),
3. aggregates **daily first**, then derives weekly/monthly by re-grouping and re-computing metrics from the summed/averaged raw daily numbers — never by summing or averaging already-computed daily percentages. This is an explicit, previously-buggy invariant (see the long comments in `drivers.service.ts` and `spr.service.ts`): percentages and rates aren't additive, so weekly/monthly figures must be recalculated from raw counts (drivers) or averaged from the rate values (SPR), not rolled up from daily percentages.

Three files exist but are **empty (0 bytes)**: `repositories/kpi.repository.ts`, `middleware/auth.middleware.ts` and `config/env.ts`. There's no repository layer or auth middleware in use; controllers call services directly, and no API route enforces authentication. `types/` and `utils/` in the backend only hold `.gitkeep`.

Routes are thin: `controller → service`, one route file per domain, all mounted under `/api` in `app.ts`:
- `POST /api/auth/google`
- `GET /api/kpis/at-no-piso`, `GET /api/kpis/stations`
- `GET /api/drivers`
- `GET /api/spr`
- `GET /api/updates?limit=N` — unrelated to KPI data; shells out to `git log` (`git.service.ts`, `cwd` = repo root) so the frontend Topbar can show a "recent changes" notification feed. In a deploy without `.git` the feed will be empty.

Monday-start "week" bucketing is implemented **independently** in `kpi.service.ts`, `drivers.service.ts`, `spr.service.ts`, and again in the frontend (`BAU.tsx`'s `weekStartIso`) — all four must stay in sync if the week-start rule ever changes.

### Auth

Google Sign-In (`@react-oauth/google`) on the frontend → POST to `/api/auth/google` → `auth.service.ts` verifies the ID token via `google-auth-library` and hard-rejects any email not ending in `@shopee.com` (checks both the email suffix and, if present, the token's `hd` hosted-domain claim). There's no session/JWT: the frontend just stores the returned user object as-is in `localStorage` (`kpi_user`) and reads it back for display. This is UI-level gating only, and a weak one: `AppRoutes.tsx` has no route guard, so `/dashboard` and `/bau` open without logging in (they only read `kpi_user` for display), and the API doesn't check auth on any route. Implementing `auth.middleware.ts` and a frontend route guard is pending work.

### Frontend — routing and layout

`AppRoutes.tsx`: `/` and any unknown path redirect to `/login`; `/login` → `Login`; `/dashboard` → `Dashboard` (area picker, currently a single BAU card); `/bau` → `BAU`. `Sidebar` and `Topbar` (in `components/layout/`) wrap the authenticated pages. The frontend folders `components/`, `contexts/`, `services/`, `types/` only hold `.gitkeep`.

### Frontend — the BAU page

`frontend/src/pages/BAU/BAU.tsx` (~2200 lines, with ~1100 lines of `BAU.css`) holds fetching, filters, the detail table and export wiring in one file — read the relevant section instead of the whole file, and avoid adding more to it when a separate component fits. KPI metadata lives in `bauKpis.ts`. It independently fetches all three domain endpoints (`/api/kpis/at-no-piso`, `/api/drivers`, `/api/spr`) with the same filters, because each underlying sheet can update on a different cadence and have different date coverage. `buildPeriodAxis()` derives a single shared period axis from the date-filter range (not from whichever data happens to come back) so all charts and the shared detail table line up on the same x-axis even when one series is missing recent days. The three responses are joined into the "Detalhamento" table by a `period|station_code` key.

Charts (`DriversBarChart.tsx`, `SprGapChart.tsx`) are hand-rolled inline SVG, not a charting library — `echarts` is in `package.json` but **unused**. Keep new charts consistent with the hand-rolled SVG ones; `echarts` can be removed (`npm uninstall echarts` in `frontend/`) unless someone deliberately adopts it. They use `useContainerWidth` (a callback-ref-based `ResizeObserver` hook) to keep the SVG `viewBox` matched to the real rendered size; this exists specifically because charts that mount before data arrives (behind a loading state) don't get sized correctly with a plain `useRef` + `useEffect`.

`frontend/src/utils/exportTable.ts` builds CSV and XLSX exports **with zero external dependencies** — the XLSX is a hand-assembled ZIP of the minimal OOXML parts (`[Content_Types].xml`, `workbook.xml`, `styles.xml`, `sheet1.xml`) including a hand-rolled CRC32/ZIP writer. This is intentional (avoids adding a spreadsheet library for one feature); don't replace it with a library without discussing it first, and don't assume `xlsx`/`exceljs`-style APIs apply here.

### Repo housekeeping

`claude/` at the repo root is **tracked** and holds project skills for Claude (currently `claude/skills/engineer/skill.md`, a Portuguese engineering skill that tells Claude to read this file before changing code). It is not part of the application. `README.md` is just a two-line stub — this file is the real documentation, so keep it updated when the architecture changes.
