/**
 * Responsive SVG parabola graph for y = ax² + bx + c.
 * Themed via design tokens (currentColor / text-primary / muted-foreground).
 * No external dependencies.
 */

interface Props {
  a: number;
  b: number;
  c: number;
}

function fmt(n: number): string {
  if (!Number.isFinite(n)) return "";
  if (Math.abs(n) < 1e-10) return "0";
  if (Number.isInteger(n) && Math.abs(n) < 1e6) return String(n);
  return parseFloat(n.toPrecision(4)).toString();
}

export function ParabolaGraph({ a, b, c }: Props) {
  if (a === 0) {
    return (
      <div className="mt-5 rounded-2xl border border-border/60 bg-secondary/20 p-6 text-center text-sm text-muted-foreground">
        With a = 0 this is a linear equation, not a quadratic — no parabola to graph.
      </div>
    );
  }

  const disc = b * b - 4 * a * c;
  const h = -b / (2 * a);
  const k = c - (b * b) / (4 * a);

  // Real roots (if any) for x-range framing.
  let roots: number[] = [];
  if (disc > 0) {
    const s = Math.sqrt(disc);
    roots = [(-b - s) / (2 * a), (-b + s) / (2 * a)];
  } else if (disc === 0) {
    roots = [h];
  }

  // Pick an x-range that shows vertex + roots with padding.
  const xs = [h, ...roots];
  let xMin = Math.min(...xs);
  let xMax = Math.max(...xs);
  const span = Math.max(xMax - xMin, 1);
  xMin -= span * 0.6 + 1;
  xMax += span * 0.6 + 1;

  // Sample points, then use their y-range for viewport.
  const N = 160;
  const pts: { x: number; y: number }[] = [];
  for (let i = 0; i <= N; i++) {
    const x = xMin + ((xMax - xMin) * i) / N;
    const y = a * x * x + b * x + c;
    pts.push({ x, y });
  }
  const ys = pts.map((p) => p.y);
  let yMin = Math.min(...ys, 0);
  let yMax = Math.max(...ys, 0);
  const yPad = Math.max((yMax - yMin) * 0.15, 1);
  yMin -= yPad;
  yMax += yPad;

  // Viewport
  const W = 600;
  const H = 360;
  const PAD = 32;
  const sx = (x: number) => PAD + ((x - xMin) / (xMax - xMin)) * (W - 2 * PAD);
  const sy = (y: number) => H - PAD - ((y - yMin) / (yMax - yMin)) * (H - 2 * PAD);

  const path = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${sx(p.x).toFixed(2)} ${sy(p.y).toFixed(2)}`).join(" ");

  const xAxisY = sy(0);
  const yAxisX = sx(0);
  const showXAxis = xAxisY >= PAD && xAxisY <= H - PAD;
  const showYAxis = yAxisX >= PAD && yAxisX <= W - PAD;

  return (
    <div className="mt-5 rounded-2xl border border-border/60 bg-secondary/10 p-3 sm:p-4">
      <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-[0.14em] text-muted-foreground">
        <span>Graph of y = ax² + bx + c</span>
        <span className="normal-case tracking-normal">
          Vertex ({fmt(h)}, {fmt(k)})
        </span>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="Parabola graph"
      >
        {/* Frame */}
        <rect x={PAD} y={PAD} width={W - 2 * PAD} height={H - 2 * PAD} className="fill-transparent stroke-border" strokeWidth={1} />

        {/* Axes */}
        {showXAxis && (
          <line x1={PAD} y1={xAxisY} x2={W - PAD} y2={xAxisY} className="stroke-muted-foreground/60" strokeWidth={1} />
        )}
        {showYAxis && (
          <line x1={yAxisX} y1={PAD} x2={yAxisX} y2={H - PAD} className="stroke-muted-foreground/60" strokeWidth={1} />
        )}

        {/* Axis of symmetry (dashed) */}
        <line
          x1={sx(h)}
          y1={PAD}
          x2={sx(h)}
          y2={H - PAD}
          className="stroke-primary/60"
          strokeWidth={1}
          strokeDasharray="4 4"
        />
        <text x={sx(h) + 6} y={PAD + 12} className="fill-primary" fontSize={11}>
          x = {fmt(h)}
        </text>

        {/* Parabola */}
        <path d={path} className="fill-none stroke-primary" strokeWidth={2.2} />

        {/* Roots */}
        {roots.map((r, i) => (
          <g key={i}>
            <circle cx={sx(r)} cy={sy(0)} r={4.5} className="fill-primary" />
            <text
              x={sx(r)}
              y={sy(0) + 18}
              textAnchor="middle"
              className="fill-foreground"
              fontSize={11}
            >
              x = {fmt(r)}
            </text>
          </g>
        ))}

        {/* Vertex */}
        <circle cx={sx(h)} cy={sy(k)} r={4.5} className="fill-foreground" />
        <text
          x={sx(h) + 8}
          y={sy(k) + (a > 0 ? 14 : -8)}
          className="fill-muted-foreground"
          fontSize={11}
        >
          vertex
        </text>
      </svg>
      {disc < 0 && (
        <p className="mt-2 text-center text-xs text-muted-foreground">
          Discriminant is negative — the parabola does not cross the x-axis, so the roots are complex.
        </p>
      )}
    </div>
  );
}
