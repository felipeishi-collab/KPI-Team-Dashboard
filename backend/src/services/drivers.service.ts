import { getSheetData } from "./googleSheets";

// ============================================================
// PLANILHA / RANGE
//
// 21 colunas: data, semana, station_id, station_code, station_name,
// sub_regional, regional, drivers_confirmados, drivers_ativos,
// ativos_nao_confirmados, drivers_ofertados, call_ups_declinados,
// rejeite_timeout, rejeite_problemas_mecanicos,
// rejeite_problemas_pessoais_saude, rejeite_chuvas_fortes,
// rejeite_reatribuicao_outro_motorista, rejeite_outros_motivos,
// rejeite_fora_regiao_preferencia, rejeite_horario_expedicao,
// rejeite_desistiu_rodar_hoje
// ============================================================

const DRIVERS_RANGE = "Base!A:U";

// Se GOOGLE_SHEETS_DRIVERS_SPREADSHEET_ID não estiver definido,
// usa a mesma planilha já configurada para os outros KPIs.
const DRIVERS_SPREADSHEET_ID =
  process.env.GOOGLE_SHEETS_DRIVERS_SPREADSHEET_ID ||
  process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

interface DriverRow {
  d_ref: string;
  semana: string;
  station_id: number;
  station_code: string;
  station_name: string;
  drivers_confirmados: number;
  drivers_ativos: number;
  ativos_nao_confirmados: number;
  call_ups_declinados: number;
  rejeite_timeout: number;
  rejeite_ativo_soma: number;
}

interface DriversFilters {
  startDate?: string;
  endDate?: string;
  station?: string;
  stationId?: string;
  stationName?: string;
}

export interface DriversPeriod {
  period: string;
  percent_ocupacao: number;
  drivers_confirmados: number;
  percent_rejeite_ativo: number;
  rejeite_ativo_absoluto: number;
}

interface DailyAgg {
  d_ref: string;
  semana: string;
  drivers_confirmados: number;
  drivers_ativos: number;
  ativos_nao_confirmados: number;
  call_ups_declinados: number;
  rejeite_ativo_soma: number;
  rejeite_timeout: number;
}

export interface DriversStationPeriod {
  period: string;
  station_id: number;
  station_code: string;
  station_name: string;
  percent_ocupacao: number;
  drivers_confirmados: number;
  percent_rejeite_ativo: number;
  rejeite_ativo_absoluto: number;
}

// mesmos campos de DailyAgg + identificação da estação —
// usado só para a quebra por estação da tabela
// "Detalhamento" (os gráficos continuam usando DailyAgg,
// somado entre todas as estações)
interface DailyStationAgg {
  d_ref: string;
  station_id: number;
  station_code: string;
  station_name: string;
  drivers_confirmados: number;
  drivers_ativos: number;
  ativos_nao_confirmados: number;
  call_ups_declinados: number;
  rejeite_ativo_soma: number;
  rejeite_timeout: number;
}

// ============================================================
// LEITURA E PARSE DA PLANILHA
// ============================================================

async function fetchDriverRows(): Promise<DriverRow[]> {
  const rows = await getSheetData(
    DRIVERS_RANGE,
    DRIVERS_SPREADSHEET_ID
  );

  if (rows.length <= 1) {
    return [];
  }

  const [, ...dataRows] = rows;

  return dataRows.map((row) => {
    const rejeitesAtivos =
      // soma de todos os rejeites, EXCETO rejeite_timeout (coluna M)
      (Number(row[13]) || 0) + // rejeite_problemas_mecanicos
      (Number(row[14]) || 0) + // rejeite_problemas_pessoais_saude
      (Number(row[15]) || 0) + // rejeite_chuvas_fortes
      (Number(row[16]) || 0) + // rejeite_reatribuicao_outro_motorista
      (Number(row[17]) || 0) + // rejeite_outros_motivos
      (Number(row[18]) || 0) + // rejeite_fora_regiao_preferencia
      (Number(row[19]) || 0) + // rejeite_horario_expedicao
      (Number(row[20]) || 0); // rejeite_desistiu_rodar_hoje

    return {
      d_ref: row[0],
      semana: row[1],
      station_id: Number(row[2]),
      station_code: row[3],
      station_name: row[4],
      drivers_confirmados: Number(row[7]) || 0,
      drivers_ativos: Number(row[8]) || 0,
      ativos_nao_confirmados: Number(row[9]) || 0,
      call_ups_declinados: Number(row[11]) || 0,
      rejeite_timeout: Number(row[12]) || 0,
      rejeite_ativo_soma: rejeitesAtivos,
    };
  });
}

