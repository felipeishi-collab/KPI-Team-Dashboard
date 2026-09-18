import { useEffect, useMemo, useState } from "react";

import {
  BarChart3,
  Filter,
  RotateCcw,
  TrendingUp,
} from "lucide-react";

import Sidebar from "../../components/layout/Sidebar";
import Topbar from "../../components/layout/Topbar";

import { bauKpis } from "./bauKpis";

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
  // RESET DOS FILTROS
  // ============================================================

  const resetFilters = () => {
    setStationCode("");
    setStationId("");
    setStationName("");
    setStartDate("");
    setEndDate("");
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

    const width = 1000;
    const height = 400;

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

              {/* DATA INICIAL */}

              <div className="bau-filter">

                <label>
                  Data inicial
                </label>

                <input
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
                          CONTROLES
                      ======================================= */}

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

                        <div className="bau-line-chart">

                          <svg
                            viewBox="0 0 1000 400"
                            className="bau-line-chart-svg"
                            preserveAspectRatio="none"
                          >

                            {/* =================================
                                GRID
                            ================================= */}

                            <line
                              x1="70"
                              y1="40"
                              x2="970"
                              y2="40"
                              className="chart-grid-line"
                            />

                            <line
                              x1="70"
                              y1="117.5"
                              x2="970"
                              y2="117.5"
                              className="chart-grid-line"
                            />

                            <line
                              x1="70"
                              y1="195"
                              x2="970"
                              y2="195"
                              className="chart-grid-line"
                            />

                            <line
                              x1="70"
                              y1="272.5"
                              x2="970"
                              y2="272.5"
                              className="chart-grid-line"
                            />

                            <line
                              x1="70"
                              y1="350"
                              x2="970"
                              y2="350"
                              className="chart-axis-line"
                            />

                            {/* =================================
                                EIXO Y
                            ================================= */}

                            <text
                              x="58"
                              y="355"
                              textAnchor="end"
                              className="chart-axis-label"
                            >
                              0
                            </text>

                            <text
                              x="58"
                              y="277"
                              textAnchor="end"
                              className="chart-axis-label"
                            >
                              {Math.round(
                                chartMaxValue *
                                  0.25
                              ).toLocaleString(
                                "pt-BR"
                              )}
                            </text>

                            <text
                              x="58"
                              y="200"
                              textAnchor="end"
                              className="chart-axis-label"
                            >
                              {Math.round(
                                chartMaxValue *
                                  0.5
                              ).toLocaleString(
                                "pt-BR"
                              )}
                            </text>

                            <text
                              x="58"
                              y="122"
                              textAnchor="end"
                              className="chart-axis-label"
                            >
                              {Math.round(
                                chartMaxValue *
                                  0.75
                              ).toLocaleString(
                                "pt-BR"
                              )}
                            </text>

                            <text
                              x="58"
                              y="45"
                              textAnchor="end"
                              className="chart-axis-label"
                            >
                              {chartMaxValue.toLocaleString(
                                "pt-BR"
                              )}
                            </text>

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
                                  1000;

                                const height =
                                  400;

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
                                  1000;

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
                            chartData.length
                          }{" "}
                          períodos

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
                                ATs no piso
                              </th>

                              <th>
                                ATs delivering
                              </th>

                            </tr>

                          </thead>

                          <tbody>

                            {chartData.map(
                              (
                                row,
                                index
                              ) => (

                                <tr
                                  key={`${row.period}-${index}`}
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
                                    {row.at_no_piso.toLocaleString(
                                      "pt-BR"
                                    )}
                                  </td>

                                  <td>
                                    {row.qty_at_delivering.toLocaleString(
                                      "pt-BR"
                                    )}
                                  </td>

                                </tr>

                              )
                            )}

                          </tbody>

                        </table>

                      </div>

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