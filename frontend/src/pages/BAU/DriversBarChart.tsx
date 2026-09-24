import { useMemo, useState } from "react";
import type { ReactNode } from "react";

import { useContainerWidth } from "../../hooks/useContainerWidth";

// ============================================================
// TIPOS
// ============================================================

export interface BarSeriesConfig {
  key: string;
  label: string;
  color: string;
  formatValue: (value: number) => string;
  formatAxis?: (value: number) => string;
}

export interface BarChartDatum {
  period: string;
  values: Record<string, number>;
}

interface DriversBarChartProps {
  title: string;
  description: string;
  icon: ReactNode;
  data: BarChartDatum[];
  series: BarSeriesConfig[];
  formatPeriodLabel: (period: string) => string;
}

// ============================================================
// ESCALA "AGRADÁVEL" DO EIXO Y (mesma lógica do gráfico de linha)
// ============================================================

export function computeNiceMax(maxValue: number): number {
  if (maxValue <= 0) {
    return 100;
  }

  const magnitude = Math.pow(
    10,
    Math.floor(Math.log10(maxValue))
  );

  const normalized = maxValue / magnitude;

  let multiplier = 1;

  if (normalized <= 1) {
    multiplier = 1;
  } else if (normalized <= 2) {
    multiplier = 2;
  } else if (normalized <= 5) {
    multiplier = 5;
  } else {
    multiplier = 10;
  }

  return multiplier * magnitude;
}

// ============================================================
// BARRA COM TOPO ARREDONDADO (ancorada na base do eixo)
// ============================================================

export function roundedTopBarPath(
  x: number,
  yTop: number,
  width: number,
  height: number,
  radius: number
): string {
  if (height <= 0) {
    return "";
  }

  const r = Math.min(radius, width / 2, height);
  const yBottom = yTop + height;

  return [
    `M${x},${yBottom}`,
    `L${x},${yTop + r}`,
    `Q${x},${yTop} ${x + r},${yTop}`,
    `L${x + width - r},${yTop}`,
    `Q${x + width},${yTop} ${x + width},${yTop + r}`,
    `L${x + width},${yBottom}`,
    "Z",
  ].join(" ");
}

// ============================================================
// COMPONENTE
// ============================================================

function DriversBarChart({
  title,
  description,
  icon,
  data,
  series,
  formatPeriodLabel,
}: DriversBarChartProps) {
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
        Math.max(
          ...series.map(
            (config) => item.values[config.key] ?? 0
          )
        )
      )
    );
  }, [data, series]);

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
    Math.min(34, (groupWidth - barGap * 3) / series.length)
  );

  const xLabelInterval = Math.max(
    1,
    Math.ceil(data.length / 7)
  );

  const yTicks = [0, 0.25, 0.5, 0.75, 1];

  return (
    <section className="bau-chart-card">
      <div className="bau-card-header">
        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>

        <div className="bau-chart-icon">{icon}</div>
      </div>

      {/* LEGENDA (obrigatória para 2+ séries) */}

      <div className="drivers-legend">
        {series.map((config) => (
          <div className="drivers-legend-item" key={config.key}>
            <span
              className="drivers-legend-swatch"
              style={{ background: config.color }}
            />
            <span>{config.label}</span>
          </div>
        ))}
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
                  {series[0].formatAxis
                    ? series[0].formatAxis(
                        chartMaxValue * tick
                      )
                    : Math.round(
                        chartMaxValue * tick
                      ).toLocaleString("pt-BR")}
                </text>
              );
            })}

            {/* BARRAS */}

            {data.map((item, index) => {
              const groupX =
                paddingLeft + index * groupWidth;

              const totalBarsWidth =
                barWidth * series.length +
                barGap * (series.length - 1);

              const groupInnerOffset =
                (groupWidth - totalBarsWidth) / 2;

              return (
                <g key={`group-${item.period}-${index}`}>
                  {series.map((config, seriesIndex) => {
                    const rawValue =
                      item.values[config.key] ?? 0;

                    const value = Math.max(
                      0,
                      rawValue
                    );

                    const barHeight =
                      chartMaxValue > 0
                        ? (value / chartMaxValue) *
                          chartHeight
                        : 0;

                    const barX =
                      groupX +
                      groupInnerOffset +
                      seriesIndex * (barWidth + barGap);

                    const barYTop =
                      paddingTop +
                      chartHeight -
                      barHeight;

                    return (
                      <path
                        key={config.key}
                        d={roundedTopBarPath(
                          barX,
                          barYTop,
                          barWidth,
                          barHeight,
                          4
                        )}
                        fill={config.color}
                        opacity={
                          hoveredIndex === null ||
                          hoveredIndex === index
                            ? 1
                            : 0.35
                        }
                      />
                    );
                  })}

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
                    y={Math.max(
                      paddingTop,
                      10
                    )}
                    width="195"
                    height={40 + series.length * 22}
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

                  {series.map((config, seriesIndex) => (
                    <text
                      key={config.key}
                      x={Math.min(
                        paddingLeft +
                          hoveredIndex * groupWidth +
                          groupWidth +
                          22,
                        width - 193
                      )}
                      y={
                        Math.max(paddingTop, 10) +
                        50 +
                        seriesIndex * 22
                      }
                      fill={config.color}
                      className="drivers-tooltip-value"
                    >
                      {config.label}:{" "}
                      {config.formatValue(
                        data[hoveredIndex].values[
                          config.key
                        ] ?? 0
                      )}
                    </text>
                  ))}
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

export default DriversBarChart;
