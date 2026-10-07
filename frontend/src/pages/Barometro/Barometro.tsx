import {
  Fragment,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  Download,
  Filter,
  FilterX,
  Gauge,
  Search,
} from "lucide-react";

import Sidebar from "../../components/layout/Sidebar";
import Topbar from "../../components/layout/Topbar";

import { authFetch, getCurrentUser } from "../../utils/session";
import { useScrollToEnd } from "../../hooks/useScrollToEnd";
import {
  downloadCsv,
  downloadXlsx,
} from "../../utils/exportTable";
import type {
  ExportCell,
  ExportColumn,
} from "../../utils/exportTable";

import "../BAU/BAU.css";
import "../BAU/SummaryCards.css";
import "./Barometro.css";

// ============================================================
// TIPOS (espelham a resposta de /api/barometro)
// ============================================================

type CellValue = number | string | null;
type GoodWhen = "up" | "down" | "zero" | null;
type Kind =
  | "int"
  | "decimal"
  | "percent"
  | "time"
  | "score"
  | "text";

interface Period {
  id: string;
  type: "week" | "day";
  label: string;
  start: string;
  end: string;
  weekId: string;
  hasData: boolean;
}

interface Indicator {
  key: string;
  label: string;
  group: string;
  kind: Kind;
  goodWhen: GoodWhen;
  weeklyOnly: boolean;
  indent: boolean;
}

interface Hub {
  hub: string;
  hub_code: string;
  regional: string;
  subregional: string;
  series: Record<string, CellValue[]>;
}

interface BarometroData {
  periods: Period[];
  indicators: Indicator[];
  groups: string[];
  hubs: Hub[];
}

const NO_REGIONAL = "Sem regional";
const COMMENT_KEY = "comentarios";
const HUBS_PER_PAGE = 8;

// casas decimais por indicador (o padrão de "decimal" é 1)
const DECIMALS: Record<string, number> = {
  gap_spr: 2,
  utr: 2,
  produtividade_bancada: 2,
  nota: 2,
};

// ============================================================
// FORMATAÇÃO
// ============================================================

function formatCell(
  value: CellValue,
  indicator: Indicator
): string {
  if (value === null || value === undefined) {
    return "–";
  }

  switch (indicator.kind) {
    case "int":
      return typeof value === "number"
        ? Math.round(value).toLocaleString("pt-BR")
        : "–";

    case "percent":
      return typeof value === "number"
        ? `${(value * 100).toLocaleString("pt-BR", {
            minimumFractionDigits: 1,
            maximumFractionDigits: 1,
          })}%`
        : "–";

    case "time": {
      if (typeof value !== "number") return "–";

      const hours = Math.floor(value / 60);
      const minutes = Math.round(value % 60);

      return `${hours}h ${String(minutes).padStart(2, "0")}m`;
    }

    case "decimal":
    case "score": {
      if (typeof value !== "number") return "–";

      const digits = DECIMALS[indicator.key] ?? 1;
      const text = value.toLocaleString("pt-BR", {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
      });

      return indicator.key === "gap_spr" && value > 0
        ? `+${text}`
        : text;
    }

    default:
      return String(value);
  }
}

// ============================================================
// COR POR LINHA
//
// Dentro de cada linha (um indicador de um hub), compara cada
// valor com o menor e o maior da própria linha — dias e
// semanas separados, porque o total semanal não é comparável a
// um dia. Só indicadores com direção "boa" definida recebem cor.
// ============================================================

