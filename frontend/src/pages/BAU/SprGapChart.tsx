import { useMemo, useState } from "react";
import type { ReactNode } from "react";

import { useContainerWidth } from "../../hooks/useContainerWidth";

import {
  computeNiceMax,
  roundedTopBarPath,
} from "./DriversBarChart";

// ============================================================
// TIPOS
// ============================================================

export interface SprChartDatum {
  period: string;
  spr_delivering: number;
  spr_route: number;
  gap: number;
}

interface SprGapChartProps {
  title: string;
  description: string;
  icon: ReactNode;
  data: SprChartDatum[];
  formatPeriodLabel: (period: string) => string;
}

// ============================================================
// CORES
//
// Delivering (azul) e Route (laranja) seguem a mesma paleta já
// usada nos outros gráficos de barras do BAU (drivers_confirmados
// azul, rejeite laranja). O GAP usa uma cor neutra própria — ele
// não é uma barra/série de identidade, é um conector que liga o
// topo das duas barras, então não deve competir visualmente com
// as cores das duas séries absolutas.
// ============================================================

const DELIVERING_COLOR = "#3987e5";
const ROUTE_COLOR = "#d95926";
const GAP_COLOR = "#6b7d94";

function formatNumber(value: number) {
  return value.toLocaleString("pt-BR");
}

// número do gap sempre com sinal (+ ou -), pra direção ficar
// clara no rótulo/tooltip sem precisar de cor
function formatGap(value: number) {
  const formatted = Math.abs(value).toLocaleString("pt-BR");

  if (value > 0) {
    return `+${formatted}`;
  }

  if (value < 0) {
    return `-${formatted}`;
  }

  return formatted;
}

// ============================================================
// COMPONENTE
// ============================================================

