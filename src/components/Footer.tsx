import { Link } from "@tanstack/react-router";

const categoryLinks = [
  { label: "Math", to: "/calculators/math" },
  { label: "Finance", to: "/calculators/finance" },
  { label: "Health & Fitness", to: "/calculators/health" },
  { label: "Unit Converters", to: "/calculators/unit-converters" },
  { label: "Date & Time", to: "/calculators/date-time" },
  { label: "Education", to: "/calculators/education" },
] as const;

const popularLinks = [
  { label: "Scientific Calculator", to: "/calculators/math/scientific-calculator" },
  { label: "Percentage Calculator", to: "/calculators/math/percentage-calculator" },
  { label: "Fraction Calculator", to: "/calculators/math/fraction-calculator" },
  { label: "Standard Deviation Calculator", to: "/calculators/math/standard-deviation-calculator" },
  { label: "Z-Score Calculator", to: "/calculators/math/z-score-calculator" },
  { label: "Quadratic Formula Calculator", to: "/calculators/math/quadratic-formula-calculator" },
  { label: "Statistics Calculator", to: "/calculators/math/statistics-calculator" },
  { label: "Probability Calculator", to: "/calculators/math/probability-calculator" },
] as const;

export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-24 border-t border-border/60">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:grid-cols-4">
          <div className="col-span-2 sm:col-span-1">
            <h3 className="mb-3 text-sm font-semibold text-foreground">All Type Calculator</h3>
            <p className="text-sm leading-relaxed text-muted-foreground">
              A free, ad-free hub of calculators for math, finance, health, unit conversion, date & time and education.
            </p>
          </div>
          <div>
            <h3 className="mb-3 text-sm font-semibold text-foreground">Categories</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {categoryLinks.map((l) => (
                <li key={l.to}>
                  <Link to={l.to} className="transition-colors hover:text-foreground">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div className="col-span-2 sm:col-span-1 lg:col-span-2">
            <h3 className="mb-3 text-sm font-semibold text-foreground">Popular Calculators</h3>
            <ul className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm text-muted-foreground sm:grid-cols-2">
              {popularLinks.map((l) => (
                <li key={l.to}>
                  <Link to={l.to} className="transition-colors hover:text-foreground">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-4 border-t border-border/60 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            © {year} All Type Calculator. All rights reserved.
          </p>
          <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
            <Link to="/about" className="transition-colors hover:text-foreground">About</Link>
            <Link to="/privacy" className="transition-colors hover:text-foreground">Privacy Policy</Link>
            <Link to="/terms" className="transition-colors hover:text-foreground">Terms</Link>
            <Link to="/contact" className="transition-colors hover:text-foreground">Contact</Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
