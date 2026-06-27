/**
 * Lightweight SVG line / area chart.
 *
 * Renders a single time-series as an inline SVG sparkline-style chart without
 * any external charting dependency, keeping the bundle small. The chart scales
 * responsively to its container via `viewBox` and `preserveAspectRatio`.
 *
 * @module components/charts/LineChart
 */

import { useId } from "react";
import type { ChartPoint } from "shared";

/**
 * Props for the {@link LineChart} component.
 */
export interface LineChartProps {
  /**
   * Ordered (oldest-first) data points to plot. Each point's `total` is used as
   * the Y value and accepts the {@link ChartPoint} shape from a chart series.
   */
  points: Pick<ChartPoint, "t" | "total">[];
  /** Accessible label describing the chart for screen readers. */
  ariaLabel: string;
  /** Stroke / fill color of the series. Defaults to the brand primary color. */
  color?: string;
  /** Rendered drawing height in user units (the width is fluid). Default 120. */
  height?: number;
  /** When `true`, fills the area beneath the line. Default `true`. */
  area?: boolean;
  /** Additional CSS class names applied to the root `<svg>`. */
  className?: string;
}

// 描画に使う論理座標系の幅。viewBox により実表示幅へスケールする。
const VIEW_WIDTH = 300;
// 線が端で切れないようにする内側余白。
const PADDING = 4;

/**
 * Build the SVG path commands for the line (and optional area fill).
 */
function buildPaths(
  points: Pick<ChartPoint, "t" | "total">[],
  height: number,
): { line: string; area: string } {
  if (points.length === 0) {
    return { line: "", area: "" };
  }

  const values = points.map((p) => p.total);
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;

  const innerWidth = VIEW_WIDTH - PADDING * 2;
  const innerHeight = height - PADDING * 2;
  // 点が1つだけのときは中央に配置する。
  const step = points.length > 1 ? innerWidth / (points.length - 1) : 0;

  const coords = points.map((p, i) => {
    const x = points.length > 1 ? PADDING + step * i : VIEW_WIDTH / 2;
    // 値が大きいほど上(=yが小さい)になるよう反転する。
    const y = PADDING + innerHeight - ((p.total - min) / range) * innerHeight;
    return { x, y };
  });

  const line = coords
    .map((c, i) => `${i === 0 ? "M" : "L"}${c.x.toFixed(2)},${c.y.toFixed(2)}`)
    .join(" ");

  const first = coords[0];
  const last = coords[coords.length - 1];
  const baseline = height - PADDING;
  const area =
    first && last
      ? `${line} L${last.x.toFixed(2)},${baseline.toFixed(2)} L${first.x.toFixed(2)},${baseline.toFixed(2)} Z`
      : "";

  return { line, area };
}

/**
 * Renders a responsive SVG line chart for a single metric series.
 *
 * @example
 * ```tsx
 * <LineChart points={series.points} ariaLabel="Total users over time" />
 * ```
 */
export function LineChart({
  points,
  ariaLabel,
  color = "var(--color-primary-500, #6366f1)",
  height = 120,
  area = true,
  className,
}: LineChartProps) {
  const gradientId = useId();
  const { line, area: areaPath } = buildPaths(points, height);

  if (points.length === 0 || !line) {
    return (
      <div
        role="img"
        aria-label={ariaLabel}
        className={`flex items-center justify-center text-sm text-gray-400 dark:text-gray-500 ${className || ""}`}
        style={{ height }}
      >
        <span>—</span>
      </div>
    );
  }

  return (
    <svg
      role="img"
      aria-label={ariaLabel}
      viewBox={`0 0 ${VIEW_WIDTH} ${height}`}
      preserveAspectRatio="none"
      className={`w-full ${className || ""}`}
      style={{ height }}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {area && areaPath && (
        <path
          d={areaPath}
          fill={`url(#${gradientId})`}
          stroke="none"
          vectorEffect="non-scaling-stroke"
        />
      )}
      <path
        d={line}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
