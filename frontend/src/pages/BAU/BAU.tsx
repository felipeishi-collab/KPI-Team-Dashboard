import { useEffect, useMemo, useState } from "react";

import {
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Filter,
  Percent,
  RotateCcw,
  TrendingUp,
  Users,
} from "lucide-react";

import Sidebar from "../../components/layout/Sidebar";
import Topbar from "../../components/layout/Topbar";

import { useContainerWidth } from "../../hooks/useContainerWidth";

import { bauKpis } from "./bauKpis";

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
    name: "Ocupação e Rejeite Ativo (%)",
    description:
      "% de ocupação e % de rejeite ativo por período.",
  },
  {
    id: "confirmation",
    name: "Confirmação D-1 e Rejeite (abs.)",
    description:
      "Drivers confirmados no D-1 e volume absoluto de rejeite ativo.",
  },
];

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

  const [startDate, setStartDate] =
    useState("");

  const [endDate, setEndDate] =
    useState("");

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
    "confirmation",
  ]);

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
  // TAMANHO REAL DO GRÁFICO DE LINHA
  // (o viewBox do SVG precisa bater com o tamanho renderizado
  // de verdade, senão os textos dos eixos ficam esticados —
  // ver useContainerWidth)
  // ============================================================

  const [
    lineChartContainerRef,
    lineChartWidth,
    lineChartHeight,
  ] = useContainerWidth<HTMLDivElement>(
    1000,
    400
  );

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
  // HOVER DO GRÁFICO
  // ============================================================

  const [hoveredPoint, setHoveredPoint] =
    useState<{
      index: number;
      x: number;
      y: number;
    } | null>(null);

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
    setStartDate("");
    setEndDate("");

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
            percent_rejeite_ativo:
              item.percent_rejeite_ativo,
          },
        })),
      [driversChartData]
    );

  const countChartData: BarChartDatum[] =
    useMemo(
      () =>
        driversChartData.map((item) => ({
          period: item.period,
          values: {
            drivers_confirmados:
              item.drivers_confirmados,
            rejeite_ativo_absoluto:
              item.rejeite_ativo_absoluto,
          },
        })),
      [driversChartData]
    );

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
  // VALOR MÁXIMO DO GRÁFICO
  // ============================================================

  const maxValue = useMemo(() => {
    if (!chartData.length) {
      return 0;
    }

    return Math.max(
      ...chartData.map(
        (item) =>
          item.at_no_piso
      )
    );
  }, [chartData]);

  // ============================================================
  // ESCALA DO EIXO Y
  // ============================================================

  const chartMaxValue =
    useMemo(() => {
      if (maxValue <= 0) {
        return 100;
      }

      const magnitude =
        Math.pow(
          10,
          Math.floor(
            Math.log10(maxValue)
          )
        );

      const normalized =
        maxValue / magnitude;

      let multiplier = 1;

      if (
        normalized <= 1
      ) {
        multiplier = 1;
      } else if (
        normalized <= 2
      ) {
        multiplier = 2;
      } else if (
        normalized <= 5
      ) {
        multiplier = 5;
      } else {
        multiplier = 10;
      }

      return (
        multiplier *
        magnitude
      );
    }, [maxValue]);

  // ============================================================
  // PONTOS DO GRÁFICO
  // ============================================================

  const chartPoints = useMemo(() => {
    if (
      !chartData.length ||
      chartMaxValue <= 0
    ) {
      return "";
    }

    const width = lineChartWidth;
    const height = lineChartHeight;

    const paddingLeft = 70;
    const paddingRight = 30;
    const paddingTop = 40;
    const paddingBottom = 50;

    const chartWidth =
      width -
      paddingLeft -
      paddingRight;

    const chartHeight =
      height -
      paddingTop -
      paddingBottom;

    return chartData
      .map(
        (
          item,
          index
        ) => {
          const x =
            chartData.length ===
            1
              ? width / 2
              : paddingLeft +
                (index /
                  (chartData.length -
                    1)) *
                  chartWidth;

          const y =
            paddingTop +
            chartHeight -
            (item.at_no_piso /
              chartMaxValue) *
              chartHeight;

          return `${x},${y}`;
        }
      )
      .join(" ");
  }, [
    chartData,
    chartMaxValue,
    lineChartWidth,
    lineChartHeight,
  ]);

  // ============================================================
  // INTERVALO DAS LABELS DO EIXO X
  // ============================================================

  const xLabelInterval =
    Math.max(
      1,
      Math.ceil(
        chartData.length / 7
      )
    );

  // ============================================================
  // DADOS DO TOOLTIP (VALOR + PERCENTUAL DO PONTO)
  // ============================================================

  const hoveredTooltip = useMemo(() => {
    if (!hoveredPoint) {
      return null;
    }

    const item =
      chartData[hoveredPoint.index];

    if (!item) {
      return null;
    }

    const percent =
      item.qty_at_delivering > 0
        ? (item.at_no_piso /
            item.qty_at_delivering) *
          100
        : 0;

    return {
      item,
      percent,
    };
  }, [
    hoveredPoint,
    chartData,
  ]);

  // ============================================================
  // SÉRIES DOS GRÁFICOS DE DRIVERS
  // ============================================================

  const formatAxisPercent = (value: number) =>
    `${Math.round(value)}%`;

  const occupancySeries = [
    {
      key: "percent_ocupacao",
      label: "% Ocupação",
      color: "#199e70",
      formatValue: formatPercent,
      formatAxis: formatAxisPercent,
    },
    {
      key: "percent_rejeite_ativo",
      label: "% Rejeite Ativo",
      color: "#d95926",
      formatValue: formatPercent,
      formatAxis: formatAxisPercent,
    },
  ];

  const countSeries = [
    {
      key: "drivers_confirmados",
      label: "Confirmação em D-1",
      color: "#3987e5",
      formatValue: (value: number) =>
        value.toLocaleString("pt-BR"),
      formatAxis: formatK,
    },
    {
      key: "rejeite_ativo_absoluto",
      label: "Rejeite Ativo (abs.)",
      color: "#d95926",
      formatValue: formatK,
      formatAxis: formatK,
    },
  ];

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
                    onClick={() => {
                      setGranularity(
                        "daily"
                      );
                      setHoveredPoint(
                        null
                      );
                    }}
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
                    onClick={() => {
                      setGranularity(
                        "weekly"
                      );
                      setHoveredPoint(
                        null
                      );
                    }}
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
                    onClick={() => {
                      setGranularity(
                        "monthly"
                      );
                      setHoveredPoint(
                        null
                      );
                    }}
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
                        GRÁFICO
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
                    <section className="bau-chart-card">

                      {/* =======================================
                          HEADER DO GRÁFICO
                      ======================================= */}

                      <div className="bau-card-header">

                        <div>

                          <h2>
                            ATs no piso —
                            Evolução
                          </h2>

                          <p>
                            Evolução do
                            indicador ao
                            longo do período
                            selecionado.
                          </p>

                        </div>

                        <div className="bau-chart-icon">

                          <TrendingUp
                            size={20}
                          />

                        </div>

                      </div>

                      {/* =======================================
                          GRÁFICO
                      ======================================= */}

                      {chartData.length ===
                      0 ? (

                        <div className="bau-chart-placeholder">

                          <strong>
                            Nenhum dado
                            encontrado
                          </strong>

                          <span>
                            Ajuste os filtros
                            selecionados.
                          </span>

                        </div>

                      ) : (

                        <div
                          className="bau-line-chart"
                          ref={
                            lineChartContainerRef
                          }
                        >

                          <svg
                            viewBox={`0 0 ${lineChartWidth} ${lineChartHeight}`}
                            className="bau-line-chart-svg"
                            preserveAspectRatio="none"
                          >

                            {/* =================================
                                GRID + EIXO Y
                                (posições calculadas a partir do
                                tamanho real do gráfico — não mais
                                fixas em "1000x400", senão a grade
                                e as labels não acompanham o
                                viewBox dinâmico)
                            ================================= */}

                            {[
                              0,
                              0.25,
                              0.5,
                              0.75,
                              1,
                            ].map((tick) => {
                              const chartHeight =
                                lineChartHeight -
                                40 -
                                50;

                              const y =
                                40 +
                                chartHeight *
                                  (1 - tick);

                              return (
                                <line
                                  key={`grid-${tick}`}
                                  x1={70}
                                  y1={y}
                                  x2={
                                    lineChartWidth -
                                    30
                                  }
                                  y2={y}
                                  className={
                                    tick === 0
                                      ? "chart-axis-line"
                                      : "chart-grid-line"
                                  }
                                />
                              );
                            })}

                            {[
                              0,
                              0.25,
                              0.5,
                              0.75,
                              1,
                            ].map((tick) => {
                              const chartHeight =
                                lineChartHeight -
                                40 -
                                50;

                              const y =
                                40 +
                                chartHeight *
                                  (1 - tick);

                              return (
                                <text
                                  key={`y-${tick}`}
                                  x={58}
                                  y={y + 4}
                                  textAnchor="end"
                                  className="chart-axis-label"
                                >
                                  {Math.round(
                                    chartMaxValue *
                                      tick
                                  ).toLocaleString(
                                    "pt-BR"
                                  )}
                                </text>
                              );
                            })}

                            {/* =================================
                                LINHA PRINCIPAL
                            ================================= */}

                            <polyline
                              points={
                                chartPoints
                              }
                              fill="none"
                              className="bau-chart-line"
                            />

                            {/* =================================
                                ÁREAS DE HOVER
                            ================================= */}

                            {chartData.map(
                              (
                                item,
                                index
                              ) => {

                                const width =
                                  lineChartWidth;

                                const height =
                                  lineChartHeight;

                                const paddingLeft =
                                  70;

                                const paddingRight =
                                  30;

                                const paddingTop =
                                  40;

                                const paddingBottom =
                                  50;

                                const chartWidth =
                                  width -
                                  paddingLeft -
                                  paddingRight;

                                const chartHeight =
                                  height -
                                  paddingTop -
                                  paddingBottom;

                                const x =
                                  chartData.length ===
                                  1
                                    ? width /
                                      2
                                    : paddingLeft +
                                      (index /
                                        (chartData.length -
                                          1)) *
                                        chartWidth;

                                const y =
                                  paddingTop +
                                  chartHeight -
                                  (item.at_no_piso /
                                    chartMaxValue) *
                                    chartHeight;

                                return (
                                  <circle
                                    key={`${item.period}-${index}`}
                                    cx={x}
                                    cy={y}
                                    r="9"
                                    className="chart-hover-area"
                                    onMouseEnter={() =>
                                      setHoveredPoint(
                                        {
                                          index,
                                          x,
                                          y,
                                        }
                                      )
                                    }
                                    onMouseLeave={() =>
                                      setHoveredPoint(
                                        null
                                      )
                                    }
                                  />
                                );

                              }
                            )}

                            {/* =================================
                                TOOLTIP
                            ================================= */}

                            {hoveredPoint &&
                              hoveredTooltip && (

                              <g
                                className="chart-tooltip"
                                pointerEvents="none"
                              >

                                {/* Linha vertical */}

                                <line
                                  x1={
                                    hoveredPoint.x
                                  }
                                  y1="40"
                                  x2={
                                    hoveredPoint.x
                                  }
                                  y2="350"
                                  className="chart-tooltip-line"
                                />

                                {/* Ponto destacado */}

                                <circle
                                  cx={
                                    hoveredPoint.x
                                  }
                                  cy={
                                    hoveredPoint.y
                                  }
                                  r="5"
                                  className="chart-tooltip-point"
                                />

                                {/* Caixa do tooltip */}

                                <rect
                                  x={Math.min(
                                    hoveredPoint.x +
                                      14,
                                    795
                                  )}
                                  y={Math.max(
                                    hoveredPoint.y -
                                      96,
                                    10
                                  )}
                                  width="185"
                                  height="96"
                                  rx="10"
                                  className="chart-tooltip-box"
                                />

                                {/* Data */}

                                <text
                                  x={Math.min(
                                    hoveredPoint.x +
                                      26,
                                    807
                                  )}
                                  y={Math.max(
                                    hoveredPoint.y -
                                      73,
                                    33
                                  )}
                                  className="chart-tooltip-date"
                                >
                                  {formatDate(
                                    hoveredTooltip
                                      .item
                                      .period
                                  )}
                                </text>

                                {/* Nome do KPI */}

                                <text
                                  x={Math.min(
                                    hoveredPoint.x +
                                      26,
                                    807
                                  )}
                                  y={Math.max(
                                    hoveredPoint.y -
                                      54,
                                    52
                                  )}
                                  className="chart-tooltip-name"
                                >
                                  ATs no piso
                                </text>

                                {/* Valor */}

                                <text
                                  x={Math.min(
                                    hoveredPoint.x +
                                      26,
                                    807
                                  )}
                                  y={Math.max(
                                    hoveredPoint.y -
                                      32,
                                    74
                                  )}
                                  className="chart-tooltip-value"
                                >
                                  {hoveredTooltip.item.at_no_piso.toLocaleString(
                                    "pt-BR"
                                  )}{" "}
                                  ATs
                                </text>

                                {/* Percentual */}

                                <text
                                  x={Math.min(
                                    hoveredPoint.x +
                                      26,
                                    807
                                  )}
                                  y={Math.max(
                                    hoveredPoint.y -
                                      10,
                                    96
                                  )}
                                  className="chart-tooltip-percent"
                                >
                                  {hoveredTooltip.percent.toLocaleString(
                                    "pt-BR",
                                    {
                                      minimumFractionDigits: 2,
                                      maximumFractionDigits: 2,
                                    }
                                  )}
                                  % no piso
                                </text>

                              </g>

                            )}

                            {/* =================================
                                EIXO X
                            ================================= */}

                            {chartData.map(
                              (
                                item,
                                index
                              ) => {

                                const isFirst =
                                  index ===
                                  0;

                                const isLast =
                                  index ===
                                  chartData.length -
                                    1;

                                const showLabel =
                                  chartData.length <=
                                    10 ||
                                  isFirst ||
                                  isLast ||
                                  index %
                                    xLabelInterval ===
                                    0;

                                if (
                                  !showLabel
                                ) {
                                  return null;
                                }

                                const width =
                                  lineChartWidth;

                                const paddingLeft =
                                  70;

                                const paddingRight =
                                  30;

                                const chartWidth =
                                  width -
                                  paddingLeft -
                                  paddingRight;

                                const x =
                                  chartData.length ===
                                  1
                                    ? width /
                                      2
                                    : paddingLeft +
                                      (index /
                                        (chartData.length -
                                          1)) *
                                        chartWidth;

                                const label =
                                  granularity ===
                                  "monthly"
                                    ? item.period
                                    : formatDate(
                                        item.period
                                      );

                                return (
                                  <text
                                    key={`x-${item.period}-${index}`}
                                    x={x}
                                    y="380"
                                    textAnchor="middle"
                                    className="chart-axis-label"
                                  >
                                    {
                                      label
                                    }
                                  </text>
                                );

                              }
                            )}

                          </svg>

                        </div>

                      )}

                    </section>
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
                          description="Comparação entre SPR Delivering e SPR Route por período, com o GAP (Delivering − Route) destacado."
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
                              Selecione "Ocupação
                              e Rejeite Ativo
                              (%)" ou
                              "Confirmação D-1 e
                              Rejeite (abs.)" no
                              painel de KPIs.
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
                          title="Ocupação e Rejeite Ativo (%)"
                          description="% de ocupação (drivers ativos / confirmados + não confirmados) e % de rejeite ativo (rejeites, exceto timeout, / call ups declinados)."
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
                        "confirmation"
                      ) && (
                        <DriversBarChart
                          title="Confirmação D-1 e Rejeite Ativo (absoluto)"
                          description="Drivers confirmados no D-1 e volume absoluto de rejeite ativo (call ups declinados - timeout)."
                          icon={
                            <Users
                              size={20}
                            />
                          }
                          data={
                            countChartData
                          }
                          series={
                            countSeries
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

                        <div className="bau-table-count">

                          {
                            atNoPisoByStationData.length
                          }{" "}
                          linhas · página{" "}
                          {tablePage + 1} de{" "}
                          {tableTotalPages}

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