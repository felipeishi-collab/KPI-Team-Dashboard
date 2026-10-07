import { getSheetData } from "./googleSheets";
import {
  INDICATORS,
  INDICATOR_GROUPS,
  IndicatorDef,
} from "./barometro.config";

// ============================================================
// BARÔMETRO — leitura da aba "Report"
//
// Formato da aba: uma linha por Hub × Indicador (colunas A–F:
// vazio, Regional, Subregional, código do Hub, nome do Hub,
// Indicador) e, a partir da coluna G, as colunas de tempo: 7
// dias seguidos de uma coluna de semana ("W41"), repetido por
// semana. Os cabeçalhos (linha 3) são datas em serial e "Wnn".
//
// Aqui só lemos e normalizamos — nada é somado ou recalculado
// entre hubs (a tela mostra hub por hub, como a planilha).
// ============================================================

const REPORT_RANGE = "Report!A1:AZ9000";
const HEADER_ROW_INDEX = 2; // linha 3 da planilha
const FIRST_DATA_ROW_INDEX = 3;
const FIRST_TIME_COLUMN = 6;
const CACHE_TTL_MS = 5 * 60 * 1000;

const SPREADSHEET_ID =
  process.env.GOOGLE_SHEETS_BAROMETRO_SPREADSHEET_ID;

export type PeriodType = "week" | "day";

export interface BarometroPeriod {
  id: string; // "week:2026-10-05" | "day:2026-10-07"
  type: PeriodType;
  label: string;
  start: string; // AAAA-MM-DD
  end: string;
  weekId: string; // semana a que o período pertence
  hasData: boolean;
}

export type CellValue = number | string | null;

export interface BarometroHub {
  hub: string;
  hub_code: string;
  regional: string;
  subregional: string;
  // uma lista por indicador, alinhada com `periods` (mesma ordem)
  series: Record<string, CellValue[]>;
}

export interface BarometroIndicatorMeta {
  key: string;
  label: string;
  group: string;
  kind: IndicatorDef["kind"];
  goodWhen: IndicatorDef["goodWhen"];
  weeklyOnly: boolean;
  indent: boolean;
}

export interface BarometroResponse {
  // colunas de tempo, na ordem da planilha (7 dias e a semana, repetido)
  periods: BarometroPeriod[];
  indicators: BarometroIndicatorMeta[];
  groups: readonly string[];
  hubs: BarometroHub[];
}

// ------------------------------------------------------------
// Parsing
// ------------------------------------------------------------

const DEFS_BY_LABEL = new Map(
  INDICATORS.map((def) => [def.sheetLabel, def])
);

const normalizeLabel = (value: unknown) =>
  String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();

function serialToIso(serial: number): string {
  return new Date(
    Date.UTC(1899, 11, 30) + serial * 86_400_000
  )
    .toISOString()
    .slice(0, 10);
}

function formatDayMonth(iso: string): string {
  const [, month, day] = iso.split("-");

  return `${day}/${month}`;
}

const WEEKDAYS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

function parseValue(
  raw: unknown,
  def: IndicatorDef
): CellValue {
  if (raw === "" || raw === null || raw === undefined) {
    return null;
  }

  switch (def.kind) {
    case "text":
      return typeof raw === "string" && raw.trim()
        ? raw.trim()
        : null;

    case "time": {
      if (typeof raw !== "string") return null;

      const match = raw.match(
        /^(?:(\d+)h)?\s*(?:(\d+)m)?$/
      );

      if (!match || (!match[1] && !match[2])) return null;

      return Number(match[1] ?? 0) * 60 + Number(match[2] ?? 0);
    }

    case "percent": {
      if (typeof raw === "string") {
        const match = raw.match(/^(-?[\d.,]+)\s*%$/);

        if (!match) return null; // erros como #DIV/0!

        const parsed = Number(match[1].replace(",", "."));

        return Number.isFinite(parsed) ? parsed / 100 : null;
      }

      if (typeof raw !== "number" || !Number.isFinite(raw)) {
        return null;
      }

      // a planilha guarda % como fração (0–1); alguns valores isolados
      // aparecem já em 0–100 — acima de 1,5 só pode ser essa escala
      return raw > 1.5 ? raw / 100 : raw;
    }

    default:
      return typeof raw === "number" && Number.isFinite(raw)
        ? raw
        : null;
  }
}

interface ParsedReport {
  periods: BarometroPeriod[];
  // coluna da planilha de cada período
  columnByPeriod: Map<string, number>;
  hubs: {
    hub: string;
    hub_code: string;
    regional: string;
    subregional: string;
    rowByIndicator: Map<string, unknown[]>;
  }[];
}