function SprGapChart({
  title,
  description,
  icon,
  data,
  formatPeriodLabel,
}: SprGapChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<
    number | null
  >(null);

  // tamanho real do container — o viewBox precisa bater com o
  // tamanho renderizado, senão os textos dos eixos ficam
  // esticados (ver useContainerWidth)
  const [containerRef, width, height] =
    useContainerWidth<HTMLDivElement>(1000, 320);

  const maxValue = useMemo(() => {
    if (!data.length) {
      return 0;
    }

    return Math.max(
      0,
      ...data.map((item) =>
        Math.max(item.spr_delivering, item.spr_route)
      )
    );
  }, [data]);

  const chartMaxValue = useMemo(
    () => computeNiceMax(maxValue),
    [maxValue]
  );

  const paddingLeft = 70;
  const paddingRight = 30;
  const paddingTop = 40;
  const paddingBottom = 50;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  const groupWidth = data.length
    ? chartWidth / data.length
    : 0;

  const barGap = 4;
  const barWidth = Math.max(
    4,
    Math.min(34, (groupWidth - barGap * 3) / 2)
  );

  const xLabelInterval = Math.max(
    1,
    Math.ceil(data.length / 7)
  );

  // o rótulo do GAP só aparece quando cabe confortavelmente
  // acima das barras — em granularidade diária, com muitos
  // grupos estreitos lado a lado, ele ficaria espremido/ilegível;
  // nesse caso o valor exato continua disponível no tooltip
  const showGapLabels = groupWidth >= 46;

  const yTicks = [0, 0.25, 0.5, 0.75, 1];

  const valueToTopY = (value: number) => {
    const clamped = Math.max(0, value);

    const barHeight =
      chartMaxValue > 0
        ? (clamped / chartMaxValue) * chartHeight
        : 0;

    return paddingTop + chartHeight - barHeight;
  };

  return (
    <section className="bau-chart-card">
      <div className="bau-card-header">
        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>

        <div className="bau-chart-icon">{icon}</div>
      </div>

      {/* LEGENDA */}

      <div className="drivers-legend">
        <div className="drivers-legend-item">
          <span
            className="drivers-legend-swatch"
            style={{ background: DELIVERING_COLOR }}
          />
          <span>SPR Delivering</span>
        </div>

        <div className="drivers-legend-item">
          <span
            className="drivers-legend-swatch"
            style={{ background: ROUTE_COLOR }}
          />
          <span>SPR Route</span>
        </div>

        <div className="drivers-legend-item">
          <span
            className="drivers-legend-swatch"
            style={{ background: GAP_COLOR }}
          />
          <span>GAP (Delivering − Route)</span>
        </div>
      </div>

      {data.length === 0 ? (
        <div className="bau-chart-placeholder">
          <strong>Nenhum dado encontrado</strong>
          <span>Ajuste os filtros selecionados.</span>
        </div>
      ) : (
        <div
          className="drivers-bar-chart"
          ref={containerRef}
        >
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="drivers-bar-chart-svg"
            preserveAspectRatio="none"
          >
            {/* GRID */}

            {yTicks.map((tick) => {
              const y =
                paddingTop + chartHeight * (1 - tick);

              return (
                <line
                  key={`grid-${tick}`}
                  x1={paddingLeft}
                  y1={y}
                  x2={width - paddingRight}
                  y2={y}
                  className={
                    tick === 0
                      ? "chart-axis-line"
                      : "chart-grid-line"
                  }
                />
              );
            })}

            {/* EIXO Y */}

            {yTicks.map((tick) => {
              const y =
                paddingTop + chartHeight * (1 - tick);

              return (
                <text
                  key={`y-${tick}`}
                  x={paddingLeft - 12}
                  y={y + 4}
                  textAnchor="end"
                  className="chart-axis-label"
                >
                  {Math.round(
                    chartMaxValue * tick
                  ).toLocaleString("pt-BR")}
                </text>
              );
            })}

            {/* BARRAS (Delivering + Route) E CONECTOR DO GAP */}

            {data.map((item, index) => {
              const groupX =
                paddingLeft + index * groupWidth;

              const totalBarsWidth =
                barWidth * 2 + barGap;

              const groupInnerOffset =
                (groupWidth - totalBarsWidth) / 2;

              // ordem: primeiro Delivering, depois Route
              const deliveringX =
                groupX + groupInnerOffset;

              const routeX =
                deliveringX + barWidth + barGap;

              const deliveringTopY = valueToTopY(
                item.spr_delivering
              );

              const routeTopY = valueToTopY(
                item.spr_route
              );

              const deliveringHeight =
                paddingTop +
                chartHeight -
                deliveringTopY;

              const routeHeight =
                paddingTop + chartHeight - routeTopY;

              const connectorFromX =
                deliveringX + barWidth / 2;

              const connectorToX =
                routeX + barWidth / 2;

              const gapLabelY =
                Math.min(deliveringTopY, routeTopY) -
                10;

              const isDimmed =
                hoveredIndex !== null &&
                hoveredIndex !== index;

              return (
                <g
                  key={`group-${item.period}-${index}`}
                >
                  <path
                    d={roundedTopBarPath(
                      deliveringX,
                      deliveringTopY,
                      barWidth,
                      deliveringHeight,
                      4
                    )}
                    fill={DELIVERING_COLOR}
                    opacity={isDimmed ? 0.35 : 1}
                  />

                  <path
                    d={roundedTopBarPath(
                      routeX,
                      routeTopY,
                      barWidth,
                      routeHeight,
                      4
                    )}
                    fill={ROUTE_COLOR}
                    opacity={isDimmed ? 0.35 : 1}
                  />

                  {/* conector do GAP: liga o topo das duas
                      barras do período — a distância entre elas
                      já está na mesma escala das barras, então o
                      número ao lado nunca "some" por causa do
                      eixo */}

                  <line
                    x1={connectorFromX}
                    y1={deliveringTopY}
                    x2={connectorToX}
                    y2={routeTopY}
                    className="spr-gap-connector"
                    opacity={isDimmed ? 0.35 : 1}
                  />

                  <circle
                    cx={connectorFromX}
                    cy={deliveringTopY}
                    r={3}
                    fill={GAP_COLOR}
                    opacity={isDimmed ? 0.35 : 1}
                  />

                  <circle
                    cx={connectorToX}
                    cy={routeTopY}
                    r={3}
                    fill={GAP_COLOR}
                    opacity={isDimmed ? 0.35 : 1}
                  />

                  {showGapLabels && (
                    <text
                      x={
                        (connectorFromX +
                          connectorToX) /
                        2
                      }
                      y={gapLabelY}
                      textAnchor="middle"
                      className="spr-gap-label"
                    >
                      {formatGap(item.gap)}
                    </text>
                  )}

                  {/* ÁREA DE HOVER DO GRUPO */}

                  <rect
                    x={groupX}
                    y={paddingTop}
                    width={groupWidth}
                    height={chartHeight}
                    className="chart-hover-area"
                    onMouseEnter={() =>
                      setHoveredIndex(index)
                    }
                    onMouseLeave={() =>
                      setHoveredIndex(null)
                    }
                  />
                </g>
              );
            })}

            {/* TOOLTIP */}

            {hoveredIndex !== null &&
              data[hoveredIndex] && (
                <g
                  className="chart-tooltip"
                  pointerEvents="none"
                >
                  <rect
                    x={Math.min(
                      paddingLeft +
                        hoveredIndex * groupWidth +
                        groupWidth +
                        10,
                      width - 205
                    )}
                    y={Math.max(paddingTop, 10)}
                    width="195"
                    height={40 + 3 * 22}
                    rx="10"
                    className="chart-tooltip-box"
                  />

                  <text
                    x={Math.min(
                      paddingLeft +
                        hoveredIndex * groupWidth +
                        groupWidth +
                        22,
                      width - 193
                    )}
                    y={Math.max(paddingTop, 10) + 24}
                    className="chart-tooltip-date"
                  >
                    {formatPeriodLabel(
                      data[hoveredIndex].period
                    )}
                  </text>

                  <text
                    x={Math.min(
                      paddingLeft +
                        hoveredIndex * groupWidth +
                        groupWidth +
                        22,
                      width - 193
                    )}
                    y={Math.max(paddingTop, 10) + 50}
                    fill={DELIVERING_COLOR}
                    className="drivers-tooltip-value"
                  >
                    SPR Delivering:{" "}
                    {formatNumber(
                      data[hoveredIndex].spr_delivering
                    )}
                  </text>

                  <text
                    x={Math.min(
                      paddingLeft +
                        hoveredIndex * groupWidth +
                        groupWidth +
                        22,
                      width - 193
                    )}
                    y={Math.max(paddingTop, 10) + 72}
                    fill={ROUTE_COLOR}
                    className="drivers-tooltip-value"
                  >
                    SPR Route:{" "}
                    {formatNumber(
                      data[hoveredIndex].spr_route
                    )}
                  </text>

                  <text
                    x={Math.min(
                      paddingLeft +
                        hoveredIndex * groupWidth +
                        groupWidth +
                        22,
                      width - 193
                    )}
                    y={Math.max(paddingTop, 10) + 94}
                    fill={GAP_COLOR}
                    className="drivers-tooltip-value"
                  >
                    GAP:{" "}
                    {formatGap(
                      data[hoveredIndex].gap
                    )}
                  </text>
                </g>
              )}

            {/* EIXO X */}

            {data.map((item, index) => {
              const isFirst = index === 0;
              const isLast =
                index === data.length - 1;

              const showLabel =
                data.length <= 10 ||
                isFirst ||
                isLast ||
                index % xLabelInterval === 0;

              if (!showLabel) {
                return null;
              }

              const x =
                paddingLeft +
                index * groupWidth +
                groupWidth / 2;

              return (
                <text
                  key={`x-${item.period}-${index}`}
                  x={x}
                  y={height - paddingBottom + 22}
                  textAnchor="middle"
                  className="chart-axis-label"
                >
                  {formatPeriodLabel(item.period)}
                </text>
              );
            })}
          </svg>
        </div>
      )}
    </section>
  );
}

export default SprGapChart;