function buildRowHeat(
  values: CellValue[],
  columns: number[],
  periods: Period[],
  indicator: Indicator
): (React.CSSProperties | undefined)[] {
  const result: (React.CSSProperties | undefined)[] = [];

  if (!indicator.goodWhen) return result;

  const pick = (type: Period["type"]) => {
    const numbers: number[] = [];

    columns.forEach((col) => {
      const value = values[col];

      if (periods[col].type === type && typeof value === "number") {
        numbers.push(
          indicator.goodWhen === "zero" ? Math.abs(value) : value
        );
      }
    });

    return numbers.length >= 3
      ? { min: Math.min(...numbers), max: Math.max(...numbers) }
      : null;
  };

  const ranges = { day: pick("day"), week: pick("week") };

  columns.forEach((col, position) => {
    const value = values[col];
    const range = ranges[periods[col].type];

    if (
      typeof value !== "number" ||
      !range ||
      range.max === range.min
    ) {
      return;
    }

    const base =
      indicator.goodWhen === "zero" ? Math.abs(value) : value;

    const t = (base - range.min) / (range.max - range.min);

    // "up": alto é bom; "down" e "zero": baixo é bom
    const score = indicator.goodWhen === "up" ? t : 1 - t;
    const alpha = Math.abs(score - 0.5) * 2 * 0.3;

    if (alpha < 0.04) return;

    result[position] = {
      background: `rgba(var(--${score > 0.5 ? "green" : "red"}-rgb), ${alpha.toFixed(3)})`,
    };
  });

  return result;
}

// ============================================================
// PÁGINA
// ============================================================

