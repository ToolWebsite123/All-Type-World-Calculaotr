import sys

def fix():
    with open('src/routes/calculators.math.volume-calculator.tsx', 'r') as f:
        lines = f.readlines()

    new_lines = []
    i = 0
    while i < len(lines):
        line = lines[i]
        # Look for the misplaced StepsToggle block
        if '</div>' in line and i + 1 < len(lines) and '<div className="mt-4 border-t border-border/40 pt-4">' in lines[i+1]:
            # This is the end of the results div followed by our StepsToggle div
            # We want to move the StepsToggle div inside the results div
            
            # Find the end of the StepsToggle div
            j = i + 1
            while j < len(lines) and '</div>' not in lines[j]:
                j += 1
            
            steps_block = lines[i+1 : j+1]
            new_lines.append(line.replace('</div>', '')) # Remove the closing div temporarily
            new_lines.extend(steps_block)
            new_lines.append('        </div>\n') # Close the results div
            i = j + 1
            continue
        
        new_lines.append(line)
        i += 1

    with open('src/routes/calculators.math.volume-calculator.tsx', 'w') as f:
        f.writelines(new_lines)

if __name__ == '__main__':
    fix()
