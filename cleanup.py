import sys

def cleanup():
    with open('src/routes/calculators.math.volume-calculator.tsx', 'r') as f:
        lines = f.readlines()

    # 1. Remove duplicate finalSteps in ShapeForm
    # We find the first occurrence and keep it, remove the second.
    # The second one starts at line 512 (1-based index 511 in 0-based)
    # Actually, I'll just look for the block.
    
    new_lines = []
    skip_until = -1
    for i, line in enumerate(lines):
        if i <= skip_until:
            continue
            
        # Detect the second finalSteps block and skip it
        if "const finalSteps = useMemo(() => {" in line and i > 500 and i < 600:
             # Check if we already have one
             found_prev = False
             for prev_line in lines[450:i]:
                 if "const finalSteps = useMemo(() => {" in prev_line:
                     found_prev = True
                     break
             if found_prev:
                 # Skip this block
                 j = i
                 while j < len(lines) and "}, [result.steps, result.volume" not in lines[j]:
                     j += 1
                 skip_until = j
                 continue
        
        # Detect the accidental steps insertion in EDUCATION array
        if "const steps = useMemo(() => {" in line and i > 1900 and i < 2100:
            # We want to keep the one inside CompositeBuilder, but remove the one in EDUCATION
            # EDUCATION ends around line 2070. CompositeBuilder starts around 2092.
            # If we are inside an object (indicated by 'key: "octahedron"')
            is_accidental = False
            for k in range(max(0, i-10), i):
                if 'key: "octahedron"' in lines[k]:
                    is_accidental = True
                    break
            if is_accidental:
                j = i
                while j < len(lines) and "}, [results, anyValid, total]);" not in lines[j]:
                    j += 1
                skip_until = j
                continue

        new_lines.append(line)

    with open('src/routes/calculators.math.volume-calculator.tsx', 'w') as f:
        f.writelines(new_lines)

if __name__ == '__main__':
    cleanup()
