// Placeholder animado exibido enquanto um gráfico carrega.
const BAR_HEIGHTS = [
  38, 62, 48, 80, 55, 70, 42, 88, 60, 50, 75, 45, 66, 52,
  84, 58, 40, 72, 64, 46,
];

function ChartSkeleton({ label }: { label: string }) {
  return (
    <div
      className="chart-skeleton"
      role="status"
      aria-label={label}
    >
      <div className="chart-skeleton-bars">
        {BAR_HEIGHTS.map((height, index) => (
          <span
            key={index}
            className="skeleton"
            style={{
              height: `${height}%`,
              animationDelay: `${index * 40}ms`,
            }}
          />
        ))}
      </div>

      <small>{label}</small>
    </div>
  );
}

export default ChartSkeleton;
