import { useMemo, useState } from "react";
import type { ReactNode } from "react";

import { useContainerWidth } from "../../hooks/useContainerWidth";

import { roundedTopBarPath } from "./DriversBarChart";

// ============================================================
// TIPOS
//
// Os valores podem vir null: o eixo X é o mesmo pra todos os
// gráficos da página (período do filtro), então dia sem dado de
// SPR aparece vazio em vez de sumir do eixo.
// ============================================================

export interface SprChartDatum {
  period: string;
  spr_delivering: number | null;
  spr_route: number | null;
  gap: number | null;
}

interface SprGapChartProps {
  title: string;
  description: string;
  icon: ReactNode;
  data: SprChartDatum[];
  formatPeriodLabel: (period: string) => string;
}

// ============================================================
// CORES E LIMITE DO GAP
//
// Delivering (azul) e Route (laranja) seguem a paleta dos outros
// gráficos do BAU. O GAP é pintado como um "mapa de calor":
// verde quando está acima do limite, vermelho quando está abaixo,
// e mais intenso quanto maior a distância em relação ao zero.
// ============================================================

const DELIVERING_COLOR = "#3987e5";
const ROUTE_COLOR = "#d95926";

const GAP_GOOD_COLOR = "#1fa971";
const GAP_BAD_COLOR = "#e0474c";

// GAP >= GAP_THRESHOLD fica verde; abaixo disso, vermelho.
// Hoje: 0 = acima do zero verde, abaixo do zero vermelho.
// Para mudar a regra (ex.: exigir GAP de +1), é só trocar aqui.
const GAP_THRESHOLD: number = 0;

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
// clara no rótulo/tooltip
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

function isNumber(value: number | null): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

