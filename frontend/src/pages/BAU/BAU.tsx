import { useMemo, useState } from "react";
import {
  BarChart3,
  Filter,
  RotateCcw,
  Search,
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

interface BauDataRow {
  date: string;
  station_id: string;
  station_name: string;
  station_code: string;
  uf: string;
  regional: string;

  qty_delivering: number;
  qty_ats: number;
  qty_drivers: number;
}

/*
 * MOCK DATA
 *
 * Por enquanto estamos utilizando dados fictícios
 * apenas para construir e validar a interface.
 *
 * Depois iremos substituir isso pela API do backend.
 */
const mockData: BauDataRow[] = [
  {
    date: "01/09",
    station_id: "SP01",
    station_name: "São Paulo",
    station_code: "SPX01",
    uf: "SP",
    regional: "Sudeste",
    qty_delivering: 12450,
    qty_ats: 320,
    qty_drivers: 285,
  },
  {
    date: "02/09",
    station_id: "SP01",
    station_name: "São Paulo",
    station_code: "SPX01",
    uf: "SP",
    regional: "Sudeste",
    qty_delivering: 13120,
    qty_ats: 335,
    qty_drivers: 292,
  },
  {
    date: "03/09",
    station_id: "SP01",
    station_name: "São Paulo",
    station_code: "SPX01",
    uf: "SP",
    regional: "Sudeste",
    qty_delivering: 12880,
    qty_ats: 328,
    qty_drivers: 289,
  },
  {
    date: "04/09",
    station_id: "SP01",
    station_name: "São Paulo",
    station_code: "SPX01",
    uf: "SP",
    regional: "Sudeste",
    qty_delivering: 13650,
    qty_ats: 342,
    qty_drivers: 298,
  },
  {
    date: "05/09",
    station_id: "SP01",
    station_name: "São Paulo",
    station_code: "SPX01",
    uf: "SP",
    regional: "Sudeste",
    qty_delivering: 14120,
    qty_ats: 351,
    qty_drivers: 305,
  },
  {
    date: "01/09",
    station_id: "RJ01",
    station_name: "Rio de Janeiro",
    station_code: "RJX01",
    uf: "RJ",
    regional: "Sudeste",
    qty_delivering: 9850,
    qty_ats: 265,
    qty_drivers: 230,
  },
  {
    date: "02/09",
    station_id: "RJ01",
    station_name: "Rio de Janeiro",
    station_code: "RJX01",
    uf: "RJ",
    regional: "Sudeste",
    qty_delivering: 10120,
    qty_ats: 272,
    qty_drivers: 235,
  },
  {
    date: "03/09",
    station_id: "RJ01",
    station_name: "Rio de Janeiro",
    station_code: "RJX01",
    uf: "RJ",
    regional: "Sudeste",
    qty_delivering: 10450,
    qty_ats: 280,
    qty_drivers: 239,
  },
];

/*
 * Valores possíveis dos filtros.
 *
 * No futuro eles poderão vir diretamente
 * da API / BigQuery.
 */
const stationIds = [
  ...new Set(mockData.map((row) => row.station_id)),
];

const stationNames = [
  ...new Set(mockData.map((row) => row.station_name)),
];

const stationCodes = [
  ...new Set(mockData.map((row) => row.station_code)),
];

const ufs = [
  ...new Set(mockData.map((row) => row.uf)),
];

const regionals = [
  ...new Set(mockData.map((row) => row.regional)),
];

function BAU() {
  /*
   * ============================================================
   * FILTROS
   * ============================================================
   */

  const [stationId, setStationId] = useState("");
  const [stationName, setStationName] = useState("");
  const [stationCode, setStationCode] = useState("");
  const [uf, setUf] = useState("");
  const [regional, setRegional] = useState("");
    /*
   * ============================================================
   * USUÁRIO LOGADO
   * ============================================================
   */
  const user: User = JSON.parse(
  localStorage.getItem("kpi_user") || '{"name":"","email":""}'
);

  /*
   * ============================================================
   * KPIs SELECIONADOS
   * ============================================================
   *
   * Começamos com Qty Delivering selecionado.
   *
   * Depois o usuário poderá selecionar vários KPIs
   * simultaneamente.
   */

  const [selectedKpis, setSelectedKpis] = useState<string[]>([
    "qty_delivering",
  ]);

  /*
   * ============================================================
   * FILTRAGEM
   * ============================================================
   */

  const filteredData = useMemo(() => {
    return mockData.filter((row) => {
      const matchesStationId =
        !stationId || row.station_id === stationId;

      const matchesStationName =
        !stationName || row.station_name === stationName;

      const matchesStationCode =
        !stationCode || row.station_code === stationCode;

      const matchesUf =
        !uf || row.uf === uf;

      const matchesRegional =
        !regional || row.regional === regional;

      return (
        matchesStationId &&
        matchesStationName &&
        matchesStationCode &&
        matchesUf &&
        matchesRegional
      );
    });
  }, [
    stationId,
    stationName,
    stationCode,
    uf,
    regional,
  ]);

  /*
   * ============================================================
   * SELEÇÃO DE KPI
   * ============================================================
   */

  const toggleKpi = (kpiId: string) => {
    setSelectedKpis((current) => {
      if (current.includes(kpiId)) {
        return current.filter((id) => id !== kpiId);
      }

      return [...current, kpiId];
    });
  };

  /*
   * ============================================================
   * RESET DOS FILTROS
   * ============================================================
   */

  const resetFilters = () => {
    setStationId("");
    setStationName("");
    setStationCode("");
    setUf("");
    setRegional("");
  };

  /*
   * ============================================================
   * TOTAL DO KPI
   * ============================================================
   */

  const getTotal = (dataKey: string) => {
    return filteredData.reduce((total, row) => {
      const value = row[dataKey as keyof BauDataRow];

      return total + (typeof value === "number" ? value : 0);
    }, 0);
  };

  /*
   * ============================================================
   * RENDER
   * ============================================================
   */

  return (
    <div className="bau-page">
      <Sidebar />

      <div className="bau-content">
        <Topbar
            userName={user.name}
            userEmail={user.email}
            />

        <main className="bau-main">

          {/* ==================================================
              HEADER
          ================================================== */}

          <section className="bau-header">
            <div>
              <div className="bau-title-wrapper">
                <div className="bau-title-icon">
                  <BarChart3 size={26} />
                </div>

                <div>
                  <h1>BAU</h1>

                  <p>
                    Business as Usual — visão operacional dos
                    principais indicadores.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* ==================================================
              FILTROS
          ================================================== */}

          <section className="bau-filters">

            <div className="bau-section-title">
              <Filter size={18} />

              <span>Filtros</span>
            </div>

            <div className="bau-filter-grid">

              <div className="bau-filter">
                <label>Station ID</label>

                <select
                  value={stationId}
                  onChange={(event) =>
                    setStationId(event.target.value)
                  }
                >
                  <option value="">Todos</option>

                  {stationIds.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </div>

              <div className="bau-filter">
                <label>Station Name</label>

                <select
                  value={stationName}
                  onChange={(event) =>
                    setStationName(event.target.value)
                  }
                >
                  <option value="">Todos</option>

                  {stationNames.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </div>

              <div className="bau-filter">
                <label>Station Code</label>

                <select
                  value={stationCode}
                  onChange={(event) =>
                    setStationCode(event.target.value)
                  }
                >
                  <option value="">Todos</option>

                  {stationCodes.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </div>

              <div className="bau-filter">
                <label>UF</label>

                <select
                  value={uf}
                  onChange={(event) =>
                    setUf(event.target.value)
                  }
                >
                  <option value="">Todos</option>

                  {ufs.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </div>

              <div className="bau-filter">
                <label>Regional</label>

                <select
                  value={regional}
                  onChange={(event) =>
                    setRegional(event.target.value)
                  }
                >
                  <option value="">Todos</option>

                  {regionals.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </div>

              <button
                className="bau-reset-button"
                onClick={resetFilters}
              >
                <RotateCcw size={16} />

                Limpar filtros
              </button>

            </div>
          </section>

          {/* ==================================================
              CONTEÚDO
          ================================================== */}

          <section className="bau-dashboard-grid">

            {/* ==================================================
                KPI SELECTOR
            ================================================== */}

            <aside className="bau-kpi-panel">

              <div className="bau-section-title">
                <TrendingUp size={18} />

                <span>KPIs</span>
              </div>

              <p className="bau-kpi-help">
                Selecione um ou mais indicadores.
              </p>

              <div className="bau-kpi-list">

                {bauKpis.map((kpi) => {
                  const isSelected =
                    selectedKpis.includes(kpi.id);

                  return (
                    <button
                      key={kpi.id}
                      className={`bau-kpi-item ${
                        isSelected ? "selected" : ""
                      }`}
                      onClick={() => toggleKpi(kpi.id)}
                    >
                      <div className="bau-kpi-item-name">
                        {kpi.name}
                      </div>

                      <div className="bau-kpi-item-description">
                        {kpi.description}
                      </div>
                    </button>
                  );
                })}

              </div>
            </aside>

            {/* ==================================================
                RESULTADO
            ================================================== */}

            <div className="bau-results">

              {/* ==============================================
                  SUMMARY CARDS
              ============================================== */}

              <div className="bau-summary-grid">

                {selectedKpis.map((kpiId) => {
                  const kpi = bauKpis.find(
                    (item) => item.id === kpiId
                  );

                  if (!kpi) return null;

                  return (
                    <div
                      className="bau-summary-card"
                      key={kpi.id}
                    >
                      <div className="bau-summary-label">
                        {kpi.name}
                      </div>

                      <div className="bau-summary-value">
                        {getTotal(kpi.dataKey).toLocaleString(
                          "pt-BR"
                        )}
                      </div>

                      <div className="bau-summary-unit">
                        {kpi.unit}
                      </div>
                    </div>
                  );
                })}

              </div>

              {/* ==============================================
                  CHART
              ============================================== */}

              <section className="bau-chart-card">

                <div className="bau-card-header">

                  <div>
                    <h2>Evolução dos KPIs</h2>

                    <p>
                      Visualização histórica dos indicadores
                      selecionados.
                    </p>
                  </div>

                  <div className="bau-chart-icon">
                    <TrendingUp size={20} />
                  </div>

                </div>

                <div className="bau-chart-placeholder">

                  <BarChart3 size={42} />

                  <strong>
                    Gráfico de linhas
                  </strong>

                  <span>
                    O gráfico será conectado aos KPIs
                    selecionados.
                  </span>

                </div>

              </section>

              {/* ==============================================
                  TABLE
              ============================================== */}

              <section className="bau-table-card">

                <div className="bau-card-header">

                  <div>
                    <h2>Detalhamento</h2>

                    <p>
                      Dados utilizados para os indicadores
                      selecionados.
                    </p>
                  </div>

                  <div className="bau-table-count">
                    {filteredData.length} registros
                  </div>

                </div>

                <div className="bau-table-wrapper">

                  <table className="bau-table">

                    <thead>
                      <tr>

                        <th>Data</th>
                        <th>Station ID</th>
                        <th>Station Name</th>
                        <th>Station Code</th>
                        <th>UF</th>
                        <th>Regional</th>

                        {selectedKpis.map((kpiId) => {
                          const kpi = bauKpis.find(
                            (item) => item.id === kpiId
                          );

                          if (!kpi) return null;

                          return (
                            <th key={kpi.id}>
                              {kpi.name}
                            </th>
                          );
                        })}

                      </tr>
                    </thead>

                    <tbody>

                      {filteredData.map((row, index) => (
                        <tr key={`${row.station_id}-${row.date}-${index}`}>

                          <td>{row.date}</td>

                          <td>{row.station_id}</td>

                          <td>{row.station_name}</td>

                          <td>{row.station_code}</td>

                          <td>{row.uf}</td>

                          <td>{row.regional}</td>

                          {selectedKpis.map((kpiId) => {
                            const kpi = bauKpis.find(
                              (item) => item.id === kpiId
                            );

                            if (!kpi) return null;

                            const value =
                              row[
                                kpi.dataKey as keyof BauDataRow
                              ];

                            return (
                              <td key={kpi.id}>
                                {typeof value === "number"
                                  ? value.toLocaleString("pt-BR")
                                  : "-"}
                              </td>
                            );
                          })}

                        </tr>
                      ))}

                    </tbody>

                  </table>

                </div>

              </section>

            </div>
          </section>

        </main>
      </div>
    </div>
  );
}

export default BAU;