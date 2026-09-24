import { getSheetData } from "./googleSheets";

// ============================================================
// PLANILHA / RANGE
//
// 7 colunas: data, semana, station_id, station_name, station_code,
// SPR_route, SPR_delivering
// ============================================================

const SPR_RANGE = "Base!A:G";

// Se GOOGLE_SHEETS_SPR_SPREADSHEET_ID não estiver definido, usa a
// mesma planilha já configurada para os outros KPIs.
const SPR_SPREADSHEET_ID =
  process.env.GOOGLE_SHEETS_SPR_SPREADSHEET_ID ||
  process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

interface SprRow {
  d_ref: string;
  station_id: number;
  station_code: string;
  station_name: string;
  spr_route: number;
  spr_delivering: number;
}

interface SprFilters {
  startDate?: string;
  endDate?: string;
  station?: string;
  stationId?: string;
  stationName?: string;
}

export interface SprPeriod {
  period: string;
  spr_route: number;
  spr_delivering: number;
  gap: number;
}

export interface SprStationPeriod {
  period: string;
  station_id: number;
  station_code: string;
  station_name: string;
  spr_route: number;
  spr_delivering: number;
  gap: number;
}

// ============================================================
// LEITURA E PARSE DA PLANILHA
// ============================================================

async function fetchSprRows(): Promise<SprRow[]> {
  const rows = await getSheetData(SPR_RANGE, SPR_SPREADSHEET_ID);

  if (rows.length <= 1) {
    return [];
  }

  const [, ...dataRows] = rows;

  return dataRows.map((row) => ({
    d_ref: row[0],
    station_id: Number(row[2]),
    station_name: row[3],
    station_code: row[4],
    spr_route: Number(row[5]) || 0,
    spr_delivering: Number(row[6]) || 0,
  }));
}

// ============================================================
// FILTROS (mesmos filtros dos outros KPIs)
// ============================================================

function applyFilters(
  data: SprRow[],
  filters: SprFilters
): SprRow[] {
  let filtered = data;

  if (filters.startDate) {
    filtered = filtered.filter(
      (row) => row.d_ref >= filters.startDate!
    );
  }

  if (filters.endDate) {
    filtered = filtered.filter(
      (row) => row.d_ref <= filters.endDate!
    );
  }

  if (filters.station) {
    filtered = filtered.filter(
      (row) => row.station_code === filters.station
    );
  }

  if (filters.stationId) {
    filtered = filtered.filter(
      (row) => String(row.station_id) === filters.stationId
    );
  }

  if (filters.stationName) {
    const search = filters.stationName.toLowerCase();

    filtered = filtered.filter((row) =>
      row.station_name.toLowerCase().includes(search)
    );
  }

  return filtered;
}

function getMonthKey(d_ref: string): string {
  return d_ref.substring(0, 7);
}

// mesmo cálculo de "início da semana" (segunda-feira) usado nos
// outros serviços — assim as chaves semanais sempre batem entre
// os gráficos/tabela, sem depender da coluna "semana" da planilha
function getWeekStart(dateString: string): string {
  const date = new Date(`${dateString}T00:00:00`);

  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;

  date.setDate(date.getDate() + diff);

  return date.toISOString().split("T")[0];
}

// ============================================================
// AGREGAÇÃO POR PERÍODO
//
// SPR_route e SPR_delivering são um índice/taxa por estação-dia
// (os valores ficam sempre na casa de ~100, não crescem com o
// volume) — não uma contagem. Por isso a agregação correta é a
// MÉDIA entre as linhas do período (todas as estações e dias que
// caem naquele dia/semana/mês), nunca a SOMA: somar dezenas ou
// centenas de linhas de ~100 cada é o que produzia números
// (centenas de milhões) completamente fora da realidade. O GAP é
// sempre recalculado a partir da média do período
// (spr_delivering - spr_route) — como é uma subtração de médias,
// dá no mesmo resultado que a média dos gaps diários, já que média
// é uma operação linear (diferente da soma, isso não introduz o
// mesmo tipo de erro que o bugfix de % Ocupação em
// drivers.service.ts corrigiu).
// ============================================================