// ============================================================
// ESCALA "AGRADÁVEL" PARA UM INTERVALO QUALQUER
//
// O painel de SPR não começa no 0 (o SPR fica ~80–110, começar
// do 0 achataria as linhas). O painel do GAP é simétrico em volta
// do 0.
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
//   - em cima: linhas de SPR Delivering e SPR Route
//   - embaixo: barras do GAP (Delivering − Route), verdes acima do
//     limite e vermelhas abaixo, com o valor em cada barra
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

  const hasAnyData = data.some(
    (item) =>
      isNumber(item.spr_delivering) || isNumber(item.spr_route)
  );

  // ---------------- escala do painel de SPR ----------------

  const sprScale = useMemo(() => {
    const values = data
      .flatMap((item) => [item.spr_delivering, item.spr_route])
      .filter(isNumber);

    if (!values.length) {
      return { min: 0, max: 100, ticks: [0, 50, 100] };
    }

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
    const gaps = data.map((item) => item.gap).filter(isNumber);

    const maxAbs = gaps.length
      ? Math.max(...gaps.map((gap) => Math.abs(gap)))
      : 0;

    // a escala sempre inclui a linha do limite
    const reference =
      Math.max(maxAbs, Math.abs(GAP_THRESHOLD), 0.5) * 1.25;

    const tickStep = niceStep(reference, 2);

    const limit = Math.ceil(reference / tickStep) * tickStep;

    return {
      min: -limit,
      max: limit,
      maxAbs: maxAbs || 1,
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

  // linha "quebrada" nos dias sem dado (não liga um ponto ao
  // outro por cima do buraco)
  const buildPath = (
    getValue: (item: SprChartDatum) => number | null
  ) => {
    let path = "";
    let penDown = false;

    data.forEach((item, index) => {
      const value = getValue(item);

      if (!isNumber(value)) {
        penDown = false;
        return;
      }

      path += `${penDown ? "L" : "M"}${xAt(index)},${sprY(value)} `;
      penDown = true;
    });

    return path.trim();
  };

  const deliveringPath = buildPath(
    (item) => item.spr_delivering
  );

  const routePath = buildPath((item) => item.spr_route);

  const xLabelInterval = Math.max(
    1,
    Math.ceil(data.length / 7)
  );

  // rótulos só quando cabem entre um ponto e outro
  const showSprLabels = step >= 30;
  const showGapLabels = step >= 26;

  // pontos só quando não ficam amontoados
  const showPoints = step >= 8;

  const gapBarWidth = Math.max(3, Math.min(34, step * 0.62));

  const zeroY = gapY(0);
  const thresholdY = gapY(GAP_THRESHOLD);

  const tooltipX =
    hoveredIndex !== null
      ? Math.min(xAt(hoveredIndex) + 14, width - 205)
      : 0;

  const tooltipValue = (
    value: number | null,
    formatter: (value: number) => string
  ) => (isNumber(value) ? formatter(value) : "sem dados");

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
            style={{ background: GAP_GOOD_COLOR }}
          />
          <span>
            GAP ≥ {formatGap(GAP_THRESHOLD)}
          </span>
        </div>

        <div className="drivers-legend-item">
          <span
            className="drivers-legend-swatch"
            style={{ background: GAP_BAD_COLOR }}
          />
          <span>
            GAP &lt; {formatGap(GAP_THRESHOLD)}
          </span>
        </div>
      </div>

      {!hasAnyData ? (
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

                const hasDelivering = isNumber(
                  item.spr_delivering
                );
                const hasRoute = isNumber(item.spr_route);

                if (!hasDelivering && !hasRoute) {
                  return null;
                }

                const deliveringY = hasDelivering
                  ? sprY(item.spr_delivering as number)
                  : 0;

                const routeY = hasRoute
                  ? sprY(item.spr_route as number)
                  : 0;

                // as duas linhas andam muito próximas, então o
                // rótulo da série de valor maior vai ACIMA do
                // ponto e o da menor vai ABAIXO — assim os dois
                // números não se sobrepõem
                const deliveringOnTop =
                  !hasRoute ||
                  (hasDelivering &&
                    (item.spr_delivering as number) >=
                      (item.spr_route as number));

                const deliveringLabelY = deliveringOnTop
                  ? deliveringY - 9
                  : deliveringY + 17;

                const routeLabelY = deliveringOnTop
                  ? routeY + 17
                  : routeY - 9;

                const radius = hoveredIndex === index ? 4.5 : 3;

                return (
                  <g key={`spr-points-${item.period}-${index}`}>
                    {hasRoute && (
                      <circle
                        cx={x}
                        cy={routeY}
                        r={radius}
                        fill={ROUTE_COLOR}
                      />
                    )}

                    {hasDelivering && (
                      <circle
                        cx={x}
                        cy={deliveringY}
                        r={radius}
                        fill={DELIVERING_COLOR}
                      />
                    )}

                    {showSprLabels && hasDelivering && (
                      <text
                        x={x}
                        y={deliveringLabelY}
                        textAnchor="middle"
                        fill={DELIVERING_COLOR}
                        className="spr-value-label"
                        pointerEvents="none"
                      >
                        {formatSprLabel(
                          item.spr_delivering as number
                        )}
                      </text>
                    )}

                    {showSprLabels && hasRoute && (
                      <text
                        x={x}
                        y={routeLabelY}
                        textAnchor="middle"
                        fill={ROUTE_COLOR}
                        className="spr-value-label"
                        pointerEvents="none"
                      >
                        {formatSprLabel(item.spr_route as number)}
                      </text>
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

            {/* linha do limite verde/vermelho */}

            {GAP_THRESHOLD !== 0 && (
              <line
                x1={paddingLeft}
                y1={thresholdY}
                x2={width - paddingRight}
                y2={thresholdY}
                className="spr-gap-threshold-line"
              />
            )}

            {data.map((item, index) => {
              if (!isNumber(item.gap)) {
                return null;
              }

              const gap = item.gap;

              const x = xAt(index) - gapBarWidth / 2;

              const valueY = gapY(gap);

              const isGood = gap >= GAP_THRESHOLD;

              // "calor": quanto mais longe do zero, mais forte a cor
              const intensity =
                0.55 +
                0.45 *
                  Math.min(1, Math.abs(gap) / gapScale.maxAbs);

              const isDimmed =
                hoveredIndex !== null && hoveredIndex !== index;

              // barra positiva sobe a partir do zero (topo
              // arredondado); negativa desce a partir do zero
              const barPath =
                gap >= 0
                  ? roundedTopBarPath(
                      x,
                      valueY,
                      gapBarWidth,
                      Math.max(zeroY - valueY, 1),
                      3
                    )
                  : `M${x},${zeroY} L${x + gapBarWidth},${zeroY} L${
                      x + gapBarWidth
                    },${valueY} L${x},${valueY} Z`;

              const labelY =
                gap >= 0 ? valueY - 6 : valueY + 13;

              return (
                <g key={`gap-bar-${item.period}-${index}`}>
                  <path
                    d={barPath}
                    fill={isGood ? GAP_GOOD_COLOR : GAP_BAD_COLOR}
                    opacity={
                      isDimmed ? intensity * 0.4 : intensity
                    }
                  />

                  {showGapLabels && (
                    <text
                      x={xAt(index)}
                      y={labelY}
                      textAnchor="middle"
                      className="spr-gap-label"
                      pointerEvents="none"
                    >
                      {formatGap(gap)}
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
                  {tooltipValue(
                    data[hoveredIndex].spr_delivering,
                    formatNumber
                  )}
                </text>

                <text
                  x={tooltipX + 12}
                  y={sprPanelTop + 72}
                  fill={ROUTE_COLOR}
                  className="drivers-tooltip-value"
                >
                  SPR Route:{" "}
                  {tooltipValue(
                    data[hoveredIndex].spr_route,
                    formatNumber
                  )}
                </text>

                <text
                  x={tooltipX + 12}
                  y={sprPanelTop + 94}
                  fill={
                    isNumber(data[hoveredIndex].gap) &&
                    (data[hoveredIndex].gap as number) >=
                      GAP_THRESHOLD
                      ? GAP_GOOD_COLOR
                      : GAP_BAD_COLOR
                  }
                  className="drivers-tooltip-value"
                >
                  GAP:{" "}
                  {tooltipValue(
                    data[hoveredIndex].gap,
                    formatGap
                  )}
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
