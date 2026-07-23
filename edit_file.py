import sys

def edit():
    with open('src/routes/calculators.math.volume-calculator.tsx', 'r') as f:
        content = f.read()

    # 1. Add finalSteps useMemo in ShapeForm
    # Locate where massLb is defined
    mass_lb_def = "const massLb = massKg !== null ? massKg / KG_PER_LB : null;"
    if mass_lb_def in content:
        final_steps_code = """
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
        content = content.replace(mass_lb_def, mass_lb_def + final_steps_code)

    # 2. Update StepsToggle in ShapeForm
    content = content.replace("StepsToggle steps={result.steps}", "StepsToggle steps={finalSteps}")

    # 3. Add steps useMemo in CompositeBuilder
    any_valid_def = "const anyValid = results.some(({ result }) => result.volume !== null);"
    if any_valid_def in content:
        composite_steps_code = """
  const steps = useMemo(() => {
    if (!anyValid) return [];
    const s: Step[] = [];
    results.forEach(({ item, result }, i) => {
      if (result.volume === null) return;
      s.push({
        title: `Component ${i + 1}: ${SHAPE_LABEL[item.shape]}`,
        body: (
          <div className="space-y-4">
            {result.steps.map((st, si) => (
              <div key={si}>
                <div className="mb-1 text-xs font-semibold opacity-70">
                  {st.title}
                </div>
                {st.body}
              </div>
            ))}
            <div className="border-t border-border/40 pt-2">
              <MathNote>
                Partial volume V{i + 1} = <strong>{fmt(result.volume)}</strong>
              </MathNote>
            </div>
          </div>
        ),
      });
    });
    s.push({
      title: "Total Composite Volume",
      body: (
        <>
          <MathNote>The total volume is the sum of all components:</MathNote>
          <MathLine>V_total = Σ V_i</MathLine>
          <MathLine>
            V_total ={" "}
            {results
              .filter((r) => r.result.volume !== null)
              .map((_, i) => `V${i + 1}`)
              .join(" + ")}
          </MathLine>
          <MathLine>
            V_total ={" "}
            {results
              .filter((r) => r.result.volume !== null)
              .map((r) => fmt(r.result.volume!))
              .join(" + ")}
          </MathLine>
          <MathLine>
            V_total = <strong>{fmt(total, 6)}</strong>
          </MathLine>
        </>
      ),
    });
    return s;
  }, [results, anyValid, total]);
"""
        content = content.replace(any_valid_def, any_valid_def + composite_steps_code)

    # 4. Add StepsToggle in CompositeBuilder
    # I'll look for the end of the combined total volume section (the table or the div)
    table_end = "</table>\n          </div>\n        </div>"
    if table_end in content:
        content = content.replace(table_end, table_end + '\n          <div className="mt-4 border-t border-border/40 pt-4">\n            <StepsToggle steps={steps} />\n          </div>')

    with open('src/routes/calculators.math.volume-calculator.tsx', 'w') as f:
        f.write(content)

if __name__ == '__main__':
    edit()
