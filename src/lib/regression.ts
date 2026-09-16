export interface Point {
  x: number;
  y: number;
}

export interface PowerFit {
  a: number;
  b: number;
  predict: (x: number) => number;
}

/**
 * Fits y = a * x^b via ordinary least squares on log(x)/log(y).
 * This matches the decaying "diminishing returns" shape of iRating vs
 * lap-time curves (higher iRating -> faster, flattening laps).
 * Falls back to a flat line at the mean y if there isn't enough usable data.
 */
export function fitPowerCurve(points: Point[]): PowerFit {
  const usable = points.filter((p) => p.x > 0 && p.y > 0);

  if (usable.length < 2) {
    const meanY = usable.length ? usable[0].y : 0;
    return { a: meanY, b: 0, predict: () => meanY };
  }

  const logX = usable.map((p) => Math.log(p.x));
  const logY = usable.map((p) => Math.log(p.y));

  const n = usable.length;
  const meanLogX = logX.reduce((s, v) => s + v, 0) / n;
  const meanLogY = logY.reduce((s, v) => s + v, 0) / n;

  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (logX[i] - meanLogX) * (logY[i] - meanLogY);
    den += (logX[i] - meanLogX) ** 2;
  }

  const b = den === 0 ? 0 : num / den;
  const logA = meanLogY - b * meanLogX;
  const a = Math.exp(logA);

  return {
    a,
    b,
    predict: (x: number) => a * Math.pow(x, b),
  };
}

/** Formats hundredths-of-a-millisecond-free ms lap time as m:ss.ttt */
export function formatLapTime(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return "-";
  const minutes = Math.floor(ms / 60000);
  const seconds = (ms % 60000) / 1000;
  return `${minutes}:${seconds.toFixed(3).padStart(6, "0")}`;
}
