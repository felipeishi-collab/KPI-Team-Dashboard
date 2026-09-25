import { useEffect, useMemo, useState } from "react";

import {
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Download,
  Filter,
  Percent,
  RotateCcw,
  TrendingUp,
  Users,
} from "lucide-react";

import Sidebar from "../../components/layout/Sidebar";
import Topbar from "../../components/layout/Topbar";


import { bauKpis } from "./bauKpis";

import {
  downloadCsv,
  downloadXlsx,
} from "../../utils/exportTable";
import type {
  ExportCell,
  ExportColumn,
} from "../../utils/exportTable";

import DriversBarChart from "./DriversBarChart";
import type { BarChartDatum } from "./DriversBarChart";

import SprGapChart from "./SprGapChart";
import type { SprChartDatum } from "./SprGapChart";

import "./BAU.css";

interface User {
  name: string;
  email: string;
}

interface PeriodData {
  period: string;
  qty_at_delivering: number;
  at_no_piso: number;
}

interface AtNoPisoStationPeriod {
  period: string;
  station_id: number;
  station_code: string;
  station_name: string;
  qty_at_delivering: number;
  at_no_piso: number;
}

interface ApiResponse {
  data: {
    summary: {
      qty_at_delivering: number;
      at_no_piso: number;
      percent_at_no_piso: number;
    };

    daily: PeriodData[];
    weekly: PeriodData[];
    monthly: PeriodData[];

    dailyByStation: AtNoPisoStationPeriod[];
    weeklyByStation: AtNoPisoStationPeriod[];
    monthlyByStation: AtNoPisoStationPeriod[];
  };
}

interface DriversPeriod {
  period: string;
  percent_ocupacao: number;
  drivers_confirmados: number;
  percent_rejeite_ativo: number;
  rejeite_ativo_absoluto: number;
}

interface DriversStationPeriod {
  period: string;
  station_id: number;
  station_code: string;
  station_name: string;
  percent_ocupacao: number;
  drivers_confirmados: number;
  percent_rejeite_ativo: number;
  rejeite_ativo_absoluto: number;
}

interface DriversApiResponse {
  data: {
    daily: DriversPeriod[];
    weekly: DriversPeriod[];
    monthly: DriversPeriod[];

    dailyByStation: DriversStationPeriod[];
    weeklyByStation: DriversStationPeriod[];
    monthlyByStation: DriversStationPeriod[];
  };
}

interface SprPeriod {
  period: string;
  spr_route: number;
  spr_delivering: number;
  gap: number;
}

interface SprStationPeriod {
  period: string;
  station_id: number;
  station_code: string;
  station_name: string;
  spr_route: number;
  spr_delivering: number;
  gap: number;
}

interface SprApiResponse {
  data: {
    daily: SprPeriod[];
    weekly: SprPeriod[];
    monthly: SprPeriod[];

    dailyByStation: SprStationPeriod[];
    weeklyByStation: SprStationPeriod[];
    monthlyByStation: SprStationPeriod[];
  };
}

interface StationOption {
  station_id: number;
  station_code: string;
  station_name: string;
}

type Granularity =
  | "daily"
  | "weekly"
  | "monthly";

// quantidade de linhas da tabela "Detalhamento" exibidas
// por página (ver PAGINAÇÃO DA TABELA, dentro do componente)
const TABLE_PAGE_SIZE = 50;

// ============================================================
// JANELA PADRÃO DE DATAS
//
// Ao abrir a tela (ou clicar em "Limpar filtros"), a visão
// diária não deve vir com todo o histórico de uma vez — por
// padrão mostramos só os últimos 30 dias (hoje incluído) em
// todos os gráficos. O usuário ainda pode ajustar/ampliar pelos
// filtros de data normalmente.
// ============================================================

