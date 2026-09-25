import { useMemo, useState } from "react";
import type { ReactNode } from "react";

import { useContainerWidth } from "../../hooks/useContainerWidth";

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
// Delivering (azul) e Route (laranja) seguem a paleta dos outros
// gráficos do BAU. O GAP usa uma cor neutra própria.
// ============================================================

const DELIVERING_COLOR = "#3987e5";
const ROUTE_COLOR = "#d95926";
const GAP_COLOR = "#a3b1c4";

function formatNumber(value: number) {
  return value.toLocaleString("pt-BR", {
    maximumFractionDigits: 2,
  });
}

// rótulo em cima das bolinhas de SPR: 1 casa decimal no máximo,
// pra caber entre um ponto e outro (o valor completo fica no
// tooltip)
function formatSprLabel(value: number) {
  return value.toLocaleString("pt-BR", {
    maximumFractionDigits: 1,
  });
}

// número do gap sempre com sinal (+ ou -), pra direção ficar
// clara no rótulo/tooltip sem precisar de cor
function formatGap(value: number) {
  const formatted = Math.abs(value).toLocaleString("pt-BR", {
    maximumFractionDigits: 2,
  });

  if (value > 0) {
    return `+${formatted}`;
  }

  if (value < 0) {
    return `-${formatted}`;
  }

  return formatted;
}

// ============================================================
// ESCALA "AGRADÁVEL" PARA UM INTERVALO QUALQUER
//
// Diferente dos gráficos de barra (que sempre começam no 0), aqui
// o eixo é "aproximado" em volta dos dados: o SPR fica ~80–110 e o
// GAP fica perto de 0, então começar do 0 achataria as linhas e o
// GAP sumiria (era o problema do gráfico de barras antigo).
// ============================================================

function niceStep(range: number, targetTicks: number): number {
  if (range <= 0) {
    return 1;
  }

  const raw = range / targetTicks;

  const magnitude = Math.pow(10, Math.floor(Math.log10(raw)));

  const normalized = raw / magnitude;

  let multiplier = 10;

  if (normalized <= 1) {
    multiplier = 1;
  } else if (normalized <= 2) {
    multiplier = 2;
  } else if (normalized <= 2.5) {
    multiplier = 2.5;
  } else if (normalized <= 5) {
    multiplier = 5;
  }

  return multiplier * magnitude;
}

function buildTicks(min: number, max: number, step: number) {
  const ticks: number[] = [];

  // arredonda pra evitar 0.30000000004 etc.
  for (let value = min; value <= max + step / 2; value += step) {
    ticks.push(Number(value.toFixed(6)));
  }

  return ticks;
}

