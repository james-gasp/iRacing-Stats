"use client";

import { useMemo, useRef, useState } from "react";
import { fitPowerCurve, formatLapTime, type Point } from "@/lib/regression";

export type LapMetric = "qualy" | "fastest" | "average";

const METRIC_LABELS: Record<LapMetric, string> = {
  qualy: "Qualify times",
  fastest: "Fastest race lap",
  average: "Average race lap",
};

interface Props {
  dataByMetric: Record<LapMetric, Point[]>;
  carName?: string;
}

const WIDTH = 860;
const HEIGHT = 440;
const MARGIN = { top: 24, right: 24, bottom: 48, left: 76 };
const PLOT_W = WIDTH - MARGIN.left - MARGIN.right;
const PLOT_H = HEIGHT - MARGIN.top - MARGIN.bottom;

function niceTicks(min: number, max: number, count: number): number[] {
  if (min === max) return [min];
  const step = (max - min) / count;
  return Array.from({ length: count + 1 }, (_, i) => min + step * i);
}

export function LapTimeChart({ dataByMetric, carName }: Props) {
  const [metric, setMetric] = useState<LapMetric>("fastest");
  const [hoverX, setHoverX] = useState<number | null>(null);
  const [pinnedX, setPinnedX] = useState<number | null>(null);
  const [lookupInput, setLookupInput] = useState("");
  const svgRef = useRef<SVGSVGElement>(null);

  const points = useMemo(() => dataByMetric[metric] ?? [], [dataByMetric, metric]);

  const { fit, xMin, xMax, yMin, yMax } = useMemo(() => {
    if (points.length === 0) {
      return { fit: fitPowerCurve([]), xMin: 0, xMax: 10000, yMin: 0, yMax: 1 };
    }
    const xs = points.map((p) => p.x);
    const ys = points.map((p) => p.y);
    const xPad = (Math.max(...xs) - Math.min(...xs)) * 0.05 || 100;
    const yPad = (Math.max(...ys) - Math.min(...ys)) * 0.08 || 1000;
    return {
      fit: fitPowerCurve(points),
      xMin: Math.max(1, Math.min(...xs) - xPad),
      xMax: Math.max(...xs) + xPad,
      yMin: Math.max(0, Math.min(...ys) - yPad),
      yMax: Math.max(...ys) + yPad,
    };
  }, [points]);

  const xToPx = (x: number) => MARGIN.left + ((x - xMin) / (xMax - xMin)) * PLOT_W;
  const yToPx = (y: number) => MARGIN.top + ((yMax - y) / (yMax - yMin)) * PLOT_H;
  const pxToX = (px: number) => xMin + ((px - MARGIN.left) / PLOT_W) * (xMax - xMin);

  const curvePath = useMemo(() => {
    const steps = 100;
    const parts: string[] = [];
    for (let i = 0; i <= steps; i++) {
      const x = xMin + (i / steps) * (xMax - xMin);
      const y = fit.predict(x);
      const px = MARGIN.left + ((x - xMin) / (xMax - xMin)) * PLOT_W;
      const py = MARGIN.top + ((yMax - y) / (yMax - yMin)) * PLOT_H;
      parts.push(`${i === 0 ? "M" : "L"}${px.toFixed(1)},${py.toFixed(1)}`);
    }
    return parts.join(" ");
  }, [fit, xMin, xMax, yMin, yMax]);

  function nearbyAverage(x: number): number | null {
    if (points.length === 0) return null;
    const window = (xMax - xMin) * 0.04;
    let inWindow = points.filter((p) => Math.abs(p.x - x) <= window);
    if (inWindow.length < 3) {
      inWindow = [...points].sort((a, b) => Math.abs(a.x - x) - Math.abs(b.x - x)).slice(0, 5);
    }
    return inWindow.reduce((s, p) => s + p.y, 0) / inWindow.length;
  }

  function handleMouseMove(e: React.MouseEvent<SVGSVGElement>) {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const scaleX = WIDTH / rect.width;
    const px = (e.clientX - rect.left) * scaleX;
    if (px < MARGIN.left || px > WIDTH - MARGIN.right) {
      setHoverX(null);
      return;
    }
    setHoverX(Math.round(pxToX(px)));
  }

  function handleLookup(e: React.FormEvent) {
    e.preventDefault();
    const val = Number(lookupInput);
    if (Number.isFinite(val) && val > 0) {
      setPinnedX(Math.round(val));
    }
  }

  const activeX = hoverX ?? pinnedX;
  const activeReal = activeX !== null ? nearbyAverage(activeX) : null;
  const activePredicted = activeX !== null ? fit.predict(activeX) : null;

  const xTicks = niceTicks(xMin, xMax, 5);
  const yTicks = niceTicks(yMin, yMax, 5);

  return (
    <div className="w-full">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div className="flex gap-1 rounded-md bg-black/5 dark:bg-white/10 p-1">
          {(Object.keys(METRIC_LABELS) as LapMetric[]).map((m) => (
            <button
              key={m}
              onClick={() => setMetric(m)}
              className={`px-3 py-1.5 text-sm rounded transition ${
                metric === m
                  ? "bg-white dark:bg-black shadow font-medium"
                  : "text-gray-600 dark:text-gray-300 hover:text-black dark:hover:text-white"
              }`}
            >
              {METRIC_LABELS[m]}
            </button>
          ))}
        </div>

        <form onSubmit={handleLookup} className="flex items-center gap-2">
          <label className="text-sm text-gray-600 dark:text-gray-300">Your iRating</label>
          <input
            type="number"
            value={lookupInput}
            onChange={(e) => setLookupInput(e.target.value)}
            placeholder="e.g. 2450"
            className="w-28 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-black px-2 py-1 text-sm"
          />
          <button
            type="submit"
            className="rounded bg-emerald-600 hover:bg-emerald-700 text-white text-sm px-3 py-1.5"
          >
            Show my pace
          </button>
          {pinnedX !== null && (
            <button
              type="button"
              onClick={() => {
                setPinnedX(null);
                setLookupInput("");
              }}
              className="text-sm text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
            >
              clear
            </button>
          )}
        </form>
      </div>

      <div className="text-center text-sm text-gray-500 dark:text-gray-400 mb-1">
        {METRIC_LABELS[metric]}
        {carName ? ` — ${carName}` : ""} ({points.length} data points)
      </div>

      {points.length === 0 ? (
        <div className="flex items-center justify-center h-64 text-gray-400 text-sm border border-dashed rounded">
          No data ingested for this metric yet.
        </div>
      ) : (
        <svg
          ref={svgRef}
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="w-full h-auto select-none"
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoverX(null)}
        >
          {/* gridlines */}
          {yTicks.map((t, i) => (
            <g key={`y${i}`}>
              <line
                x1={MARGIN.left}
                x2={WIDTH - MARGIN.right}
                y1={yToPx(t)}
                y2={yToPx(t)}
                stroke="currentColor"
                strokeOpacity={0.1}
              />
              <text x={MARGIN.left - 8} y={yToPx(t) + 4} textAnchor="end" fontSize={11} fill="currentColor" opacity={0.7}>
                {formatLapTime(t)}
              </text>
            </g>
          ))}
          {xTicks.map((t, i) => (
            <g key={`x${i}`}>
              <line
                x1={xToPx(t)}
                x2={xToPx(t)}
                y1={MARGIN.top}
                y2={HEIGHT - MARGIN.bottom}
                stroke="currentColor"
                strokeOpacity={0.06}
              />
              <text
                x={xToPx(t)}
                y={HEIGHT - MARGIN.bottom + 18}
                textAnchor="middle"
                fontSize={11}
                fill="currentColor"
                opacity={0.7}
              >
                {Math.round(t)}
              </text>
            </g>
          ))}
          <text
            x={WIDTH / 2}
            y={HEIGHT - 6}
            textAnchor="middle"
            fontSize={12}
            fill="currentColor"
            opacity={0.8}
          >
            iRating
          </text>

          {/* scatter points */}
          {points.map((p, i) => (
            <circle key={i} cx={xToPx(p.x)} cy={yToPx(p.y)} r={2.6} fill="#ef4444" fillOpacity={0.55} />
          ))}

          {/* fitted curve */}
          <path d={curvePath} fill="none" stroke="#2563eb" strokeWidth={2} />

          {/* hover / pinned crosshair */}
          {activeX !== null && activeX >= xMin && activeX <= xMax && (
            <g>
              <line
                x1={xToPx(activeX)}
                x2={xToPx(activeX)}
                y1={MARGIN.top}
                y2={HEIGHT - MARGIN.bottom}
                stroke="currentColor"
                strokeOpacity={0.4}
                strokeDasharray="4 3"
              />
              {activePredicted !== null && (
                <circle cx={xToPx(activeX)} cy={yToPx(activePredicted)} r={4} fill="#2563eb" />
              )}
              {activeReal !== null && (
                <circle cx={xToPx(activeX)} cy={yToPx(activeReal)} r={4} fill="#ef4444" />
              )}
            </g>
          )}
        </svg>
      )}

      {activeX !== null && activePredicted !== null && (
        <div className="flex flex-wrap gap-3 justify-center mt-2 text-sm">
          <span className="rounded bg-gray-100 dark:bg-gray-800 px-2 py-1">
            iRating <strong>{activeX}</strong>
          </span>
          {activeReal !== null && (
            <span className="rounded bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 px-2 py-1">
              real avg time: <strong>{formatLapTime(activeReal)}</strong>
            </span>
          )}
          <span className="rounded bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-2 py-1">
            predicted: <strong>{formatLapTime(activePredicted)}</strong>
          </span>
        </div>
      )}
    </div>
  );
}