function groupByPeriod(
  rows: SprRow[],
  keyFn: (row: SprRow) => string
): SprPeriod[] {
  const map = new Map<
    string,
    {
      routeSum: number;
      deliveringSum: number;
      count: number;
    }
  >();

  rows.forEach((row) => {
    const key = keyFn(row);

    if (!map.has(key)) {
      map.set(key, {
        routeSum: 0,
        deliveringSum: 0,
        count: 0,
      });
    }

    const bucket = map.get(key)!;

    bucket.routeSum += row.spr_route;
    bucket.deliveringSum += row.spr_delivering;
    bucket.count += 1;
  });

  return Array.from(map.entries())
    .map(([period, bucket]) => {
      const spr_route =
        bucket.count > 0
          ? bucket.routeSum / bucket.count
          : 0;

      const spr_delivering =
        bucket.count > 0
          ? bucket.deliveringSum / bucket.count
          : 0;

      return {
        period,
        spr_route,
        spr_delivering,
        gap: spr_delivering - spr_route,
      };
    })
    .sort((a, b) => a.period.localeCompare(b.period));
}

// ============================================================
// AGREGAÇÃO POR PERÍODO + ESTAÇÃO
// (usada só pela tabela "Detalhamento")
// ============================================================

function groupByPeriodAndStation(
  rows: SprRow[],
  keyFn: (row: SprRow) => string
): SprStationPeriod[] {
  const map = new Map<
    string,
    {
      period: string;
      station_id: number;
      station_code: string;
      station_name: string;
      routeSum: number;
      deliveringSum: number;
      count: number;
    }
  >();

  rows.forEach((row) => {
    const period = keyFn(row);
    const mapKey = `${period}|${row.station_code}`;

    if (!map.has(mapKey)) {
      map.set(mapKey, {
        period,
        station_id: row.station_id,
        station_code: row.station_code,
        station_name: row.station_name,
        routeSum: 0,
        deliveringSum: 0,
        count: 0,
      });
    }

    const bucket = map.get(mapKey)!;

    bucket.routeSum += row.spr_route;
    bucket.deliveringSum += row.spr_delivering;
    bucket.count += 1;
  });

  return Array.from(map.values())
    .map((bucket) => {
      const spr_route =
        bucket.count > 0
          ? bucket.routeSum / bucket.count
          : 0;

      const spr_delivering =
        bucket.count > 0
          ? bucket.deliveringSum / bucket.count
          : 0;

      return {
        period: bucket.period,
        station_id: bucket.station_id,
        station_code: bucket.station_code,
        station_name: bucket.station_name,
        spr_route,
        spr_delivering,
        gap: spr_delivering - spr_route,
      };
    })
    .sort((a, b) => {
      if (a.period !== b.period) {
        return a.period.localeCompare(b.period);
      }

      return a.station_code.localeCompare(b.station_code);
    });
}

// ============================================================
// FUNÇÃO PRINCIPAL
// ============================================================

export async function getSprData(filters: SprFilters) {
  const rows = await fetchSprRows();
  const filtered = applyFilters(rows, filters);

  const daily = groupByPeriod(filtered, (row) => row.d_ref);

  const weekly = groupByPeriod(filtered, (row) =>
    getWeekStart(row.d_ref)
  );

  const monthly = groupByPeriod(filtered, (row) =>
    getMonthKey(row.d_ref)
  );

  const dailyByStation = groupByPeriodAndStation(
    filtered,
    (row) => row.d_ref
  );

  const weeklyByStation = groupByPeriodAndStation(
    filtered,
    (row) => getWeekStart(row.d_ref)
  );

  const monthlyByStation = groupByPeriodAndStation(
    filtered,
    (row) => getMonthKey(row.d_ref)
  );

  return {
    daily,
    weekly,
    monthly,
    dailyByStation,
    weeklyByStation,
    monthlyByStation,
  };
}
