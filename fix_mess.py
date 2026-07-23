import sys

with open('src/routes/calculators.math.area-calculator.tsx', 'r') as f:
    lines = f.readlines()

# 1. Recover the original starPolygon case in ShapeDiagram (around line 1840)
# We know it starts at line 1840.
# The original code was:
original_diagram_case = '''    case "starPolygon": {
      const nRaw = num(inputs.n ?? "");
      const Rraw = num(inputs.R ?? "");
      const rRaw = num(inputs.r ?? "");
      const n = nRaw && nRaw >= 3 ? Math.floor(nRaw) : 5;
      const Rv = Rraw && Rraw > 0 ? Rraw : 10;
      const rV = rRaw && rRaw > 0 && rRaw < Rv ? rRaw : Rv * 0.4;
      const cx = 150;
      const cy = 105;
      const scale = 75 / Rv;
      const Rs = Rv * scale;
      const rs = rV * scale;
      const pts: string[] = [];
      for (let i = 0; i < 2 * n; i++) {
        const ang = -Math.PI / 2 + (i * Math.PI) / n;
        const R2 = i % 2 === 0 ? Rs : rs;
        pts.push(`${cx + R2 * Math.cos(ang)},${cy + R2 * Math.sin(ang)}`);
      }
      const tipAng = -Math.PI / 2;
      const notchAng = -Math.PI / 2 + Math.PI / n;
      return wrap(
        <>
          <polygon points={pts.join(" ")} />
          <line
            x1={cx}
            y1={cy}
            x2={cx + Rs * Math.cos(tipAng)}
            y2={cy + Rs * Math.sin(tipAng)}
            strokeDasharray="4 3"
            strokeOpacity={0.6}
          />
          <line
            x1={cx}
            y1={cy}
            x2={cx + rs * Math.cos(notchAng)}
            y2={cy + rs * Math.sin(notchAng)}
            strokeDasharray="4 3"
            strokeOpacity={0.6}
          />
          <circle cx={cx} cy={cy} r={2} fill={stroke} fillOpacity={1} />
          <text x={cx + 4} y={cy + Rs / 2} className={label}>R</text>
          <text x={cx + rs * Math.cos(notchAng) + 4} y={cy + rs * Math.sin(notchAng) + 10} className={label}>r</text>
          <text x={cx} y={cy + Rs + 14} textAnchor="middle" className={label}>n = {n}</text>
        </>,
      );
    }
'''

# Find the start and end of the corrupted block in ShapeDiagram.
# It starts at case "starPolygon" (around 1840) and ends just before Composite Shape Builder (around 1914).
start_idx = -1
end_idx = -1
for i, line in enumerate(lines):
    if 'case "starPolygon": {' in line and i > 1500: # Ensure we are in ShapeDiagram
        start_idx = i
    if '/* ================= Composite Shape Builder ================= */' in line:
        end_idx = i
        break

if start_idx != -1 and end_idx != -1:
    # We want to keep the closing braces of ShapeDiagram and switch.
    # The corrupted block ends with } } } \n.
    # Let's replace everything from start_idx to end_idx - 1 with the fixed code.
    # But wait, end_idx is the start of the next section. 
    # The ShapeDiagram function ends before that.
    
    new_lines = lines[:start_idx] + [original_diagram_case] + ["  }\n}\n\n"] + lines[end_idx:]
    with open('src/routes/calculators.math.area-calculator.tsx', 'w') as f:
        f.writelines(new_lines)
else:
    print(f"Error: indices not found {start_idx} {end_idx}")