// ============================================================
// COMPONENTE
//
// Um card com dois painéis que compartilham o eixo X (datas):
//   - em cima: linhas de SPR Delivering e SPR Route, com eixo Y
//     aproximado em volta dos valores
//   - embaixo: linha do GAP (Delivering − Route), com eixo Y
//     próprio, simétrico em volta do 0
// Assim cada uma das 3 linhas tem uma escala que faz sentido pra
// ela, e o GAP (que é pequeno) fica visível.
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

  const [containerRef, width, height] =
    useContainerWidth<HTMLDivElement>(1000, 420);

  const paddingLeft = 70;
  const paddingRight = 30;
  const paddingTop = 28;
  const paddingBottom = 40;
  const panelGap = 48;

  const chartWidth = width - paddingLeft - paddingRight;

  const innerHeight =
    height - paddingTop - paddingBottom - panelGap;

  const sprPanelHeight = innerHeight * 0.6;
  const gapPanelHeight = innerHeight - sprPanelHeight;

  const sprPanelTop = paddingTop;
  const gapPanelTop = sprPanelTop + sprPanelHeight + panelGap;

  // ---------------- escala do painel de SPR ----------------

  const sprScale = useMemo(() => {
    if (!data.length) {
      return { min: 0, max: 100, ticks: [0, 50, 100] };
    }

    const values = data.flatMap((item) => [
      item.spr_delivering,
      item.spr_route,
    ]);

    const lo = Math.min(...values);
    const hi = Math.max(...values);

    const pad = (hi - lo) * 0.15 || Math.max(1, hi * 0.05);

    const tickStep = niceStep(hi - lo + pad * 2, 4);

    const min = Math.max(
      0,
      Math.floor((lo - pad) / tickStep) * tickStep
    );

    const max = Math.ceil((hi + pad) / tickStep) * tickStep;

    return { min, max, ticks: buildTicks(min, max, tickStep) };
  }, [data]);

  // ---------------- escala do painel de GAP ----------------

  const gapScale = useMemo(() => {
    const maxAbs = data.length
      ? Math.max(...data.map((item) => Math.abs(item.gap)))
      : 0;

    const reference = maxAbs > 0 ? maxAbs * 1.2 : 1;

    const tickStep = niceStep(reference, 2);

    const limit = Math.ceil(reference / tickStep) * tickStep;

    return {
      min: -limit,
      max: limit,
      ticks: buildTicks(-limit, limit, tickStep),
    };
  }, [data]);

  const step = data.length ? chartWidth / data.length : 0;

  const xAt = (index: number) =>
    paddingLeft + index * step + step / 2;

  const sprY = (value: number) =>
    sprPanelTop +
    sprPanelHeight *
      (1 -
        (value - sprScale.min) /
          (sprScale.max - sprScale.min || 1));

  const gapY = (value: number) =>
    gapPanelTop +
    gapPanelHeight *
      (1 -
        (value - gapScale.min) /
          (gapScale.max - gapScale.min || 1));

  const buildPath = (
    getY: (item: SprChartDatum) => number
  ) =>
    data
      .map(
        (item, index) =>
          `${index === 0 ? "M" : "L"}${xAt(index)},${getY(item)}`
      )
      .join(" ");

  const deliveringPath = buildPath((item) =>
    sprY(item.spr_delivering)
  );

  const routePath = buildPath((item) =>
    sprY(item.spr_route)
  );

  const gapPath = buildPath((item) => gapY(item.gap));

  const xLabelInterval = Math.max(
    1,
    Math.ceil(data.length / 7)
  );

  // rótulos do GAP só quando cabem entre um ponto e outro
  const showGapLabels = step >= 30;

  // rótulos de SPR (Delivering e Route) seguem a mesma regra
  const showSprLabels = step >= 30;

  // pontos só quando não ficam amontoados
  const showPoints = step >= 8;

  const tooltipX =
    hoveredIndex !== null
      ? Math.min(xAt(hoveredIndex) + 14, width - 205)
      : 0;

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
          className="drivers-bar-chart spr-line-chart"
          ref={containerRef}
        >
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="drivers-bar-chart-svg"
            preserveAspectRatio="none"
          >
            {/* =============== PAINEL DE SPR =============== */}

            <text
              x={paddingLeft}
              y={sprPanelTop - 12}
              className="spr-panel-title"
            >
              SPR
            </text>

            {sprScale.ticks.map((tick) => {
              const y = sprY(tick);

              return (
                <g key={`spr-tick-${tick}`}>
                  <line
                    x1={paddingLeft}
                    y1={y}
                    x2={width - paddingRight}
                    y2={y}
                    className="chart-grid-line"
                  />

                  <text
                    x={paddingLeft - 12}
                    y={y + 4}
                    textAnchor="end"
                    className="chart-axis-label"
                  >
                    {formatNumber(tick)}
                  </text>
                </g>
              );
            })}

            <path
              d={routePath}
              className="spr-line"
              stroke={ROUTE_COLOR}
            />

            <path
              d={deliveringPath}
              className="spr-line"
              stroke={DELIVERING_COLOR}
            />

            {showPoints &&
              data.map((item, index) => {
                const x = xAt(index);
                const deliveringY = sprY(item.spr_delivering);
                const routeY = sprY(item.spr_route);

                // as duas linhas andam muito próximas, então o
                // rótulo da série de valor maior vai ACIMA do
                // ponto e o da menor vai ABAIXO — assim os dois
                // números não se sobrepõem
                const deliveringOnTop =
                  item.spr_delivering >= item.spr_route;

                const deliveringLabelY = deliveringOnTop
                  ? deliveringY - 9
                  : deliveringY + 17;

                const routeLabelY = deliveringOnTop
                  ? routeY + 17
                  : routeY - 9;

                return (
                  <g key={`spr-points-${item.period}-${index}`}>
                    <circle
                      cx={x}
                      cy={routeY}
                      r={hoveredIndex === index ? 4.5 : 3}
                      fill={ROUTE_COLOR}
                    />

                    <circle
                      cx={x}
                      cy={deliveringY}
                      r={hoveredIndex === index ? 4.5 : 3}
                      fill={DELIVERING_COLOR}
                    />

                    {showSprLabels && (
                      <>
                        <text
                          x={x}
                          y={deliveringLabelY}
                          textAnchor="middle"
                          fill={DELIVERING_COLOR}
                          className="spr-value-label"
                          pointerEvents="none"
                        >
                          {formatSprLabel(item.spr_delivering)}
                        </text>

                        <text
                          x={x}
                          y={routeLabelY}
                          textAnchor="middle"
                          fill={ROUTE_COLOR}
                          className="spr-value-label"
                          pointerEvents="none"
                        >
                          {formatSprLabel(item.spr_route)}
                        </text>
                      </>
                    )}
                  </g>
                );
              })}

            {/* =============== PAINEL DE GAP =============== */}

            <text
              x={paddingLeft}
              y={gapPanelTop - 12}
              className="spr-panel-title"
            >
              GAP
            </text>

            {gapScale.ticks.map((tick) => {
              const y = gapY(tick);

              return (
                <g key={`gap-tick-${tick}`}>
                  <line
                    x1={paddingLeft}
                    y1={y}
                    x2={width - paddingRight}
                    y2={y}
                    className={
                      tick === 0
                        ? "spr-gap-zero-line"
                        : "chart-grid-line"
                    }
                  />

                  <text
                    x={paddingLeft - 12}
                    y={y + 4}
                    textAnchor="end"
                    className="chart-axis-label"
                  >
                    {tick === 0 ? "0" : formatGap(tick)}
                  </text>
                </g>
              );
            })}

            <path
              d={gapPath}
              className="spr-line"
              stroke={GAP_COLOR}
            />

            {data.map((item, index) => {
              const x = xAt(index);
              const y = gapY(item.gap);

              // rótulo acima do ponto quando o gap é positivo,
              // abaixo quando é negativo
              const labelY =
                item.gap >= 0 ? y - 9 : y + 17;

              return (
                <g key={`gap-point-${item.period}-${index}`}>
                  {showPoints && (
                    <circle
                      cx={x}
                      cy={y}
                      r={hoveredIndex === index ? 4.5 : 3}
                      fill={GAP_COLOR}
                    />
                  )}

                  {showGapLabels && (
                    <text
                      x={x}
                      y={labelY}
                      textAnchor="middle"
                      className="spr-gap-label"
                      pointerEvents="none"
                    >
                      {formatGap(item.gap)}
                    </text>
                  )}
                </g>
              );
            })}

            {/* =============== HOVER =============== */}

            {hoveredIndex !== null && (
              <line
                x1={xAt(hoveredIndex)}
                y1={sprPanelTop}
                x2={xAt(hoveredIndex)}
                y2={gapPanelTop + gapPanelHeight}
                className="spr-hover-line"
                pointerEvents="none"
              />
            )}

            {data.map((item, index) => (
              <rect
                key={`hover-${item.period}-${index}`}
                x={paddingLeft + index * step}
                y={sprPanelTop}
                width={step}
                height={
                  gapPanelTop + gapPanelHeight - sprPanelTop
                }
                className="chart-hover-area"
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
              />
            ))}

            {/* =============== TOOLTIP =============== */}

            {hoveredIndex !== null && data[hoveredIndex] && (
              <g
                className="chart-tooltip"
                pointerEvents="none"
              >
                <rect
                  x={tooltipX}
                  y={sprPanelTop}
                  width="195"
                  height={40 + 3 * 22}
                  rx="10"
                  className="chart-tooltip-box"
                />

                <text
                  x={tooltipX + 12}
                  y={sprPanelTop + 24}
                  className="chart-tooltip-date"
                >
                  {formatPeriodLabel(data[hoveredIndex].period)}
                </text>

                <text
                  x={tooltipX + 12}
                  y={sprPanelTop + 50}
                  fill={DELIVERING_COLOR}
                  className="drivers-tooltip-value"
                >
                  SPR Delivering:{" "}
                  {formatNumber(
                    data[hoveredIndex].spr_delivering
                  )}
                </text>

                <text
                  x={tooltipX + 12}
                  y={sprPanelTop + 72}
                  fill={ROUTE_COLOR}
                  className="drivers-tooltip-value"
                >
                  SPR Route:{" "}
                  {formatNumber(data[hoveredIndex].spr_route)}
                </text>

                <text
                  x={tooltipX + 12}
                  y={sprPanelTop + 94}
                  fill={GAP_COLOR}
                  className="drivers-tooltip-value"
                >
                  GAP: {formatGap(data[hoveredIndex].gap)}
                </text>
              </g>
            )}

            {/* =============== EIXO X =============== */}

            <line
              x1={paddingLeft}
              y1={gapPanelTop + gapPanelHeight}
              x2={width - paddingRight}
              y2={gapPanelTop + gapPanelHeight}
              className="chart-axis-line"
            />

            {data.map((item, index) => {
              const isFirst = index === 0;
              const isLast = index === data.length - 1;

              const showLabel =
                data.length <= 10 ||
                isFirst ||
                isLast ||
                index % xLabelInterval === 0;

              if (!showLabel) {
                return null;
              }

              return (
                <text
                  key={`x-${item.period}-${index}`}
                  x={xAt(index)}
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