function Barometro() {
  const user = getCurrentUser() ?? { name: "", email: "" };

  const [data, setData] = useState<BarometroData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [view, setView] = useState<"all" | "weeks">("all");
  const [regional, setRegional] = useState("");
  const [subregional, setSubregional] = useState("");
  const [search, setSearch] = useState("");
  const [hiddenGroups, setHiddenGroups] = useState<string[]>([]);
  const [visibleHubs, setVisibleHubs] = useState(HUBS_PER_PAGE);

  // ----------------------------------------------------------
  // CARGA DOS DADOS
  // ----------------------------------------------------------

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const response = await authFetch("/api/barometro");

        if (!response.ok) {
          throw new Error(`Erro HTTP ${response.status}`);
        }

        const result: { data: BarometroData } =
          await response.json();

        if (!cancelled) setData(result.data);
      } catch (err) {
        if (cancelled) return;

        console.error("Erro ao carregar o Barômetro:", err);
        setError(
          "Não foi possível carregar os dados do Barômetro."
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  const periods = useMemo(() => data?.periods ?? [], [data]);

  // colunas exibidas (índices em `periods`)
  const columns = useMemo(
    () =>
      periods
        .map((period, index) => ({ period, index }))
        .filter(
          ({ period }) => view === "all" || period.type === "week"
        )
        .map(({ index }) => index),
    [periods, view]
  );

  // ----------------------------------------------------------
  // FILTROS
  // ----------------------------------------------------------

  const hubs = useMemo(() => data?.hubs ?? [], [data]);

  const regionalOptions = useMemo(
    () =>
      Array.from(
        new Set(hubs.map((h) => h.regional || NO_REGIONAL))
      ).sort((a, b) => a.localeCompare(b, "pt-BR")),
    [hubs]
  );

  const subregionalOptions = useMemo(
    () =>
      Array.from(
        new Set(
          hubs
            .filter(
              (h) =>
                !regional ||
                (h.regional || NO_REGIONAL) === regional
            )
            .map((h) => h.subregional)
            .filter(Boolean)
        )
      ).sort((a, b) => a.localeCompare(b, "pt-BR")),
    [hubs, regional]
  );

  const filteredHubs = useMemo(() => {
    const term = search.trim().toLowerCase();

    return hubs.filter((hub) => {
      if (
        regional &&
        (hub.regional || NO_REGIONAL) !== regional
      ) {
        return false;
      }

      if (subregional && hub.subregional !== subregional) {
        return false;
      }

      return (
        !term ||
        `${hub.hub} ${hub.hub_code}`.toLowerCase().includes(term)
      );
    });
  }, [hubs, regional, subregional, search]);

  // mudou o filtro: volta ao começo da lista
  useEffect(() => {
    setVisibleHubs(HUBS_PER_PAGE);
  }, [regional, subregional, search]);

  const clearFilters = () => {
    setRegional("");
    setSubregional("");
    setSearch("");
  };

  const hasActiveFilters = Boolean(
    regional || subregional || search
  );

  // ----------------------------------------------------------
  // INDICADORES VISÍVEIS (blocos ligados/desligados)
  // ----------------------------------------------------------

  const visibleIndicators = useMemo(
    () =>
      (data?.indicators ?? []).filter(
        (indicator) => !hiddenGroups.includes(indicator.group)
      ),
    [data, hiddenGroups]
  );

  const groupIndex = useMemo(
    () =>
      new Map((data?.groups ?? []).map((g, index) => [g, index])),
    [data]
  );

  const toggleGroup = (group: string) => {
    setHiddenGroups((current) =>
      current.includes(group)
        ? current.filter((g) => g !== group)
        : [...current, group]
    );
  };

  // ----------------------------------------------------------
  // CABEÇALHO: semanas agrupando suas colunas
  // ----------------------------------------------------------

  const weekHeaders = useMemo(() => {
    const spans: { weekId: string; label: string; span: number }[] =
      [];

    columns.forEach((col) => {
      const period = periods[col];
      const last = spans[spans.length - 1];

      if (last && last.weekId === period.weekId) {
        last.span += 1;
      } else {
        const week = periods.find((p) => p.id === period.weekId);

        spans.push({
          weekId: period.weekId,
          label: week?.label ?? "",
          span: 1,
        });
      }
    });

    return spans;
  }, [columns, periods]);

  // ----------------------------------------------------------
  // ROLAGEM: abre nas semanas mais recentes (como o fim da aba)
  // ----------------------------------------------------------

  const scrollRef = useScrollToEnd<HTMLDivElement>(
    `${view}-${columns.length}-${data ? "ok" : "wait"}`
  );

  // ----------------------------------------------------------
  // CARGA PROGRESSIVA DOS BLOCOS (são 200+ hubs × 37 linhas)
  // ----------------------------------------------------------

  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const node = sentinelRef.current;

    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisibleHubs((current) => current + HUBS_PER_PAGE);
        }
      },
      { rootMargin: "400px" }
    );

    observer.observe(node);

    return () => observer.disconnect();
  }, [filteredHubs.length, visibleHubs]);

  const hubsToRender = filteredHubs.slice(0, visibleHubs);

  // ----------------------------------------------------------
  // EXPORTAÇÃO — todos os hubs filtrados, um indicador por linha
  // ----------------------------------------------------------

  const exportFile = (format: "csv" | "xlsx") => {
    const exportColumns: ExportColumn[] = [
      { header: "Regional", type: "text", width: 12 },
      { header: "Subregional", type: "text", width: 14 },
      { header: "Hub code", type: "text", width: 14 },
      { header: "Hub", type: "text", width: 34 },
      { header: "Indicador", type: "text", width: 34 },
      ...columns.map(
        (col): ExportColumn => ({
          header:
            periods[col].type === "week"
              ? periods[col].label
              : periods[col].start,
          type: "decimal",
          width: 14,
        })
      ),
    ];

    const body: ExportCell[][] = [];

    filteredHubs.forEach((hub) => {
      visibleIndicators.forEach((indicator) => {
        const values = hub.series[indicator.key];

        body.push([
          hub.regional,
          hub.subregional,
          hub.hub_code,
          hub.hub,
          indicator.label,
          ...columns.map((col) => {
            const value = values[col];

            if (typeof value !== "number") return value;

            // percentuais saem em 0–100 e tempo em minutos
            return indicator.kind === "percent"
              ? Math.round(value * 10000) / 100
              : value;
          }),
        ]);
      });
    });

    if (format === "csv") {
      downloadCsv("barometro.csv", exportColumns, body);
    } else {
      downloadXlsx(
        "barometro.xlsx",
        exportColumns,
        body,
        "Barômetro"
      );
    }
  };

  // ----------------------------------------------------------
  // RENDER
  // ----------------------------------------------------------

  const totalColumns = columns.length;

  return (
    <div className="bau-page">
      <Sidebar />

      <div className="bau-content">
        <Topbar
          userName={user.name}
          userEmail={user.email}
        />

        <main className="bau-main">
          {/* HEADER */}

          <section className="bau-header">
            <div className="bau-title-wrapper">
              <div className="bau-title-icon">
                <Gauge size={26} />
              </div>

              <div>
                <h1>Barômetro</h1>

                <p>
                  Indicadores da operação por hub — volume, SPR,
                  drivers, frota e a pesquisa de satisfação.
                </p>
              </div>
            </div>
          </section>

          {/* FILTROS */}

          <section className="bau-filters">
            <div className="bau-filters-header">
              <div className="bau-section-title">
                <Filter size={18} />

                <span>Filtros</span>
              </div>

              <button
                className="bau-reset-button"
                onClick={clearFilters}
                disabled={!hasActiveFilters}
              >
                <FilterX size={16} />
                Limpar filtros
              </button>
            </div>

            <div className="bau-filter-grid">
              <div className="bau-filter bau-filter--period">
                <label>Colunas</label>

                <div className="bau-chart-controls">
                  <button
                    className={view === "all" ? "active" : ""}
                    onClick={() => setView("all")}
                  >
                    Dias + semanas
                  </button>

                  <button
                    className={view === "weeks" ? "active" : ""}
                    onClick={() => setView("weeks")}
                  >
                    Só semanas
                  </button>
                </div>
              </div>

              <div className="bau-filter">
                <label>Regional</label>

                <select
                  value={regional}
                  onChange={(event) => {
                    setRegional(event.target.value);
                    setSubregional("");
                  }}
                >
                  <option value="">Todas</option>

                  {regionalOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              <div className="bau-filter">
                <label>Subregional</label>

                <select
                  value={subregional}
                  onChange={(event) =>
                    setSubregional(event.target.value)
                  }
                >
                  <option value="">Todas</option>

                  {subregionalOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              <div className="bau-filter">
                <label>Hub</label>

                <div className="baro-search">
                  <Search size={14} />

                  <input
                    type="text"
                    placeholder="Nome ou código do hub"
                    value={search}
                    onChange={(event) =>
                      setSearch(event.target.value)
                    }
                  />
                </div>
              </div>
            </div>

            <div className="baro-groups">
              <span className="baro-groups-label">
                Blocos de indicadores
              </span>

              {(data?.groups ?? []).map((group) => {
                const hidden = hiddenGroups.includes(group);

                return (
                  <button
                    key={group}
                    className={`baro-chip${hidden ? "" : " active"}`}
                    onClick={() => toggleGroup(group)}
                    aria-pressed={!hidden}
                  >
                    {group}
                  </button>
                );
              })}
            </div>
          </section>

          {/* BLOCOS POR HUB */}

          <section className="bau-table-card baro-card">
            <div className="bau-card-header">
              <div>
                <h2>Indicadores por hub</h2>

                <p>
                  Cada bloco é um hub; as linhas são os
                  indicadores e as colunas, os dias e as semanas.
                  A cor compara cada valor com o restante da
                  própria linha (verde melhor, vermelho pior).
                </p>
              </div>

              <div className="bau-table-header-actions">
                <span className="bau-table-count">
                  {filteredHubs.length} de {hubs.length} hubs
                </span>

                <button
                  className="bau-download-button"
                  onClick={() => exportFile("xlsx")}
                  disabled={!filteredHubs.length}
                >
                  <Download size={13} />
                  XLSX
                </button>

                <button
                  className="bau-download-button"
                  onClick={() => exportFile("csv")}
                  disabled={!filteredHubs.length}
                >
                  <Download size={13} />
                  CSV
                </button>
              </div>
            </div>

            {loading && (
              <div className="baro-skeleton">
                {Array.from({ length: 9 }).map((_, index) => (
                  <div
                    key={index}
                    className="skeleton"
                    style={{ animationDelay: `${index * 60}ms` }}
                  />
                ))}
              </div>
            )}

            {error && (
              <div className="bau-chart-placeholder">
                <strong>{error}</strong>
                <span>Tente novamente em instantes.</span>
              </div>
            )}

            {!error && data && (
              <div className="baro-sheet-wrapper" ref={scrollRef}>
                <table className="baro-sheet">
                  <thead>
                    <tr>
                      <th className="baro-label-col" rowSpan={2}>
                        Indicador
                      </th>

                      {weekHeaders.map((week) => (
                        <th
                          key={week.weekId}
                          colSpan={week.span}
                          className="baro-week-head"
                        >
                          {week.label}
                        </th>
                      ))}
                    </tr>

                    <tr>
                      {columns.map((col) => {
                        const period = periods[col];

                        return (
                          <th
                            key={period.id}
                            className={`baro-col-head${
                              period.type === "week"
                                ? " is-week"
                                : ""
                            }${period.hasData ? "" : " no-data"}`}
                          >
                            {period.type === "week"
                              ? period.label.split(" · ")[0]
                              : period.label}
                          </th>
                        );
                      })}
                    </tr>
                  </thead>

                  <tbody>
                    {hubsToRender.map((hub) => (
                      <Fragment key={hub.hub}>
                        <tr className="baro-hub-row">
                          <td colSpan={totalColumns + 1}>
                            <div className="baro-hub-title">
                              <strong>{hub.hub}</strong>

                              {hub.hub_code && (
                                <span className="baro-badge">
                                  {hub.hub_code}
                                </span>
                              )}

                              <span className="baro-badge baro-badge--muted">
                                {hub.regional || NO_REGIONAL}
                                {hub.subregional
                                  ? ` · ${hub.subregional}`
                                  : ""}
                              </span>
                            </div>
                          </td>
                        </tr>

                        {visibleIndicators.map((indicator, row) => {
                          const values =
                            hub.series[indicator.key];
                          const heat = buildRowHeat(
                            values,
                            columns,
                            periods,
                            indicator
                          );
                          const band =
                            (groupIndex.get(indicator.group) ??
                              0) % 2
                              ? "band-b"
                              : "band-a";
                          const startsGroup =
                            row === 0 ||
                            visibleIndicators[row - 1].group !==
                              indicator.group;

                          return (
                            <tr
                              key={indicator.key}
                              className={`baro-ind-row ${band}${startsGroup ? " group-start" : ""}`}
                            >
                              <th
                                className={`baro-label-col${indicator.indent ? " is-sub" : ""}`}
                              >
                                {indicator.label}
                              </th>

                              {columns.map((col, position) => {
                                const value = values[col];
                                const isComment =
                                  indicator.key === COMMENT_KEY;

                                return (
                                  <td
                                    key={periods[col].id}
                                    className={`${
                                      periods[col].type === "week"
                                        ? "is-week"
                                        : ""
                                    }${value === null ? " is-empty" : ""}${isComment ? " is-comment" : ""}`}
                                    style={heat[position]}
                                    title={
                                      isComment && value !== null
                                        ? String(value)
                                        : undefined
                                    }
                                  >
                                    {formatCell(value, indicator)}
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })}
                      </Fragment>
                    ))}

                    {!filteredHubs.length && (
                      <tr>
                        <td
                          colSpan={totalColumns + 1}
                          className="baro-no-rows"
                        >
                          Nenhum hub encontrado com os filtros
                          atuais.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>

                {visibleHubs < filteredHubs.length && (
                  <div
                    ref={sentinelRef}
                    className="baro-more"
                  >
                    <button
                      onClick={() =>
                        setVisibleHubs(
                          (current) => current + HUBS_PER_PAGE
                        )
                      }
                    >
                      Mostrar mais hubs ({visibleHubs} de{" "}
                      {filteredHubs.length})
                    </button>
                  </div>
                )}
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}

export default Barometro;