function parseReport(grid: unknown[][]): ParsedReport {
  const header = grid[HEADER_ROW_INDEX] ?? [];

  const periods: BarometroPeriod[] = [];
  const columnByPeriod = new Map<string, number>();

  // dias de cada semana, na ordem em que aparecem antes da coluna "Wnn"
  let pendingDays: { col: number; iso: string }[] = [];

  header.forEach((cell, col) => {
    if (col < FIRST_TIME_COLUMN) return;

    if (typeof cell === "number") {
      pendingDays.push({ col, iso: serialToIso(cell) });
      return;
    }

    if (typeof cell === "string" && /^W\d+$/i.test(cell.trim())) {
      if (pendingDays.length) {
        const start = pendingDays[0].iso;
        const end = pendingDays[pendingDays.length - 1].iso;
        const weekId = `week:${start}`;

        pendingDays.forEach((day) => {
          const weekday =
            WEEKDAYS[new Date(`${day.iso}T00:00:00Z`).getUTCDay()];
          const id = `day:${day.iso}`;

          periods.push({
            id,
            type: "day",
            label: `${weekday} ${formatDayMonth(day.iso)}`,
            start: day.iso,
            end: day.iso,
            weekId,
            hasData: false,
          });
          columnByPeriod.set(id, day.col);
        });

        periods.push({
          id: weekId,
          type: "week",
          label: `${cell.trim().toUpperCase()} · ${formatDayMonth(start)}–${formatDayMonth(end)}`,
          start,
          end,
          weekId,
          hasData: false,
        });
        columnByPeriod.set(weekId, col);
      }

      pendingDays = [];
    }
  });

  const hubsByName = new Map<string, ParsedReport["hubs"][number]>();

  for (let i = FIRST_DATA_ROW_INDEX; i < grid.length; i += 1) {
    const row = grid[i];
    const hub = normalizeLabel(row?.[4]);
    const indicator = normalizeLabel(row?.[5]);

    if (!hub || !indicator) continue;

    let entry = hubsByName.get(hub);

    if (!entry) {
      entry = {
        hub,
        hub_code: normalizeLabel(row[3]),
        regional: normalizeLabel(row[1]),
        subregional: normalizeLabel(row[2]),
        rowByIndicator: new Map(),
      };
      hubsByName.set(hub, entry);
    }

    entry.rowByIndicator.set(indicator, row);
  }

  return {
    periods,
    columnByPeriod,
    hubs: Array.from(hubsByName.values()),
  };
}

// ------------------------------------------------------------
// Cache (a aba tem ~8 mil linhas; não vale reler a cada clique)
// ------------------------------------------------------------

let cache: { at: number; report: ParsedReport } | null = null;
let inflight: Promise<ParsedReport> | null = null;

async function loadReport(): Promise<ParsedReport> {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) {
    return cache.report;
  }

  if (!inflight) {
    inflight = (async () => {
      if (!SPREADSHEET_ID) {
        throw new Error(
          "GOOGLE_SHEETS_BAROMETRO_SPREADSHEET_ID não configurado."
        );
      }

      const grid = (await getSheetData(
        REPORT_RANGE,
        SPREADSHEET_ID,
        true
      )) as unknown as unknown[][];

      const report = parseReport(grid);

      // período "com dado" = algum hub teve volume nele
      const volumeDef = DEFS_BY_LABEL.get("Pacotes roteirizados")!;

      report.periods.forEach((period) => {
        const col = report.columnByPeriod.get(period.id)!;

        period.hasData = report.hubs.some((hub) => {
          const value = parseValue(
            hub.rowByIndicator.get(volumeDef.sheetLabel)?.[col],
            volumeDef
          );

          return typeof value === "number" && value > 0;
        });
      });

      cache = { at: Date.now(), report };

      return report;
    })().finally(() => {
      inflight = null;
    });
  }

  return inflight;
}

// ------------------------------------------------------------
// API do serviço
// ------------------------------------------------------------

// 7 casas significativas bastam e deixam o JSON bem menor
const compact = (value: CellValue): CellValue =>
  typeof value === "number"
    ? Number(value.toPrecision(7))
    : value;

export async function getBarometroData(): Promise<BarometroResponse> {
  const report = await loadReport();

  const indicators: BarometroIndicatorMeta[] = INDICATORS.map(
    (def) => ({
      key: def.key,
      label: def.label,
      group: def.group,
      kind: def.kind,
      goodWhen: def.goodWhen,
      weeklyOnly: Boolean(def.weeklyOnly),
      indent: Boolean(def.indent),
    })
  );

  const columns = report.periods.map(
    (period) => report.columnByPeriod.get(period.id)!
  );

  const hubs: BarometroHub[] = report.hubs.map((hub) => {
    const series: Record<string, CellValue[]> = {};

    INDICATORS.forEach((def) => {
      series[def.key] = columns.map((col, index) => {
        // indicadores da pesquisa só existem na coluna da semana
        if (
          def.weeklyOnly &&
          report.periods[index].type === "day"
        ) {
          return null;
        }

        const value = parseValue(
          hub.rowByIndicator.get(def.sheetLabel)?.[col],
          def
        );

        return def.zeroIsMissing && value === 0 ? null : value;
      });
    });

    // hub sem volume na coluna não operou: a planilha mostra 0 em
    // tudo, o que seria lido como desempenho real
    columns.forEach((_, index) => {
      const hasVolume =
        (series.pacotes_roteirizados[index] as number) > 0 ||
        (series.pacotes_expedidos[index] as number) > 0;

      if (!hasVolume) {
        INDICATORS.forEach((def) => {
          series[def.key][index] = null;
        });
      }
    });

    INDICATORS.forEach((def) => {
      series[def.key] = series[def.key].map(compact);
    });

    return {
      hub: hub.hub,
      hub_code: hub.hub_code,
      regional: hub.regional,
      subregional: hub.subregional,
      series,
    };
  });

  return {
    periods: report.periods,
    indicators,
    groups: INDICATOR_GROUPS,
    hubs,
  };
}
