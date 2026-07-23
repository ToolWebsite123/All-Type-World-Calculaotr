import sys

def fix():
    with open('src/routes/calculators.math.volume-calculator.tsx', 'r') as f:
        content = f.read()

    # Part 1: Fix PartialFillTool - it was accidentally using finalSteps instead of its own result.steps
    content = content.replace('<StepsToggle steps={finalSteps} />', '<StepsToggle steps={result.steps} />', 1)

    # Part 2: Remove the duplicate finalSteps in ShapeForm
    # We'll look for the whole duplicated block and remove it.
    duplicate_block = """
  const finalSteps = useMemo(() => {
    const steps = [...result.steps];

    if (result.volume !== null && result.volume > 0 && result.surface !== null) {
      steps.push({
        title: "Surface-to-volume ratio",
        body: (
          <>
            <MathNote>
              The surface-to-volume ratio (SA/V) is the amount of surface area per
              unit of volume.
            </MathNote>
            <MathLine>Ratio = SA / V</MathLine>
            <MathLine>
              Ratio = {fmt(result.surface)} / {fmt(result.volume)} ={" "}
              <strong>{fmt(result.surface / result.volume, 6)}</strong>
            </MathLine>
          </>
        ),
      });
    }

    if (massKg !== null && density !== null && volumeM3 !== null) {
      const mat = MATERIAL_DENSITIES.find((m) => m.key === material);
      steps.push({
        title: "Material weight estimator",
        body: (
          <>
            <MathNote>1. Find material density (ρ):</MathNote>
            <MathLine>
              ρ = {fmt(density)} kg/m³ {mat ? `(${mat.label})` : ""}
            </MathLine>
            <MathNote>2. Convert volume (V) to cubic meters (m³):</MathNote>
            {unit === "m" ? (
              <MathLine>V = {fmt(result.volume!)} m³</MathLine>
            ) : (
              <MathLine>
                V = {fmt(result.volume!)} {unit}³ × {fmt(TO_M3[unit] ?? 1)} ={" "}
                {fmt(volumeM3)} m³
              </MathLine>
            )}
            <MathNote>3. Calculate mass (W = V × ρ):</MathNote>
            <MathLine>
              W = {fmt(volumeM3)} × {fmt(density)} = <strong>{fmt(massKg, 3)} kg</strong>
            </MathLine>
            <MathNote>4. Convert to pounds (1 kg ≈ 2.2046 lb):</MathNote>
            <MathLine>
              {fmt(massKg, 3)} kg × 2.20462 ≈ <strong>{fmt(massLb!, 3)} lb</strong>
            </MathLine>
          </>
        ),
      });
    }

    return steps;
  }, [result.steps, result.volume, result.surface, massKg, density, volumeM3, unit, material, massLb]);
"""
    # content.count(duplicate_block) should be 2 if I made two identical ones
    content = content.replace(duplicate_block, "", 1) # remove the first one to be safe, since the second one is used by ShapeForm

    with open('src/routes/calculators.math.volume-calculator.tsx', 'w') as f:
        f.write(content)

if __name__ == '__main__':
    fix()