function formatDateForFilter(date: Date): string {
  const year = date.getFullYear();
  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");
  const day = String(
    date.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getDefaultDateRange() {
  const end = new Date();
  const start = new Date();

  start.setDate(start.getDate() - 29);

  return {
    startDate: formatDateForFilter(start),
    endDate: formatDateForFilter(end),
  };
}

// gráficos de drivers que aparecem como opção no painel de
// KPIs à esquerda — selecionar/desmarcar mostra ou esconde o
// gráfico correspondente lá embaixo
interface DriverChartOption {
  id: string;
  name: string;
  description: string;
}

const driverChartOptions: DriverChartOption[] = [
  {
    id: "occupancy",
    name: "Ocupação",
    description:
      "% de ocupação ou drivers confirmados no D-1 (abs.), por período.",
  },
  {
    id: "rejection",
    name: "Rejeite Ativo",
    description:
      "% de rejeite ativo ou volume absoluto de rejeite ativo, por período.",
  },
];

// visão exibida dentro de cada gráfico de drivers:
// percentual ou absoluto (um ou outro, nunca os dois juntos —
// assim cada gráfico tem uma escala só)
type DriverChartView = "percent" | "abs";

// gráfico de SPR (Delivering x Route) — mesmo padrão de seleção
// dos gráficos de drivers acima
interface SprChartOption {
  id: string;
  name: string;
  description: string;
}

const sprChartOptions: SprChartOption[] = [
  {
    id: "spr_gap",
    name: "SPR Delivering x Route",
    description:
      "Comparação entre SPR Delivering e SPR Route, com o GAP (Delivering − Route) por período.",
  },
];

function BAU() {
  // ============================================================
  // USUÁRIO
  // ============================================================

  const storedUser =
    localStorage.getItem("kpi_user");

  const user: User = storedUser
    ? JSON.parse(storedUser)
    : {
        name: "",
        email: "",
      };

  // ============================================================
  // FILTROS
  // ============================================================

  const [stationCode, setStationCode] =
    useState("");

  const [stationId, setStationId] =
    useState("");

  const [stationName, setStationName] =
    useState("");

  const defaultDateRange = getDefaultDateRange();

  const [startDate, setStartDate] =
    useState(defaultDateRange.startDate);

  const [endDate, setEndDate] =
    useState(defaultDateRange.endDate);

  // incrementado a cada "Limpar filtros", usado como key
  // dos inputs de data pra forçar o navegador a limpá-los
  const [filterResetKey, setFilterResetKey] =
    useState(0);

  // ============================================================
  // LISTA DE ESTAÇÕES (AUTOCOMPLETE)
  // ============================================================

  const [stations, setStations] = useState<
    StationOption[]
  >([]);

  useEffect(() => {
    async function fetchStations() {
      try {
        const response = await fetch(
          "http://localhost:3001/api/kpis/stations"
        );

        if (!response.ok) {
          return;
        }

        const result: {
          data: StationOption[];
        } = await response.json();

        setStations(result.data || []);
      } catch (err) {
        console.error(
          "Erro ao buscar lista de estações:",
          err
        );
      }
    }

    fetchStations();
  }, []);

  const stationCodeOptions = useMemo(
    () =>
      Array.from(
        new Set(
          stations.map(
            (item) => item.station_code
          )
        )
      ),
    [stations]
  );

  const stationIdOptions = useMemo(
    () =>
      Array.from(
        new Set(
          stations.map((item) =>
            String(item.station_id)
          )
        )
      ),
    [stations]
  );

  const stationNameOptions = useMemo(
    () =>
      Array.from(
        new Set(
          stations.map(
            (item) => item.station_name
          )
        )
      ),
    [stations]
  );

  // ============================================================
  // KPI SELECIONADO
  // ============================================================

  const [selectedKpis, setSelectedKpis] =
    useState<string[]>([
      "at_no_piso",
      "percent_at_no_piso",
    ]);

  // ============================================================
  // GRÁFICOS DE DRIVERS SELECIONADOS
  // (mesmo painel de KPIs à esquerda também deixa escolher quais
  // dos dois gráficos de drivers aparecem na tela)
  // ============================================================

  const [
    selectedDriverCharts,
    setSelectedDriverCharts,
  ] = useState<string[]>([
    "occupancy",
    "rejection",
  ]);

  // visão (% ou abs.) selecionada em cada gráfico de drivers
  const [occupancyView, setOccupancyView] =
    useState<DriverChartView>("percent");

  const [rejectionView, setRejectionView] =
    useState<DriverChartView>("percent");

  // ============================================================
  // GRÁFICO DE SPR SELECIONADO
  // (mesmo painel de KPIs à esquerda também deixa escolher se o
  // gráfico de SPR aparece na tela)
  // ============================================================

  const [
    selectedSprCharts,
    setSelectedSprCharts,
  ] = useState<string[]>(["spr_gap"]);

  // ============================================================
  // GRANULARIDADE
  // ============================================================

  const [granularity, setGranularity] =
    useState<Granularity>("daily");

  // ============================================================
  // DADOS
  // ============================================================

  const [apiData, setApiData] =
    useState<ApiResponse["data"] | null>(
      null
    );

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  // ============================================================
  // DADOS — DRIVERS (OCUPAÇÃO / REJEITE ATIVO)
  // ============================================================

  const [driversData, setDriversData] =
    useState<DriversApiResponse["data"] | null>(
      null
    );

  const [driversLoading, setDriversLoading] =
    useState(true);

  const [driversError, setDriversError] =
    useState("");

  // ============================================================
  // DADOS — SPR (DELIVERING / ROUTE / GAP)
  // ============================================================

  const [sprData, setSprData] =
    useState<SprApiResponse["data"] | null>(
      null
    );

  const [sprLoading, setSprLoading] =
    useState(true);

  const [sprError, setSprError] =
    useState("");

  // ============================================================
  // BUSCAR DADOS DA API
  // ============================================================

  useEffect(() => {
    async function fetchKpiData() {
      try {
        setLoading(true);
        setError("");

        const params =
          new URLSearchParams();

        if (startDate) {
          params.append(
            "startDate",
            startDate
          );
        }

        if (endDate) {
          params.append(
            "endDate",
            endDate
          );
        }

        if (stationCode) {
          params.append(
            "station",
            stationCode
          );
        }

        if (stationId) {
          params.append(
            "stationId",
            stationId
          );
        }

        if (stationName) {
          params.append(
            "stationName",
            stationName
          );
        }

        const queryString =
          params.toString();

        const url = queryString
          ? `http://localhost:3001/api/kpis/at-no-piso?${queryString}`
          : "http://localhost:3001/api/kpis/at-no-piso";

        const response =
          await fetch(url);

        if (!response.ok) {
          throw new Error(
            `Erro HTTP ${response.status}`
          );
        }

        const result: ApiResponse =
          await response.json();

        setApiData(result.data);
      } catch (err) {
        console.error(
          "Erro ao buscar KPI AT no Piso:",
          err
        );

        setError(
          "Não foi possível carregar os dados do KPI."
        );

        setApiData(null);
      } finally {
        setLoading(false);
      }
    }

    fetchKpiData();
  }, [
    startDate,
    endDate,
    stationCode,
    stationId,
    stationName,
  ]);

  // ============================================================
  // BUSCAR DADOS DE DRIVERS (OCUPAÇÃO / REJEITE ATIVO)
  // ============================================================

  useEffect(() => {
    async function fetchDriversData() {
      try {
        setDriversLoading(true);
        setDriversError("");

        const params =
          new URLSearchParams();

        if (startDate) {
          params.append(
            "startDate",
            startDate
          );
        }

        if (endDate) {
          params.append(
            "endDate",
            endDate
          );
        }

        if (stationCode) {
          params.append(
            "station",
            stationCode
          );
        }

        if (stationId) {
          params.append(
            "stationId",
            stationId
          );
        }

        if (stationName) {
          params.append(
            "stationName",
            stationName
          );
        }

        const queryString =
          params.toString();

        const url = queryString
          ? `http://localhost:3001/api/drivers?${queryString}`
          : "http://localhost:3001/api/drivers";

        const response =
          await fetch(url);

        if (!response.ok) {
          throw new Error(
            `Erro HTTP ${response.status}`
          );
        }

        const result: DriversApiResponse =
          await response.json();

        setDriversData(result.data);
      } catch (err) {
        console.error(
          "Erro ao buscar dados de drivers:",
          err
        );

        setDriversError(
          "Não foi possível carregar os dados de drivers."
        );

        setDriversData(null);
      } finally {
        setDriversLoading(false);
      }
    }

    fetchDriversData();
  }, [
    startDate,
    endDate,
    stationCode,
    stationId,
    stationName,
  ]);

  // ============================================================
  // BUSCAR DADOS DE SPR (DELIVERING / ROUTE / GAP)
  // ============================================================

  useEffect(() => {
    async function fetchSprData() {
      try {
        setSprLoading(true);
        setSprError("");

        const params =
          new URLSearchParams();

        if (startDate) {
          params.append(
            "startDate",
            startDate
          );
        }

        if (endDate) {
          params.append(
            "endDate",
            endDate
          );
        }

        if (stationCode) {
          params.append(
            "station",
            stationCode
          );
        }

        if (stationId) {
          params.append(
            "stationId",
            stationId
          );
        }

        if (stationName) {
          params.append(
            "stationName",
            stationName
          );
        }

        const queryString =
          params.toString();

        const url = queryString
          ? `http://localhost:3001/api/spr?${queryString}`
          : "http://localhost:3001/api/spr";

        const response =
          await fetch(url);

        if (!response.ok) {
          throw new Error(
            `Erro HTTP ${response.status}`
          );
        }

        const result: SprApiResponse =
          await response.json();

        setSprData(result.data);
      } catch (err) {
        console.error(
          "Erro ao buscar dados de SPR:",
          err
        );

        setSprError(
          "Não foi possível carregar os dados de SPR."
        );

        setSprData(null);
      } finally {
        setSprLoading(false);
      }
    }

    fetchSprData();
  }, [
    startDate,
    endDate,
    stationCode,
    stationId,
    stationName,
  ]);

  // ============================================================
  // RESET DOS FILTROS
  // ============================================================

  const resetFilters = () => {
    setStationCode("");
    setStationId("");
    setStationName("");

    // volta para a mesma janela padrão de 30 dias usada ao
    // abrir a tela, em vez de limpar pra "sem filtro de data"
    // (que reabriria o mesmo problema de trazer o histórico
    // inteiro de uma vez na visão diária)
    const resetDateRange = getDefaultDateRange();

    setStartDate(resetDateRange.startDate);
    setEndDate(resetDateRange.endDate);

    // força o React a recriar os inputs de data —
    // alguns navegadores não limpam visualmente um
    // <input type="date"> só por mudar o value via JS
    setFilterResetKey((key) => key + 1);
  };

  // ============================================================
  // DADOS DO GRÁFICO
  // ============================================================

  const chartData = useMemo(() => {
    if (!apiData) {
      return [];
    }

    return apiData[granularity] || [];
  }, [
    apiData,
    granularity,
  ]);

  // ============================================================
  // DADOS DO GRÁFICO DE DRIVERS (mesma granularidade do gráfico
  // de ATs no piso, acima)
  // ============================================================

  const driversChartData = useMemo(() => {
    if (!driversData) {
      return [];
    }

    return driversData[granularity] || [];
  }, [
    driversData,
    granularity,
  ]);

  // ============================================================
  // DADOS DO GRÁFICO DE SPR (mesma granularidade dos demais)
  // ============================================================

  const sprChartData = useMemo(() => {
    if (!sprData) {
      return [];
    }

    return sprData[granularity] || [];
  }, [
    sprData,
    granularity,
  ]);

  // ============================================================
  // DADOS DA TABELA "DETALHAMENTO" — UMA LINHA POR ESTAÇÃO
  // POR PERÍODO (os gráficos acima continuam usando os totais
  // somados de apiData/driversData, sem alteração)
  // ============================================================

  const atNoPisoByStationData = useMemo(() => {
    if (!apiData) {
      return [];
    }

    const byGranularity = {
      daily: apiData.dailyByStation,
      weekly: apiData.weeklyByStation,
      monthly: apiData.monthlyByStation,
    };

    return byGranularity[granularity] || [];
  }, [apiData, granularity]);

  const driversByStationData = useMemo(() => {
    if (!driversData) {
      return [];
    }

    const byGranularity = {
      daily: driversData.dailyByStation,
      weekly: driversData.weeklyByStation,
      monthly: driversData.monthlyByStation,
    };

    return byGranularity[granularity] || [];
  }, [driversData, granularity]);

  // mapa "período|station_code" -> dados de drivers, para
  // juntar na tabela (sem risco de escala, já que cada
  // métrica fica na sua própria coluna)
  const driversByStationMap = useMemo(
    () =>
      new Map(
        driversByStationData.map((item) => [
          `${item.period}|${item.station_code}`,
          item,
        ])
      ),
    [driversByStationData]
  );

  const sprByStationData = useMemo(() => {
    if (!sprData) {
      return [];
    }

    const byGranularity = {
      daily: sprData.dailyByStation,
      weekly: sprData.weeklyByStation,
      monthly: sprData.monthlyByStation,
    };

    return byGranularity[granularity] || [];
  }, [sprData, granularity]);

  // mapa "período|station_code" -> dados de SPR, para juntar na
  // tabela (mesmo padrão do driversByStationMap acima)
  const sprByStationMap = useMemo(
    () =>
      new Map(
        sprByStationData.map((item) => [
          `${item.period}|${item.station_code}`,
          item,
        ])
      ),
    [sprByStationData]
  );

  // ============================================================
  // DOWNLOAD DA TABELA "DETALHAMENTO" (CSV / XLSX)
  //
  // Exporta TODAS as linhas da tabela (todas as páginas), já com
  // os filtros aplicados — os dados da tabela vêm da API com os
  // mesmos filtros de data/estação da barra de filtros, então o
  // arquivo sempre bate com o que está na tela.
  // ============================================================

  const exportColumns: ExportColumn[] = [
    { header: "Período", type: "date", width: 12 },
    { header: "Station ID", type: "int", width: 12 },
    { header: "Station Code", type: "text", width: 16 },
    { header: "Station Name", type: "text", width: 30 },
    { header: "ATs no piso", type: "int", width: 13 },
    { header: "ATs delivering", type: "int", width: 15 },
    { header: "% Ocupação", type: "percent", width: 13 },
    { header: "Confirmação D-1", type: "int", width: 16 },
    { header: "% Rejeite Ativo", type: "percent", width: 16 },
    { header: "Rejeite Ativo (abs.)", type: "int", width: 19 },
    { header: "SPR Delivering", type: "decimal", width: 15 },
    { header: "SPR Route", type: "decimal", width: 12 },
    { header: "GAP_SPR", type: "decimal", width: 11 },
  ];

  const buildExportRows = (): ExportCell[][] =>
    atNoPisoByStationData.map((row) => {
      const key = `${row.period}|${row.station_code}`;

      const driversRow = driversByStationMap.get(key);
      const sprRow = sprByStationMap.get(key);

      return [
        row.period,
        row.station_id,
        row.station_code,
        row.station_name,
        row.at_no_piso,
        row.qty_at_delivering,
        driversRow?.percent_ocupacao,
        driversRow?.drivers_confirmados,
        driversRow?.percent_rejeite_ativo,
        driversRow?.rejeite_ativo_absoluto,
        sprRow?.spr_delivering,
        sprRow?.spr_route,
        sprRow?.gap,
      ];
    });

  // ex.: detalhamento_bau_diario_2026-08-27_a_2026-09-25
  const buildExportFileName = () => {
    const granularityLabel = {
      daily: "diario",
      weekly: "semanal",
      monthly: "mensal",
    }[granularity];

    const parts = ["detalhamento_bau", granularityLabel];

    if (startDate || endDate) {
      parts.push(
        `${startDate || "inicio"}_a_${endDate || "hoje"}`
      );
    }

    if (stationCode) {
      parts.push(stationCode);
    }

    return parts.join("_").replace(/[^\w.-]+/g, "-");
  };

  const handleDownloadCsv = () => {
    downloadCsv(
      `${buildExportFileName()}.csv`,
      exportColumns,
      buildExportRows()
    );
  };

  const handleDownloadXlsx = () => {
    downloadXlsx(
      `${buildExportFileName()}.xlsx`,
      exportColumns,
      buildExportRows(),
      "Detalhamento"
    );
  };

  // ============================================================
  // PAGINAÇÃO DA TABELA "DETALHAMENTO"
  // (a tabela é uma linha por estação por período, então sem
  // paginação ela podia chegar a dezenas de milhares de <tr>
  // de uma vez, o que travava a aba/o Chrome)
  // ============================================================

  const [tablePage, setTablePage] = useState(0);

  const tableTotalPages = Math.max(
    1,
    Math.ceil(
      atNoPisoByStationData.length /
        TABLE_PAGE_SIZE
    )
  );

  // sempre que o conjunto de linhas mudar (filtro,
  // granularidade, etc.), volta pra primeira página, senão
  // dá pra "encalhar" numa página vazia
  useEffect(() => {
    setTablePage(0);
  }, [atNoPisoByStationData]);

  const pagedStationData = useMemo(() => {
    const start = tablePage * TABLE_PAGE_SIZE;

    return atNoPisoByStationData.slice(
      start,
      start + TABLE_PAGE_SIZE
    );
  }, [atNoPisoByStationData, tablePage]);

  const formatPeriodLabel = (period: string) =>
    granularity === "monthly"
      ? period
      : formatDate(period);

  const formatPercent = (value: number) =>
    `${value.toLocaleString("pt-BR", {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    })}%`;

  const formatK = (value: number) =>
    Math.abs(value) >= 1000
      ? `${(value / 1000).toLocaleString(
          "pt-BR",
          {
            minimumFractionDigits: 1,
            maximumFractionDigits: 1,
          }
        )}k`
      : value.toLocaleString("pt-BR");

  // GAP_SPR sempre com sinal (+ ou -), pra direção ficar clara
  // sem precisar de cor na tabela
  const formatGap = (value: number) => {
    const formatted = Math.abs(
      value
    ).toLocaleString("pt-BR");

    if (value > 0) {
      return `+${formatted}`;
    }

    if (value < 0) {
      return `-${formatted}`;
    }

    return formatted;
  };

  const occupancyChartData: BarChartDatum[] =
    useMemo(
      () =>
        driversChartData.map((item) => ({
          period: item.period,
          values: {
            percent_ocupacao:
              item.percent_ocupacao,
            drivers_confirmados:
              item.drivers_confirmados,
          },
        })),
      [driversChartData]
    );

  const rejectionChartData: BarChartDatum[] =
    useMemo(
      () =>
        driversChartData.map((item) => ({
          period: item.period,
          values: {
            percent_rejeite_ativo:
              item.percent_rejeite_ativo,
            rejeite_ativo_absoluto:
              item.rejeite_ativo_absoluto,
          },
        })),
      [driversChartData]
    );

  // ============================================================
  // SÉRIES DOS GRÁFICOS DE "ATs NO PISO" (lado a lado)
  // ============================================================

  const atNoPisoChartData: BarChartDatum[] = useMemo(
    () =>
      chartData.map((item) => ({
        period: item.period,
        values: {
          at_no_piso: item.at_no_piso,
        },
      })),
    [chartData]
  );

  const atDeliveringChartData: BarChartDatum[] = useMemo(
    () =>
      chartData.map((item) => ({
        period: item.period,
        values: {
          qty_at_delivering: item.qty_at_delivering,
        },
      })),
    [chartData]
  );

  const atNoPisoSeries = [
    {
      key: "at_no_piso",
      label: "ATs no piso",
      color: "#ff5c2a",
      formatValue: (value: number) =>
        value.toLocaleString("pt-BR"),
      formatAxis: formatK,
    },
  ];

  const atDeliveringSeries = [
    {
      key: "qty_at_delivering",
      label: "ATs (qty_at_delivering)",
      color: "#3987e5",
      formatValue: (value: number) =>
        value.toLocaleString("pt-BR"),
      formatAxis: formatK,
    },
  ];

  // ============================================================
  // SELEÇÃO DE KPI
  // ============================================================

  const toggleKpi = (
    kpiId: string
  ) => {
    setSelectedKpis(
      (current) => {
        if (
          current.includes(kpiId)
        ) {
          return current.filter(
            (id) =>
              id !== kpiId
          );
        }

        return [
          ...current,
          kpiId,
        ];
      }
    );
  };

  const toggleDriverChart = (
    chartId: string
  ) => {
    setSelectedDriverCharts(
      (current) => {
        if (
          current.includes(chartId)
        ) {
          return current.filter(
            (id) =>
              id !== chartId
          );
        }

        return [
          ...current,
          chartId,
        ];
      }
    );
  };

  const toggleSprChart = (
    chartId: string
  ) => {
    setSelectedSprCharts(
      (current) => {
        if (
          current.includes(chartId)
        ) {
          return current.filter(
            (id) =>
              id !== chartId
          );
        }

        return [
          ...current,
          chartId,
        ];
      }
    );
  };

  // ============================================================
  // FORMATAÇÃO DE DATA
  // ============================================================

  const formatDate = (
    date: string
  ) => {
    if (!date) {
      return "-";
    }

    const parts =
      date.split("-");

    if (
      parts.length !== 3
    ) {
      return date;
    }

    return `${parts[2]}/${parts[1]}`;
  };

  // ============================================================
  // SÉRIES DOS GRÁFICOS DE DRIVERS
  // ============================================================

  const formatAxisPercent = (value: number) =>
    `${Math.round(value)}%`;

  const occupancySeries =
    occupancyView === "percent"
      ? [
          {
            key: "percent_ocupacao",
            label: "% Ocupação",
            color: "#199e70",
            formatValue: formatPercent,
            formatAxis: formatAxisPercent,
          },
        ]
      : [
          {
            key: "drivers_confirmados",
            label: "Confirmação em D-1 (abs.)",
            color: "#199e70",
            formatValue: (value: number) =>
              value.toLocaleString("pt-BR"),
            formatAxis: formatK,
          },
        ];

  const rejectionSeries =
    rejectionView === "percent"
      ? [
          {
            key: "percent_rejeite_ativo",
            label: "% Rejeite Ativo",
            color: "#d95926",
            formatValue: formatPercent,
            formatAxis: formatAxisPercent,
          },
        ]
      : [
          {
            key: "rejeite_ativo_absoluto",
            label: "Rejeite Ativo (abs.)",
            color: "#d95926",
            formatValue: (value: number) =>
              value.toLocaleString("pt-BR"),
            formatAxis: formatK,
          },
        ];

  // botões "%" / "Abs." exibidos no cabeçalho de cada gráfico
  const renderViewToggle = (
    view: DriverChartView,
    setView: (view: DriverChartView) => void
  ) => (
    <div className="bau-chart-controls bau-chart-controls--header">
      <button
        className={
          view === "percent" ? "active" : ""
        }
        onClick={() => setView("percent")}
      >
        %
      </button>

      <button
        className={view === "abs" ? "active" : ""}
        onClick={() => setView("abs")}
      >
        Abs.
      </button>
    </div>
  );

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="bau-page">

      {/* ======================================================
          SIDEBAR
      ====================================================== */}

      <Sidebar />

      <div className="bau-content">

        {/* ====================================================
            TOPBAR
        ==================================================== */}

        <Topbar
          userName={user.name}
          userEmail={user.email}
        />

        <main className="bau-main">

          {/* ==================================================
              HEADER
          ================================================== */}

          <section className="bau-header">

            <div className="bau-title-wrapper">

              <div className="bau-title-icon">
                <BarChart3
                  size={26}
                />
              </div>

              <div>

                <h1>
                  BAU
                </h1>

                <p>
                  Business as Usual —
                  visão operacional dos
                  principais indicadores.
                </p>

              </div>

            </div>

          </section>

          {/* ==================================================
              FILTROS
          ================================================== */}

          <section className="bau-filters">

            <div className="bau-section-title">

              <Filter
                size={18}
              />

              <span>
                Filtros
              </span>

            </div>

            <div className="bau-filter-grid">

              {/* STATION CODE */}

              <div className="bau-filter">

                <label>
                  Station Code
                </label>

                <input
                  type="text"
                  list="station-code-options"
                  value={
                    stationCode
                  }
                  onChange={(
                    event
                  ) =>
                    setStationCode(
                      event.target
                        .value
                    )
                  }
                  placeholder="Ex.: HUB-LSP-93"
                  autoComplete="off"
                />

                <datalist id="station-code-options">
                  {stationCodeOptions.map(
                    (code) => (
                      <option
                        key={code}
                        value={code}
                      />
                    )
                  )}
                </datalist>

              </div>

              {/* STATION ID */}

              <div className="bau-filter">

                <label>
                  Station ID
                </label>

                <input
                  type="text"
                  list="station-id-options"
                  value={
                    stationId
                  }
                  onChange={(
                    event
                  ) =>
                    setStationId(
                      event.target
                        .value
                    )
                  }
                  placeholder="Ex.: 11783"
                  autoComplete="off"
                />

                <datalist id="station-id-options">
                  {stationIdOptions.map(
                    (id) => (
                      <option
                        key={id}
                        value={id}
                      />
                    )
                  )}
                </datalist>

              </div>

              {/* STATION NAME */}

              <div className="bau-filter">

                <label>
                  Station Name
                </label>

                <input
                  type="text"
                  list="station-name-options"
                  value={
                    stationName
                  }
                  onChange={(
                    event
                  ) =>
                    setStationName(
                      event.target
                        .value
                    )
                  }
                  placeholder="Ex.: Santo André"
                  autoComplete="off"
                />

                <datalist id="station-name-options">
                  {stationNameOptions.map(
                    (name) => (
                      <option
                        key={name}
                        value={name}
                      />
                    )
                  )}
                </datalist>

              </div>

              {/* PERÍODO (GRANULARIDADE) */}

              <div className="bau-filter">

                <label>
                  Período
                </label>

                <div className="bau-chart-controls">

                  <button
                    className={
                      granularity ===
                      "daily"
                        ? "active"
                        : ""
                    }
                    onClick={() =>
                      setGranularity(
                        "daily"
                      )
                    }
                  >
                    Diário
                  </button>

                  <button
                    className={
                      granularity ===
                      "weekly"
                        ? "active"
                        : ""
                    }
                    onClick={() =>
                      setGranularity(
                        "weekly"
                      )
                    }
                  >
                    Semanal
                  </button>

                  <button
                    className={
                      granularity ===
                      "monthly"
                        ? "active"
                        : ""
                    }
                    onClick={() =>
                      setGranularity(
                        "monthly"
                      )
                    }
                  >
                    Mensal
                  </button>

                </div>

              </div>

              {/* DATA INICIAL */}

              <div className="bau-filter">

                <label>
                  Data inicial
                </label>

                <input
                  key={`start-date-${filterResetKey}`}
                  type="date"
                  value={
                    startDate
                  }
                  onChange={(
                    event
                  ) =>
                    setStartDate(
                      event.target
                        .value
                    )
                  }
                />

              </div>

              {/* DATA FINAL */}

              <div className="bau-filter">

                <label>
                  Data final
                </label>

                <input
                  key={`end-date-${filterResetKey}`}
                  type="date"
                  value={
                    endDate
                  }
                  onChange={(
                    event
                  ) =>
                    setEndDate(
                      event.target
                        .value
                    )
                  }
                />

              </div>

              {/* RESET */}

              <button
                className="bau-reset-button"
                onClick={
                  resetFilters
                }
              >

                <RotateCcw
                  size={16}
                />

                Limpar filtros

              </button>

            </div>

          </section>

          {/* ==================================================
              GRID PRINCIPAL
          ================================================== */}

          <section className="bau-dashboard-grid">

            {/* =================================================
                PAINEL LATERAL DE KPIs
            ================================================= */}

            <aside className="bau-kpi-panel">

              <div className="bau-section-title">

                <TrendingUp
                  size={18}
                />

                <span>
                  KPIs
                </span>

              </div>

              <p className="bau-kpi-help">
                Selecione um ou mais
                indicadores.
              </p>

              <div className="bau-kpi-list">

                {bauKpis.map(
                  (kpi) => {

                    const isSelected =
                      selectedKpis.includes(
                        kpi.id
                      );

                    return (
                      <button
                        key={
                          kpi.id
                        }
                        className={`bau-kpi-item ${
                          isSelected
                            ? "selected"
                            : ""
                        }`}
                        onClick={() =>
                          toggleKpi(
                            kpi.id
                          )
                        }
                      >

                        <div className="bau-kpi-item-name">
                          {
                            kpi.name
                          }
                        </div>

                        <div className="bau-kpi-item-description">
                          {
                            kpi.description
                          }
                        </div>

                      </button>
                    );

                  }
                )}

              </div>

              <p className="bau-kpi-help bau-kpi-subheading">
                Gráfico de SPR
              </p>

              <div className="bau-kpi-list">

                {sprChartOptions.map(
                  (option) => {

                    const isSelected =
                      selectedSprCharts.includes(
                        option.id
                      );

                    return (
                      <button
                        key={
                          option.id
                        }
                        className={`bau-kpi-item ${
                          isSelected
                            ? "selected"
                            : ""
                        }`}
                        onClick={() =>
                          toggleSprChart(
                            option.id
                          )
                        }
                      >

                        <div className="bau-kpi-item-name">
                          {
                            option.name
                          }
                        </div>

                        <div className="bau-kpi-item-description">
                          {
                            option.description
                          }
                        </div>

                      </button>
                    );

                  }
                )}

              </div>

              <p className="bau-kpi-help bau-kpi-subheading">
                Gráficos de drivers
              </p>

              <div className="bau-kpi-list">

                {driverChartOptions.map(
                  (option) => {

                    const isSelected =
                      selectedDriverCharts.includes(
                        option.id
                      );

                    return (
                      <button
                        key={
                          option.id
                        }
                        className={`bau-kpi-item ${
                          isSelected
                            ? "selected"
                            : ""
                        }`}
                        onClick={() =>
                          toggleDriverChart(
                            option.id
                          )
                        }
                      >

                        <div className="bau-kpi-item-name">
                          {
                            option.name
                          }
                        </div>

                        <div className="bau-kpi-item-description">
                          {
                            option.description
                          }
                        </div>

                      </button>
                    );

                  }
                )}

              </div>

            </aside>

            {/* =================================================
                RESULTADOS
            ================================================= */}

            <div className="bau-results">

              {/* =================================================
                  LOADING
              ================================================= */}

              {loading && (

                <section className="bau-chart-card">

                  <div className="bau-chart-placeholder">

                    <strong>
                      Carregando dados...
                    </strong>

                    <span>
                      Buscando informações
                      do KPI.
                    </span>

                  </div>

                </section>

              )}

              {/* =================================================
                  ERRO
              ================================================= */}

              {!loading &&
                error && (

                  <section className="bau-chart-card">

                    <div className="bau-chart-placeholder">

                      <strong>
                        Erro ao carregar
                        dados
                      </strong>

                      <span>
                        {error}
                      </span>

                    </div>

                  </section>

                )}

              {/* =================================================
                  DADOS
              ================================================= */}

              {!loading &&
                !error &&
                apiData && (

                  <>

                    {/* =========================================
                        SUMMARY
                    ========================================= */}

                    <div className="bau-summary-grid">

                      {selectedKpis.map(
                        (kpiId) => {

                          const kpi =
                            bauKpis.find(
                              (
                                item
                              ) =>
                                item.id ===
                                kpiId
                            );

                          if (!kpi) {
                            return null;
                          }

                          let value =
                            0;

                          if (
                            kpi.dataKey ===
                            "at_no_piso"
                          ) {
                            value =
                              apiData
                                .summary
                                .at_no_piso;
                          } else if (
                            kpi.dataKey ===
                            "percent_at_no_piso"
                          ) {
                            value =
                              apiData
                                .summary
                                .percent_at_no_piso;
                          }

                          const formattedValue =
                            kpi.dataKey ===
                            "percent_at_no_piso"
                              ? value.toLocaleString(
                                  "pt-BR",
                                  {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  }
                                )
                              : value.toLocaleString(
                                  "pt-BR"
                                );

                          return (
                            <div
                              className="bau-summary-card"
                              key={
                                kpi.id
                              }
                            >

                              <div className="bau-summary-label">
                                {
                                  kpi.name
                                }
                              </div>

                              <div className="bau-summary-value">
                                {
                                  formattedValue
                                }
                              </div>

                              <div className="bau-summary-unit">
                                {
                                  kpi.unit
                                }
                              </div>

                            </div>
                          );

                        }
                      )}

                    </div>

                    {/* =========================================
                        GRÁFICOS — ATs NO PISO E
                        ATs (QTY_AT_DELIVERING)
                    ========================================= */}

                    {selectedKpis.length ===
                      0 && (
                      <section className="bau-chart-card">
                        <div className="bau-chart-placeholder">
                          <strong>
                            Nenhum indicador
                            selecionado
                          </strong>
                          <span>
                            Selecione "ATs no
                            piso" ou "% ATs no
                            piso" no painel de
                            KPIs.
                          </span>
                        </div>
                      </section>
                    )}

                    {selectedKpis.length >
                      0 && (
                      <div className="bau-chart-row">

                        <DriversBarChart
                          title="ATs no piso"
                          description="Quantidade de ATs no piso ao longo do período selecionado."
                          icon={
                            <TrendingUp size={20} />
                          }
                          data={atNoPisoChartData}
                          series={atNoPisoSeries}
                          formatPeriodLabel={
                            formatPeriodLabel
                          }
                          showValueLabels
                        />

                        <DriversBarChart
                          title="ATs (qty_at_delivering)"
                          description="Quantidade total de ATs delivering ao longo do período selecionado."
                          icon={
                            <TrendingUp size={20} />
                          }
                          data={atDeliveringChartData}
                          series={atDeliveringSeries}
                          formatPeriodLabel={
                            formatPeriodLabel
                          }
                          showValueLabels
                        />

                      </div>
                    )}

                    {/* =========================================
                        SPR — DELIVERING X ROUTE (GAP)
                    ========================================= */}

                    {sprLoading && (
                      <section className="bau-chart-card">
                        <div className="bau-chart-placeholder">
                          <strong>
                            Carregando dados...
                          </strong>
                          <span>
                            Buscando informações
                            de SPR.
                          </span>
                        </div>
                      </section>
                    )}

                    {!sprLoading &&
                      sprError && (
                        <section className="bau-chart-card">
                          <div className="bau-chart-placeholder">
                            <strong>
                              Erro ao carregar
                              dados
                            </strong>
                            <span>
                              {sprError}
                            </span>
                          </div>
                        </section>
                      )}

                    {!sprLoading &&
                      !sprError &&
                      !selectedSprCharts.includes(
                        "spr_gap"
                      ) && (
                        <section className="bau-chart-card">
                          <div className="bau-chart-placeholder">
                            <strong>
                              Nenhum gráfico
                              selecionado
                            </strong>
                            <span>
                              Selecione "SPR
                              Delivering x Route"
                              no painel de KPIs.
                            </span>
                          </div>
                        </section>
                      )}

                    {!sprLoading &&
                      !sprError &&
                      selectedSprCharts.includes(
                        "spr_gap"
                      ) && (
                        <SprGapChart
                          title="SPR Delivering x Route"
                          description="SPR Delivering x SPR Route por período (em cima) e o GAP (Delivering − Route) com escala própria (embaixo)."
                          icon={
                            <BarChart3
                              size={20}
                            />
                          }
                          data={
                            sprChartData as SprChartDatum[]
                          }
                          formatPeriodLabel={
                            formatPeriodLabel
                          }
                        />
                      )}

                    {/* =========================================
                        DRIVERS — OCUPAÇÃO E REJEITE ATIVO
                    ========================================= */}

                    {driversLoading && (
                      <section className="bau-chart-card">
                        <div className="bau-chart-placeholder">
                          <strong>
                            Carregando dados...
                          </strong>
                          <span>
                            Buscando informações
                            de drivers.
                          </span>
                        </div>
                      </section>
                    )}

                    {!driversLoading &&
                      driversError && (
                        <section className="bau-chart-card">
                          <div className="bau-chart-placeholder">
                            <strong>
                              Erro ao carregar
                              dados
                            </strong>
                            <span>
                              {driversError}
                            </span>
                          </div>
                        </section>
                      )}

                    {!driversLoading &&
                      !driversError &&
                      selectedDriverCharts.length ===
                        0 && (
                        <section className="bau-chart-card">
                          <div className="bau-chart-placeholder">
                            <strong>
                              Nenhum gráfico
                              selecionado
                            </strong>
                            <span>
                              Selecione "Ocupação"
                              ou "Rejeite Ativo"
                              no painel de KPIs.
                            </span>
                          </div>
                        </section>
                      )}

                    {!driversLoading &&
                      !driversError &&
                      selectedDriverCharts.includes(
                        "occupancy"
                      ) && (
                        <DriversBarChart
                          title={
                            occupancyView === "percent"
                              ? "Ocupação (%)"
                              : "Ocupação (abs.)"
                          }
                          description={
                            occupancyView === "percent"
                              ? "% de ocupação (drivers ativos / confirmados + não confirmados)."
                              : "Drivers confirmados no D-1."
                          }
                          headerActions={renderViewToggle(
                            occupancyView,
                            setOccupancyView
                          )}
                          showValueLabels
                          icon={
                            <Percent
                              size={20}
                            />
                          }
                          data={
                            occupancyChartData
                          }
                          series={
                            occupancySeries
                          }
                          formatPeriodLabel={
                            formatPeriodLabel
                          }
                        />
                      )}

                    {!driversLoading &&
                      !driversError &&
                      selectedDriverCharts.includes(
                        "rejection"
                      ) && (
                        <DriversBarChart
                          title={
                            rejectionView === "percent"
                              ? "Rejeite Ativo (%)"
                              : "Rejeite Ativo (abs.)"
                          }
                          description={
                            rejectionView === "percent"
                              ? "% de rejeite ativo (rejeites, exceto timeout, / call ups declinados)."
                              : "Volume absoluto de rejeite ativo (call ups declinados - timeout)."
                          }
                          headerActions={renderViewToggle(
                            rejectionView,
                            setRejectionView
                          )}
                          showValueLabels
                          icon={
                            <Users
                              size={20}
                            />
                          }
                          data={
                            rejectionChartData
                          }
                          series={
                            rejectionSeries
                          }
                          formatPeriodLabel={
                            formatPeriodLabel
                          }
                        />
                      )}

                    {/* =========================================
                        TABELA
                    ========================================= */}

                    <section className="bau-table-card">

                      <div className="bau-card-header">

                        <div>

                          <h2>
                            Detalhamento
                          </h2>

                          <p>
                            Dados agregados
                            utilizados no
                            indicador.
                          </p>

                        </div>

                        <div className="bau-table-header-actions">

                          <div className="bau-table-count">

                            {
                              atNoPisoByStationData.length
                            }{" "}
                            linhas · página{" "}
                            {tablePage + 1} de{" "}
                            {tableTotalPages}

                          </div>

                          {/* DOWNLOAD (todas as linhas
                              filtradas, não só a página) */}

                          <button
                            type="button"
                            className="bau-download-button"
                            onClick={handleDownloadXlsx}
                            disabled={
                              atNoPisoByStationData.length ===
                              0
                            }
                            title="Baixar todas as linhas filtradas em Excel (.xlsx)"
                          >
                            <Download size={14} />
                            XLSX
                          </button>

                          <button
                            type="button"
                            className="bau-download-button"
                            onClick={handleDownloadCsv}
                            disabled={
                              atNoPisoByStationData.length ===
                              0
                            }
                            title="Baixar todas as linhas filtradas em CSV"
                          >
                            <Download size={14} />
                            CSV
                          </button>

                        </div>

                      </div>

                      <div className="bau-table-wrapper">

                        <table className="bau-table">

                          <thead>

                            <tr>

                              <th>
                                Período
                              </th>

                              <th>
                                Station ID
                              </th>

                              <th>
                                Station Code
                              </th>

                              <th>
                                Station Name
                              </th>

                              <th>
                                ATs no piso
                              </th>

                              <th>
                                ATs delivering
                              </th>

                              <th>
                                % Ocupação
                              </th>

                              <th>
                                Confirmação D-1
                              </th>

                              <th>
                                % Rejeite Ativo
                              </th>

                              <th>
                                Rejeite Ativo (abs.)
                              </th>

                              <th>
                                SPR Delivering
                              </th>

                              <th>
                                SPR Route
                              </th>

                              <th>
                                GAP_SPR
                              </th>

                            </tr>

                          </thead>

                          <tbody>

                            {pagedStationData.map(
                              (
                                row,
                                index
                              ) => {

                                const driversRow =
                                  driversByStationMap.get(
                                    `${row.period}|${row.station_code}`
                                  );

                                const sprRow =
                                  sprByStationMap.get(
                                    `${row.period}|${row.station_code}`
                                  );

                                return (

                                <tr
                                  key={`${row.period}-${row.station_code}-${index}`}
                                >

                                  <td>
                                    {
                                      granularity ===
                                      "monthly"
                                        ? row.period
                                        : formatDate(
                                            row.period
                                          )
                                    }
                                  </td>

                                  <td>
                                    {row.station_id}
                                  </td>

                                  <td>
                                    {row.station_code}
                                  </td>

                                  <td>
                                    {row.station_name}
                                  </td>

                                  <td>
                                    {row.at_no_piso.toLocaleString(
                                      "pt-BR"
                                    )}
                                  </td>

                                  <td>
                                    {row.qty_at_delivering.toLocaleString(
                                      "pt-BR"
                                    )}
                                  </td>

                                  <td>
                                    {driversRow
                                      ? formatPercent(
                                          driversRow.percent_ocupacao
                                        )
                                      : "-"}
                                  </td>

                                  <td>
                                    {driversRow
                                      ? driversRow.drivers_confirmados.toLocaleString(
                                          "pt-BR"
                                        )
                                      : "-"}
                                  </td>

                                  <td>
                                    {driversRow
                                      ? formatPercent(
                                          driversRow.percent_rejeite_ativo
                                        )
                                      : "-"}
                                  </td>

                                  <td>
                                    {driversRow
                                      ? driversRow.rejeite_ativo_absoluto.toLocaleString(
                                          "pt-BR"
                                        )
                                      : "-"}
                                  </td>

                                  <td>
                                    {sprRow
                                      ? sprRow.spr_delivering.toLocaleString(
                                          "pt-BR"
                                        )
                                      : "-"}
                                  </td>

                                  <td>
                                    {sprRow
                                      ? sprRow.spr_route.toLocaleString(
                                          "pt-BR"
                                        )
                                      : "-"}
                                  </td>

                                  <td>
                                    {sprRow
                                      ? formatGap(
                                          sprRow.gap
                                        )
                                      : "-"}
                                  </td>

                                </tr>

                                );

                              }
                            )}

                          </tbody>

                        </table>

                      </div>

                      {/* =========================================
                          PAGINAÇÃO
                      ========================================= */}

                      {tableTotalPages > 1 && (

                        <div className="bau-table-pagination">

                          <button
                            type="button"
                            disabled={
                              tablePage === 0
                            }
                            onClick={() =>
                              setTablePage(
                                (page) =>
                                  Math.max(
                                    0,
                                    page - 1
                                  )
                              )
                            }
                          >
                            <ChevronLeft
                              size={16}
                            />
                            Anterior
                          </button>

                          <span>
                            Página{" "}
                            {tablePage + 1}{" "}
                            de{" "}
                            {tableTotalPages}
                          </span>

                          <button
                            type="button"
                            disabled={
                              tablePage >=
                              tableTotalPages -
                                1
                            }
                            onClick={() =>
                              setTablePage(
                                (page) =>
                                  Math.min(
                                    tableTotalPages -
                                      1,
                                    page + 1
                                  )
                              )
                            }
                          >
                            Próxima
                            <ChevronRight
                              size={16}
                            />
                          </button>

                        </div>

                      )}

                    </section>

                  </>

                )}

            </div>

          </section>

        </main>

      </div>

    </div>
  );
}

export default BAU;