// ============================================================
// FILTROS (mesmos filtros do KPI de ATs no piso)
// ============================================================

function applyFilters(
  data: DriverRow[],
  filters: DriversFilters
): DriverRow[] {
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

// ============================================================
// AGREGAÇÃO DIÁRIA (soma entre estações filtradas, por dia)
// ============================================================

function buildDailyAggregates(
  rows: DriverRow[]
): DailyAgg[] {
  const map = new Map<string, DailyAgg>();

  rows.forEach((row) => {
    const key = row.d_ref;

    if (!map.has(key)) {
      map.set(key, {
        d_ref: row.d_ref,
        semana: row.semana,
        drivers_confirmados: 0,
        drivers_ativos: 0,
        ativos_nao_confirmados: 0,
        call_ups_declinados: 0,
        rejeite_ativo_soma: 0,
        rejeite_timeout: 0,
      });
    }

    const agg = map.get(key)!;

    agg.drivers_confirmados += row.drivers_confirmados;
    agg.drivers_ativos += row.drivers_ativos;
    agg.ativos_nao_confirmados += row.ativos_nao_confirmados;
    agg.call_ups_declinados += row.call_ups_declinados;
    agg.rejeite_ativo_soma += row.rejeite_ativo_soma;
    agg.rejeite_timeout += row.rejeite_timeout;
  });

  return Array.from(map.values()).sort((a, b) =>
    a.d_ref.localeCompare(b.d_ref)
  );
}

// ============================================================
// AGREGAÇÃO DIÁRIA POR ESTAÇÃO
// (usada só pela tabela "Detalhamento")
// ============================================================

function buildDailyStationAggregates(
  rows: DriverRow[]
): DailyStationAgg[] {
  const map = new Map<string, DailyStationAgg>();

  rows.forEach((row) => {
    const key = `${row.d_ref}|${row.station_code}`;

    if (!map.has(key)) {
      map.set(key, {
        d_ref: row.d_ref,
        station_id: row.station_id,
        station_code: row.station_code,
        station_name: row.station_name,
        drivers_confirmados: 0,
        drivers_ativos: 0,
        ativos_nao_confirmados: 0,
        call_ups_declinados: 0,
        rejeite_ativo_soma: 0,
        rejeite_timeout: 0,
      });
    }

    const agg = map.get(key)!;

    agg.drivers_confirmados += row.drivers_confirmados;
    agg.drivers_ativos += row.drivers_ativos;
    agg.ativos_nao_confirmados += row.ativos_nao_confirmados;
    agg.call_ups_declinados += row.call_ups_declinados;
    agg.rejeite_ativo_soma += row.rejeite_ativo_soma;
    agg.rejeite_timeout += row.rejeite_timeout;
  });

  return Array.from(map.values());
}

// ============================================================
// FÓRMULAS DOS EIXOS
//
// Aceitam tanto DailyAgg (somado entre estações) quanto
// DailyStationAgg (por estação) — só usam os campos numéricos
// em comum entre os dois.
// ============================================================

interface DriversMetricsAgg {
  drivers_confirmados: number;
  drivers_ativos: number;
  ativos_nao_confirmados: number;
  call_ups_declinados: number;
  rejeite_ativo_soma: number;
  rejeite_timeout: number;
}

function dailyPercentOcupacao(
  agg: DriversMetricsAgg
): number {
  const denom =
    agg.drivers_confirmados + agg.ativos_nao_confirmados;

  return denom > 0 ? (agg.drivers_ativos / denom) * 100 : 0;
}

function dailyPercentRejeiteAtivo(
  agg: DriversMetricsAgg
): number {
  return agg.call_ups_declinados > 0
    ? (agg.rejeite_ativo_soma / agg.call_ups_declinados) * 100
    : 0;
}

function dailyRejeiteAbsoluto(
  agg: DriversMetricsAgg
): number {
  return agg.call_ups_declinados - agg.rejeite_timeout;
}

// ============================================================
// DIÁRIO
// ============================================================

function toDailyPeriods(
  aggs: DailyAgg[]
): DriversPeriod[] {
  return aggs.map((agg) => ({
    period: agg.d_ref,
    percent_ocupacao: dailyPercentOcupacao(agg),
    drivers_confirmados: agg.drivers_confirmados,
    percent_rejeite_ativo: dailyPercentRejeiteAtivo(agg),
    rejeite_ativo_absoluto: dailyRejeiteAbsoluto(agg),
  }));
}

function toDailyStationPeriods(
  aggs: DailyStationAgg[]
): DriversStationPeriod[] {
  return aggs
    .map((agg) => ({
      period: agg.d_ref,
      station_id: agg.station_id,
      station_code: agg.station_code,
      station_name: agg.station_name,
      percent_ocupacao: dailyPercentOcupacao(agg),
      drivers_confirmados: agg.drivers_confirmados,
      percent_rejeite_ativo:
        dailyPercentRejeiteAtivo(agg),
      rejeite_ativo_absoluto:
        dailyRejeiteAbsoluto(agg),
    }))
    .sort((a, b) => {
      if (a.period !== b.period) {
        return a.period.localeCompare(b.period);
      }

      return a.station_code.localeCompare(
        b.station_code
      );
    });
}

// ============================================================
// SEMANAL / MENSAL
//
// Todas as métricas são recalculadas a partir da SOMA dos
// números brutos do período (drivers confirmados, ativos, call
// ups, rejeites etc.) — nunca somando percentuais diários já
// prontos. Somar percentual dá números sem sentido (7 dias somados
// já passa de 100%, ~30 dias passa de 1000%+), porque percentual
// não é uma grandeza aditiva.
//
// Na prática, isso é a mesma agregação diária (buildDailyAggregates
// + as fórmulas de dailyPercentOcupacao/dailyPercentRejeiteAtivo/
// dailyRejeiteAbsoluto), só que juntando por semana/mês em vez de
// por dia — daí reaproveitar as mesmas fórmulas aqui.
// ============================================================

function groupBy(
  aggs: DailyAgg[],
  keyFn: (agg: DailyAgg) => string
): DriversPeriod[] {
  const map = new Map<
    string,
    DriversMetricsAgg
  >();

  aggs.forEach((agg) => {
    const key = keyFn(agg);

    if (!map.has(key)) {
      map.set(key, {
        drivers_confirmados: 0,
        drivers_ativos: 0,
        ativos_nao_confirmados: 0,
        call_ups_declinados: 0,
        rejeite_ativo_soma: 0,
        rejeite_timeout: 0,
      });
    }

    const bucket = map.get(key)!;

    bucket.drivers_confirmados += agg.drivers_confirmados;
    bucket.drivers_ativos += agg.drivers_ativos;
    bucket.ativos_nao_confirmados +=
      agg.ativos_nao_confirmados;
    bucket.call_ups_declinados += agg.call_ups_declinados;
    bucket.rejeite_ativo_soma += agg.rejeite_ativo_soma;
    bucket.rejeite_timeout += agg.rejeite_timeout;
  });

  return Array.from(map.entries())
    .map(([period, bucket]) => ({
      period,
      percent_ocupacao: dailyPercentOcupacao(bucket),
      drivers_confirmados: bucket.drivers_confirmados,
      percent_rejeite_ativo:
        dailyPercentRejeiteAtivo(bucket),
      rejeite_ativo_absoluto:
        dailyRejeiteAbsoluto(bucket),
    }))
    .sort((a, b) => a.period.localeCompare(b.period));
}

function groupByStation(
  aggs: DailyStationAgg[],
  keyFn: (agg: DailyStationAgg) => string
): DriversStationPeriod[] {
  const map = new Map<
    string,
    DriversMetricsAgg & {
      period: string;
      station_id: number;
      station_code: string;
      station_name: string;
    }
  >();

  aggs.forEach((agg) => {
    const period = keyFn(agg);
    const mapKey = `${period}|${agg.station_code}`;

    if (!map.has(mapKey)) {
      map.set(mapKey, {
        period,
        station_id: agg.station_id,
        station_code: agg.station_code,
        station_name: agg.station_name,
        drivers_confirmados: 0,
        drivers_ativos: 0,
        ativos_nao_confirmados: 0,
        call_ups_declinados: 0,
        rejeite_ativo_soma: 0,
        rejeite_timeout: 0,
      });
    }

    const bucket = map.get(mapKey)!;

    bucket.drivers_confirmados += agg.drivers_confirmados;
    bucket.drivers_ativos += agg.drivers_ativos;
    bucket.ativos_nao_confirmados +=
      agg.ativos_nao_confirmados;
    bucket.call_ups_declinados += agg.call_ups_declinados;
    bucket.rejeite_ativo_soma += agg.rejeite_ativo_soma;
    bucket.rejeite_timeout += agg.rejeite_timeout;
  });

  return Array.from(map.values())
    .map((bucket) => ({
      period: bucket.period,
      station_id: bucket.station_id,
      station_code: bucket.station_code,
      station_name: bucket.station_name,
      percent_ocupacao: dailyPercentOcupacao(bucket),
      drivers_confirmados: bucket.drivers_confirmados,
      percent_rejeite_ativo:
        dailyPercentRejeiteAtivo(bucket),
      rejeite_ativo_absoluto:
        dailyRejeiteAbsoluto(bucket),
    }))
    .sort((a, b) => {
      if (a.period !== b.period) {
        return a.period.localeCompare(b.period);
      }

      return a.station_code.localeCompare(
        b.station_code
      );
    });
}

function getMonthKey(d_ref: string): string {
  return d_ref.substring(0, 7);
}

// Mesmo cálculo de "início da semana" (segunda-feira) usado
// em kpi.service.ts — assim as chaves semanais dos dois
// gráficos/tabela sempre batem, sem depender da coluna
// "semana" da planilha (que pode não vir no mesmo formato).
function getWeekStart(dateString: string): string {
  const date = new Date(`${dateString}T00:00:00`);

  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;

  date.setDate(date.getDate() + diff);

  return date.toISOString().split("T")[0];
}

// ============================================================
// FUNÇÃO PRINCIPAL
// ============================================================

export async function getDriversData(
  filters: DriversFilters
) {
  const rows = await fetchDriverRows();
  const filtered = applyFilters(rows, filters);
  const dailyAggs = buildDailyAggregates(filtered);

  const daily = toDailyPeriods(dailyAggs);

  // agrupa semanal pela segunda-feira daquela semana —
  // mesma lógica do KPI de ATs no piso (semana civil)
  const weekly = groupBy(dailyAggs, (agg) =>
    getWeekStart(agg.d_ref)
  );

  const monthly = groupBy(dailyAggs, (agg) =>
    getMonthKey(agg.d_ref)
  );

  // quebra por estação — só pra tabela "Detalhamento"
  const dailyStationAggs =
    buildDailyStationAggregates(filtered);

  const dailyByStation = toDailyStationPeriods(
    dailyStationAggs
  );

  const weeklyByStation = groupByStation(
    dailyStationAggs,
    (agg) => getWeekStart(agg.d_ref)
  );

  const monthlyByStation = groupByStation(
    dailyStationAggs,
    (agg) => getMonthKey(agg.d_ref)
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
