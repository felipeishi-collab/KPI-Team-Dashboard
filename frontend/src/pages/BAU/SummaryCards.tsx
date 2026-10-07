import "./SummaryCards.css";

export interface SummaryItem {
  id: string;
  label: string;
  // valor do período mais recente com dado (já formatado)
  value: string | null;
  // texto da variação vs período anterior (ex.: "+3,2%"), null se não houver
  deltaText: string | null;
  // direção numérica da variação
  direction: "up" | "down" | "flat" | null;
  // qual direção é "boa" para o indicador (null = neutro)
  goodWhen: "up" | "down" | null;
  // rótulos dos períodos comparados
  currentLabel: string | null;
  previousLabel: string | null;
  // série para o mini-gráfico (sem nulos)
  spark: number[];
  accent: string;
  loading: boolean;
}

function deltaTone(
  direction: SummaryItem["direction"],
  goodWhen: SummaryItem["goodWhen"]
): "good" | "bad" | "neutral" {
  if (!direction || direction === "flat" || !goodWhen) {
    return "neutral";
  }

  return direction === goodWhen ? "good" : "bad";
}

function Sparkline({
  values,
  color,
}: {
  values: number[];
  color: string;
}) {
  if (values.length < 2) {
    return <div className="summary-spark summary-spark--empty" />;
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const points = values.map((value, index) => {
    const x = (index / (values.length - 1)) * 100;
    const y = 26 - ((value - min) / range) * 22;

    return `${x.toFixed(2)},${y.toFixed(2)}`;
  });

  return (
    <svg
      className="summary-spark"
      viewBox="0 0 100 30"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <polygon
        points={`0,30 ${points.join(" ")} 100,30`}
        fill={color}
        opacity="0.12"
      />

      <polyline
        points={points.join(" ")}
        fill="none"
        stroke={color}
        strokeWidth="1.8"
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

function SummaryCards({ items }: { items: SummaryItem[] }) {
  return (
    <>
    <section className="summary-grid">
      {items.map((item) => {
        const tone = deltaTone(
          item.direction,
          item.goodWhen
        );

        const arrow =
          item.direction === "up"
            ? "↑"
            : item.direction === "down"
              ? "↓"
              : "→";

        return (
          <article
            key={item.id}
            className="summary-card"
            style={
              { "--kc": item.accent } as React.CSSProperties
            }
          >
            <span className="summary-label">
              {item.label}
            </span>

            {item.loading ? (
              <>
                <div className="skeleton summary-skeleton-value" />
                <div className="skeleton summary-skeleton-line" />
              </>
            ) : item.value === null ? (
              <>
                <strong className="summary-value summary-value--empty">
                  —
                </strong>

                <span className="summary-caption">
                  Sem dados no período
                </span>
              </>
            ) : (
              <>
                <strong className="summary-value">
                  {item.value}
                </strong>

                <div className="summary-meta">
                  {item.deltaText && (
                    <span
                      className={`summary-delta summary-delta--${tone}`}
                    >
                      {arrow} {item.deltaText}
                    </span>
                  )}

                  <span className="summary-caption">
                    {item.previousLabel
                      ? `${item.currentLabel} vs ${item.previousLabel}`
                      : item.currentLabel}
                  </span>
                </div>

                <Sparkline
                  values={item.spark}
                  color={item.accent}
                />
              </>
            )}
          </article>
        );
      })}
    </section>

    <p className="summary-note">
      Variação calculada sobre o último período encerrado; o
      período em andamento não entra no comparativo.
    </p>
    </>
  );
}

export default SummaryCards;
