import sys

def replace_star_polygon(content):
    import re
    # We match from case "starPolygon" to the closing brace of the case.
    # Note: the case ends with '    }' at the same indentation level as '    case'.
    # Actually, it ends with '    }' followed by '  }' (end of switch).
    pattern = r'    case "starPolygon": \{.*?    \}'
    new_case = r'''    case "starPolygon": {
      const nRaw = need("n");
      const R = need("R");
      const rIn = need("r");
      if (nRaw === null || R === null || rIn === null) return empty;
      const n = Math.floor(nRaw);
      if (n < 3) return { ...empty, error: "A star needs at least 3 points." };
      if (R <= 0 || rIn <= 0) return { ...empty, error: "Both radii must be positive." };
      if (rIn >= R) return { ...empty, error: "Inner radius must be smaller than outer radius." };
      const angle = Math.PI / n;
      const sinPiN = Math.sin(angle);
      const A = n * R * rIn * sinPiN;

      const edge = Math.sqrt(R * R + rIn * rIn - 2 * R * rIn * Math.cos(angle));
      const perimeter = 2 * n * edge;
      return {
        area: A,
        perimeter,
        steps: [
          step("Formula", <MathLine>A = n · R · r · sin(π / n)</MathLine>),
          step("Substitute", <MathLine>A = {n} · {R} · {rIn} · sin(π / {n})</MathLine>),
          step("Compute π / n", <MathLine>π / {n} ≈ {fmt(angle, 4)} rad</MathLine>),
          step(
            "Compute sin(π / n)",
            <MathLine>
              sin({fmt(angle, 4)}) ≈ {fmt(sinPiN, 4)}
            </MathLine>,
          ),
          step(
            "Multiply",
            <MathLine>
              A = {fmt(n * R * rIn)} · {fmt(sinPiN, 4)} = <strong>{fmt(A)}</strong>
            </MathLine>,
          ),
          step(
            "Final Area",
            <MathLine>
              A = <strong>{fmt(A)} {unit}²</strong>
            </MathLine>,
          ),
        ],
      };
    }'''
    return re.sub(pattern, new_case, content, flags=re.DOTALL)

def update_composite_builder(content):
    import re
    # We want to insert compositeSteps useMemo and StepsToggle.
    
    # 1. Insert compositeSteps before the return in CompositeBuilder
    memo_pattern = r'  const anyValid = results\.some\(\(\{ result \}\) => result\.area !== null\);'
    memo_replacement = r'''  const anyValid = results.some(({ result }) => result.area !== null);

  const compositeSteps = useMemo(() => {
    if (!anyValid) return [];
    const steps: Step[] = [];

    results.forEach(({ item, result }, i) => {
      if (result.area === null) return;
      
      const formulaStep = result.steps.find(s => s.title.toLowerCase().includes("formula"));
      const subStep = result.steps.find(s => s.title.toLowerCase().includes("substitute") || s.title.toLowerCase().includes("halve"));

      steps.push({
        title: `Component ${i + 1}: ${SHAPE_LABEL[item.shape]}`,
        body: (
          <div className="space-y-1">
            {formulaStep && (
              <>
                <MathNote>Formula:</MathNote>
                {formulaStep.body}
              </>
            )}
            {subStep && (
              <>
                <MathNote>Substitution:</MathNote>
                {subStep.body}
              </>
            )}
            <MathNote>Partial area:</MathNote>
            <MathLine>A_{i + 1} = <strong>{fmt(result.area)} {unit}²</strong></MathLine>
          </div>
        )
      });
    });

    const sumExpr = results
      .filter(r => r.result.area !== null)
      .map((_, i) => `A_{${i + 1}}`)
      .join(" + ");
    const sumVal = results
      .filter(r => r.result.area !== null)
      .map(r => fmt(r.result.area!))
      .join(" + ");

    steps.push({
      title: "Total Area",
      body: (
        <div className="space-y-1">
          <MathNote>Summing all components:</MathNote>
          <MathLine>A_{"total"} = {sumExpr}</MathLine>
          <MathLine>A_{"total"} = {sumVal} = <strong>{fmt(total)} {unit}²</strong></MathLine>
        </div>
      )
    });

    return steps;
  }, [results, anyValid, total, unit]);'''

    content = re.sub(memo_pattern, memo_replacement, content)
    
    # 2. Insert StepsToggle after the table in CompositeBuilder
    toggle_pattern = r'<\/div>\s+<\/div>\s+\)\;\s+\}'
    # Wait, there are multiple </div>. I need to find the right place.
    # It should be after the table's container div.
    
    # Looking at lines 2125-2127:
    # 2125:           </div>
    # 2126:         </div>
    # 2127:       )}
    
    content = content.replace(
        '          </div>\n        </div>\n      )}',
        '          </div>\n          <div className="mt-4 pt-4 border-t border-border/60">\n            <StepsToggle steps={compositeSteps} />\n          </div>\n        </div>\n      )}'
    )
    
    return content

with open('src/routes/calculators.math.area-calculator.tsx', 'r') as f:
    content = f.read()

content = replace_star_polygon(content)
content = update_composite_builder(content)

with open('src/routes/calculators.math.area-calculator.tsx', 'w') as f:
    f.write(content)
