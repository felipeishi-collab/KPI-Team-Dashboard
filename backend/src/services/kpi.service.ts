import { getSheetData } from "./googleSheets";

interface AtNoPisoData {
  d_ref: string;
  station_id: number;
  station_code: string;
  station_name: string;
  dispatch_window: string;
  at_no_piso: number;
  qty_at_delivering: number;
}

interface AtNoPisoFilters {
  startDate?: string;
  endDate?: string;
  station?: string;
  dispatchWindow?: string;
}

interface AtNoPisoPeriod {
  period: string;
  qty_at_delivering: number;
  at_no_piso: number;
}

export async function getAtNoPisoData(
  filters: AtNoPisoFilters
) {
  const rows = await getSheetData("Base!A:G");

  if (rows.length <= 1) {
    return {
      summary: {
        qty_at_delivering: 0,
        at_no_piso: 0,
        percent_at_no_piso: 0,
      },
      daily: [],
      weekly: [],
      monthly: [],
    };
  }

  const [, ...dataRows] = rows;

  let data: AtNoPisoData[] = dataRows.map((row) => ({
    d_ref: row[0],
    station_id: Number(row[1]),
    station_code: row[2],
    station_name: row[3],
    dispatch_window: row[4],
    at_no_piso: Number(row[5]) || 0,
    qty_at_delivering: Number(row[6]) || 0,
  }));

  // =========================
  // FILTROS
  // =========================

  if (filters.startDate) {
    data = data.filter(
      (item) => item.d_ref >= filters.startDate!
    );
  }

  if (filters.endDate) {
    data = data.filter(
      (item) => item.d_ref <= filters.endDate!
    );
  }

  if (filters.station) {
    data = data.filter(
      (item) => item.station_code === filters.station
    );
  }

  if (filters.dispatchWindow) {
    data = data.filter(
      (item) =>
        item.dispatch_window === filters.dispatchWindow
    );
  }

  // =========================
  // SUMMARY
  // =========================

  const qtyAtDelivering = data.reduce(
    (total, item) => total + item.qty_at_delivering,
    0
  );

  const atNoPiso = data.reduce(
    (total, item) => total + item.at_no_piso,
    0
  );

  const percentAtNoPiso =
    qtyAtDelivering > 0
      ? (atNoPiso / qtyAtDelivering) * 100
      : 0;

  const summary = {
    qty_at_delivering: qtyAtDelivering,
    at_no_piso: atNoPiso,
    percent_at_no_piso: Number(
      percentAtNoPiso.toFixed(2)
    ),
  };

  // =========================
  // AGRUPAMENTO DIÁRIO
  // =========================

  const dailyMap = new Map<
    string,
    AtNoPisoPeriod
  >();

  data.forEach((item) => {
    if (!dailyMap.has(item.d_ref)) {
      dailyMap.set(item.d_ref, {
        period: item.d_ref,
        qty_at_delivering: 0,
        at_no_piso: 0,
      });
    }

    const current = dailyMap.get(item.d_ref)!;

    current.qty_at_delivering += item.qty_at_delivering;
    current.at_no_piso += item.at_no_piso;
  });

  const daily = Array.from(dailyMap.values()).sort(
    (a, b) => a.period.localeCompare(b.period)
  );

  // =========================
  // AGRUPAMENTO SEMANAL
  // =========================

  const getWeekStart = (dateString: string) => {
    const date = new Date(`${dateString}T00:00:00`);

    const day = date.getDay();

    const diff = day === 0 ? -6 : 1 - day;

    date.setDate(date.getDate() + diff);

    return date.toISOString().split("T")[0];
  };

  const weeklyMap = new Map<
    string,
    AtNoPisoPeriod
  >();

  data.forEach((item) => {
    const weekStart = getWeekStart(item.d_ref);

    if (!weeklyMap.has(weekStart)) {
      weeklyMap.set(weekStart, {
        period: weekStart,
        qty_at_delivering: 0,
        at_no_piso: 0,
      });
    }

    const current = weeklyMap.get(weekStart)!;

    current.qty_at_delivering += item.qty_at_delivering;
    current.at_no_piso += item.at_no_piso;
  });

  const weekly = Array.from(
    weeklyMap.values()
  ).sort((a, b) =>
    a.period.localeCompare(b.period)
  );

  // =========================
  // AGRUPAMENTO MENSAL
  // =========================

  const monthlyMap = new Map<
    string,
    AtNoPisoPeriod
  >();

  data.forEach((item) => {
    const month = item.d_ref.substring(0, 7);

    if (!monthlyMap.has(month)) {
      monthlyMap.set(month, {
        period: month,
        qty_at_delivering: 0,
        at_no_piso: 0,
      });
    }

    const current = monthlyMap.get(month)!;

    current.qty_at_delivering += item.qty_at_delivering;
    current.at_no_piso += item.at_no_piso;
  });

  const monthly = Array.from(
    monthlyMap.values()
  ).sort((a, b) =>
    a.period.localeCompare(b.period)
  );

  // =========================
  // RESULTADO
  // =========================

  return {
    summary,
    daily,
    weekly,
    monthly,
  };
}