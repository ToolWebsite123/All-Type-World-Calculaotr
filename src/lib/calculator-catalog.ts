import type { LucideIcon } from "lucide-react";
import {
  // math
  Divide, Percent, Sigma, Shapes, FunctionSquare, PieChart, Hash, Ruler as RulerIcon,
  Scale as ScaleIcon, Radical, SquareStack, Superscript, GitCompareArrows, Dices,
  // finance
  TrendingUp, Home as HomeIcon, PiggyBank, Landmark, Wallet, ReceiptText,
  // health
  Activity, Flame, Scale, Dumbbell, HeartPulse, Salad,
  // units
  Ruler, Weight, Thermometer, Beaker, Timer, Zap,
  // date-time
  CalendarClock, CalendarDays, Clock, CalendarRange, Hourglass, Sunrise,
  // education
  GraduationCap, BookOpen, Trophy, Calculator as CalcIcon, ScrollText, School,
} from "lucide-react";

export interface CalculatorItem {
  name: string;
  description: string;
  icon: LucideIcon;
  slug: string;
  /** Route path if implemented; when omitted the card renders as "Coming soon". */
  href?: string;
}

export interface CategorySection {
  title: string;
  items: CalculatorItem[];
}

export interface CategoryDefinition {
  slug: string;
  name: string;
  sections: CategorySection[];
}

/** Not linked yet — this phase is layout only. Cards render as "Coming soon". */
export const CATEGORIES: Record<string, CategoryDefinition> = {
  math: {
    slug: "math",
    name: "Math",
    sections: [
      {
        title: "Core Math",
        items: [
          { name: "Scientific Calculator", description: "Trig, logs, exponents, roots and memory — degrees or radians.", icon: FunctionSquare, slug: "scientific", href: "/calculators/math/scientific-calculator" },
          { name: "Fraction Calculator", description: "Add, subtract, multiply and divide fractions with mixed numbers.", icon: Divide, slug: "fraction", href: "/calculators/math/fraction-calculator" },
          { name: "Long Division Calculator", description: "Divide two whole numbers step by step with the classic bring-down layout, with optional decimal quotient.", icon: Divide, slug: "long-division", href: "/calculators/math/long-division-calculator" },
          { name: "Percentage Calculator", description: "Percent of a number, percent change, and what percent one is of another.", icon: Percent, slug: "percentage", href: "/calculators/math/percentage-calculator" },
          { name: "Exponent Calculator", description: "Raise any number to a power — integer, negative or fractional.", icon: Superscript, slug: "exponent", href: "/calculators/math/exponent-calculator" },
          { name: "Log Calculator", description: "Solve log_b(x) = y for any missing value — supports base 10, e (ln) and any base.", icon: FunctionSquare, slug: "log", href: "/calculators/math/log-calculator" },
          { name: "Ratio Calculator", description: "Simplify ratios and solve for a missing value in a proportion.", icon: GitCompareArrows, slug: "ratio", href: "/calculators/math/ratio-calculator" },
          { name: "Root Calculator", description: "Square, cube and nth roots of any real number.", icon: Radical, slug: "root", href: "/calculators/math/root-calculator" },
          { name: "Rounding Calculator", description: "Round to decimal places or significant figures with the rule shown.", icon: ScaleIcon, slug: "rounding", href: "/calculators/math/rounding-calculator" },
          { name: "Quadratic Formula Calculator", description: "Solve ax² + bx + c = 0 — real, repeated or complex roots.", icon: FunctionSquare, slug: "quadratic-formula", href: "/calculators/math/quadratic-formula-calculator" },
          { name: "Polynomial Calculator", description: "Add, subtract, multiply and divide polynomials with step-by-step working.", icon: FunctionSquare, slug: "polynomial", href: "/calculators/math/polynomial-calculator" },
          { name: "Simultaneous Equations Solver", description: "Solve two linear equations in two unknowns with elimination and step-by-step working.", icon: FunctionSquare, slug: "simultaneous-equations", href: "/calculators/math/simultaneous-equations-calculator" },
          { name: "LCM Calculator", description: "Least common multiple of two or more whole numbers.", icon: SquareStack, slug: "lcm", href: "/calculators/math/lcm-calculator" },
          { name: "GCF Calculator", description: "Greatest common factor of two or more whole numbers.", icon: Hash, slug: "gcf", href: "/calculators/math/gcf-calculator" },
          { name: "Factor Calculator", description: "List every factor, factor pairs, prime factorization and a visual factor tree.", icon: Hash, slug: "factor", href: "/calculators/math/factor-calculator" },
          { name: "Random Number Generator", description: "Generate random integers or decimals between any two limits.", icon: Dices, slug: "random-number", href: "/calculators/math/random-number-calculator" },
          { name: "Binary Calculator", description: "Add, subtract, multiply, divide binary numbers and convert to/from decimal.", icon: Hash, slug: "binary", href: "/calculators/math/binary-calculator" },
          { name: "Hex Calculator", description: "Add, subtract, multiply, divide hex values and convert to/from decimal.", icon: Hash, slug: "hex", href: "/calculators/math/hex-calculator" },
          { name: "Number Base Converter", description: "Convert between binary, octal, decimal and hexadecimal in one step.", icon: GitCompareArrows, slug: "number-base", href: "/calculators/math/number-base-calculator" },
          { name: "Percent Error Calculator", description: "Compare a measured value to a true value and get the percent error.", icon: Percent, slug: "percent-error", href: "/calculators/math/percent-error-calculator" },
          { name: "Scientific Notation Calculator", description: "Convert numbers to scientific notation and compute with them.", icon: Superscript, slug: "scientific-notation", href: "/calculators/math/scientific-notation-calculator" },
          { name: "Half-Life Calculator", description: "Solve exponential decay for half-life, mean lifetime or decay constant.", icon: Hourglass, slug: "half-life", href: "/calculators/math/half-life-calculator" },
          { name: "Big Number Calculator", description: "Arbitrary-precision arithmetic on huge integers, decimals and E-notation values.", icon: Hash, slug: "big-number", href: "/calculators/math/big-number-calculator" },
          { name: "Matrix Calculator", description: "Add, subtract, multiply, transpose, power, determinant and inverse of matrices up to 6×6.", icon: SquareStack, slug: "matrix", href: "/calculators/math/matrix-calculator" },
          { name: "Prime Number Checker", description: "Check if a number is prime and list all primes in any range.", icon: Hash, slug: "prime-checker", href: "/calculators/math/prime-checker-calculator" },
          { name: "Modulo Calculator", description: "Compute a mod b with quotient, remainder and sign convention explained.", icon: Percent, slug: "modulo", href: "/calculators/math/modulo-calculator" },
          { name: "Simplify Radical Calculator", description: "Simplify square roots and nth roots into exact radical form using prime factorization.", icon: Radical, slug: "simplify-radical", href: "/calculators/math/simplify-radical-calculator" },
          { name: "Complex Number Calculator", description: "Add, subtract, multiply and divide complex numbers with modulus, argument and steps.", icon: FunctionSquare, slug: "complex-number", href: "/calculators/math/complex-number-calculator" },
          { name: "Inequality Solver", description: "Solve linear inequalities in x with step-by-step working, interval form and a number-line visual.", icon: FunctionSquare, slug: "inequality", href: "/calculators/math/inequality-calculator" },
          { name: "Vector Calculator", description: "Add, subtract, dot and cross product for 2D and 3D vectors, with magnitude and full steps.", icon: FunctionSquare, slug: "vector", href: "/calculators/math/vector-calculator" },
          { name: "Set Calculator", description: "Union, intersection, difference and symmetric difference of two sets with a Venn diagram.", icon: SquareStack, slug: "set", href: "/calculators/math/set-calculator" },
          { name: "Derivative Calculator", description: "Differentiate a polynomial in x term by term using the power rule, with full steps and optional evaluation at a point.", icon: FunctionSquare, slug: "derivative", href: "/calculators/math/derivative-calculator" },
          { name: "Sequence & Series Calculator", description: "Arithmetic and geometric sequences — nth term, sum of the first n terms, and sum to infinity when it converges.", icon: SquareStack, slug: "sequence", href: "/calculators/math/sequence-calculator" },
          { name: "Absolute Value Equation Calculator", description: "Solve |mx + b| = c by splitting into two cases, with steps and a number-line visual of the two solutions.", icon: FunctionSquare, slug: "absolute-value", href: "/calculators/math/absolute-value-calculator" },
          { name: "Unit Circle Calculator", description: "Sin, cos and tan of any angle in degrees or radians — with exact radical values, a labelled unit circle diagram and a reference table.", icon: PieChart, slug: "unit-circle", href: "/calculators/math/unit-circle-calculator" },
          { name: "Combinations Counter", description: "Count arrangements with the right formula — permutations, combinations, with or without repetition — from n items into r slots.", icon: SquareStack, slug: "combinations-counter", href: "/calculators/math/combinations-counter-calculator" },
          { name: "Interpolation Calculator", description: "Estimate an unknown y value between two known points using linear interpolation, with slope steps and a visual of the line and target point.", icon: FunctionSquare, slug: "interpolation", href: "/calculators/math/interpolation-calculator" },
          { name: "Slope-Intercept Form Calculator", description: "Find the equation of a line through two points in slope-intercept form y = mx + b, plus point-slope and standard form, with a graph and full working.", icon: FunctionSquare, slug: "slope-intercept", href: "/calculators/math/slope-intercept-calculator" },
          { name: "Number Line Distance Calculator", description: "Find the distance between two numbers on a number line using |a − b| — accepts integers, decimals and fractions, with a visual number line.", icon: RulerIcon, slug: "number-line-distance", href: "/calculators/math/number-line-distance-calculator" },
          { name: "Multiplicative Inverse Calculator", description: "Find the reciprocal of a number, fraction or matrix — with step-by-step working and the determinant/adjugate method for 2×2 and 3×3 matrices.", icon: Divide, slug: "multiplicative-inverse", href: "/calculators/math/multiplicative-inverse-calculator" },
          { name: "Permutation and Combination Calculator", description: "Compute nPr and nCr side by side with the formula substituted, plus an optional 'allow repetition' toggle for n^r and (n+r−1)Cr.", icon: SquareStack, slug: "permutation-combination", href: "/calculators/math/permutation-combination-calculator" },
        ],
      },
      {
        title: "Statistics",
        items: [
          { name: "Mean, Median, Mode, Range Calculator", description: "Mean, median, mode, range, geometric mean and more from any list of numbers — with a labeled bar chart.", icon: Sigma, slug: "mean-median-mode", href: "/calculators/math/mean-median-mode-calculator" },
          { name: "Weighted Mean Calculator", description: "Compute a weighted average of value/weight pairs, with steps, a comparison to the simple mean and a diagram of each weight's contribution.", icon: Sigma, slug: "weighted-mean", href: "/calculators/math/weighted-mean-calculator" },
          { name: "Standard Deviation Calculator", description: "Population and sample standard deviation with variance, frequency table, confidence intervals and step-by-step working.", icon: PieChart, slug: "standard-deviation", href: "/calculators/math/standard-deviation-calculator" },
          { name: "Mean Absolute Deviation Calculator", description: "MAD with a transparent per-value deviation table and a number-line diagram showing each point's distance from the mean — plus MAD vs standard deviation explained and show/hide step-by-step working.", icon: Sigma, slug: "mean-absolute-deviation", href: "/calculators/math/mean-absolute-deviation-calculator" },
          { name: "Sample Size Calculator", description: "Find the sample size for a survey — or the margin of error for a given sample — with confidence level, population proportion and finite-population correction.", icon: Sigma, slug: "sample-size", href: "/calculators/math/sample-size-calculator" },
          { name: "Number Sequence Calculator", description: "Arithmetic, geometric and Fibonacci sequences on one page — nth term, sum, full term list and a small line plot of the first terms.", icon: SquareStack, slug: "number-sequence", href: "/calculators/math/number-sequence-calculator" },
          { name: "Statistics Calculator", description: "All standard summary statistics in one place — count, sum, mean, median, mode, range, geometric mean, plus population and sample variance and standard deviation, with a bar chart and mean/median overlay.", icon: PieChart, slug: "statistics", href: "/calculators/math/statistics-calculator" },
          { name: "Probability Calculator", description: "Two-event probabilities, solver for unknowns, series of independent events, and normal-distribution probability with a shaded bell curve.", icon: Sigma, slug: "probability", href: "/calculators/math/probability-calculator" },
          { name: "Bayes' Theorem Calculator", description: "Compute posterior probability P(A|B) from a prior, likelihood and false-positive rate — with a natural-frequency population grid, medical-test preset and full step-by-step working.", icon: Sigma, slug: "bayes-theorem", href: "/calculators/math/bayes-theorem-calculator" },
          { name: "A/B Test Significance Calculator", description: "Two-proportion z-test for A/B tests: control vs. variant conversion rates, relative uplift, p-value, and a bar chart with 95% confidence intervals so you can see interval overlap at a glance. Selectable 90/95/99% confidence and full step-by-step working.", icon: Sigma, slug: "ab-test", href: "/calculators/math/ab-test-calculator" },
          { name: "Z-score Calculator", description: "Convert between raw scores, Z-scores and normal probabilities — with a live standard-normal CDF, bell-curve visuals and a two-Z-score area tool that replaces static Z-tables.", icon: Sigma, slug: "z-score", href: "/calculators/math/z-score-calculator" },
          { name: "Confidence Interval Calculator", description: "Confidence interval for the population mean with margin of error — auto-switches to the Student t-distribution for small samples (n < 30), with an error-bar visual and step-by-step working.", icon: Sigma, slug: "confidence-interval", href: "/calculators/math/confidence-interval-calculator" },
          { name: "Correlation Coefficient Calculator", description: "Pearson's r from two paired data sets, with plain-language strength, a scatter plot with best-fit trend line and full step-by-step working.", icon: GitCompareArrows, slug: "correlation", href: "/calculators/math/correlation-calculator" },
          { name: "Spearman's Rank Correlation Calculator", description: "Spearman's ρ from two paired data sets with correct tie-adjusted (average) ranks — Pearson-on-ranks method so results stay right when ties are present. Full ranking table, rank-vs-rank scatter plot with best-fit line and show/hide step-by-step working.", icon: GitCompareArrows, slug: "spearman-correlation", href: "/calculators/math/spearman-correlation-calculator" },
          { name: "Sensitivity & Specificity Calculator", description: "Full diagnostic-test 2×2 calculator: sensitivity, specificity, PPV, NPV, accuracy and likelihood ratios (LR+, LR−) with a color-coded TP/FP/FN/TN table, Bayes-based PPV/NPV recomputation at any disease prevalence and show/hide step-by-step working.", icon: Sigma, slug: "sensitivity-specificity", href: "/calculators/math/sensitivity-specificity-calculator" },
          { name: "Covariance Calculator", description: "Sample and population covariance from two paired data sets, with correlation r reported alongside, a quadrant-shaded scatter plot showing which points push cov up or down, and full step-by-step working.", icon: GitCompareArrows, slug: "covariance", href: "/calculators/math/covariance-calculator" },
          { name: "Linear Regression Calculator", description: "Least-squares regression line y = m·x + b with slope, intercept, r, R², a scatter plot with the fitted line and residuals, and predictions for any X.", icon: TrendingUp, slug: "linear-regression", href: "/calculators/math/linear-regression-calculator" },
          { name: "Multiple Regression Calculator", description: "Multiple linear regression with any number of predictors — per-coefficient standard errors, t-statistics and p-values, R² and Adjusted R², overall F-test, a standardised-coefficient bar chart and a residuals-vs-predicted diagnostic plot. Powered by matrix algebra (β = (XᵀX)⁻¹Xᵀy) with show/hide step-by-step working.", icon: TrendingUp, slug: "multiple-regression", href: "/calculators/math/multiple-regression-calculator" },
          { name: "Percentile & Quartile Calculator", description: "Compute quartiles (Q1, Q2, Q3) and IQR, or find any percentile of a data set using linear interpolation, with a box-plot visual and automatic outlier flagging.", icon: Sigma, slug: "percentile", href: "/calculators/math/percentile-calculator" },
          { name: "Five Number Summary Calculator", description: "Minimum, Q1, median, Q3 and maximum from any list of numbers — with IQR, a labeled box plot and show/hide step-by-step working. Uses the exclusive quartile method so numbers match the Percentile & Quartile Calculator.", icon: Sigma, slug: "five-number-summary", href: "/calculators/math/five-number-summary-calculator" },
          { name: "Outlier Detector", description: "Find outliers in a data set using Tukey's 1.5×IQR rule — separates mild and extreme (3×IQR) outliers, with a box plot and step-by-step working.", icon: Sigma, slug: "outliers", href: "/calculators/math/outliers-calculator" },
          { name: "Coefficient of Variation Calculator", description: "CV (σ / mean × 100%) for a single dataset or side-by-side for two datasets on different scales, with population/sample toggle, comparison bar chart and step-by-step working.", icon: Sigma, slug: "coefficient-of-variation", href: "/calculators/math/coefficient-of-variation-calculator" },
          { name: "Skewness & Kurtosis Calculator", description: "Sample skewness (G₁) and sample excess kurtosis (G₂) with plain-language classification, a histogram plus distribution-shape overlay and full step-by-step working.", icon: Sigma, slug: "skewness-kurtosis", href: "/calculators/math/skewness-kurtosis-calculator" },
          { name: "T-Test Calculator", description: "One-sample, two-sample independent (Student's or Welch's) and paired t-tests from raw data or summary stats — with exact p-values from the t-distribution, a shaded rejection-region diagram and full step-by-step working.", icon: Sigma, slug: "t-test", href: "/calculators/math/t-test-calculator" },
          { name: "P-Value Calculator", description: "Convert any Z, T, chi-square or F test statistic into an exact p-value — with one- or two-tailed support, a shaded distribution diagram and a plain-language significance verdict at your chosen α.", icon: Sigma, slug: "p-value", href: "/calculators/math/p-value-calculator" },
          { name: "Chi-Square Calculator", description: "Chi-square goodness-of-fit test and test of independence on an editable contingency table — with expected frequencies, exact p-values, critical values and a plain-language reject / fail-to-reject verdict.", icon: Sigma, slug: "chi-square", href: "/calculators/math/chi-square-calculator" },
          { name: "ANOVA Calculator", description: "One-way ANOVA on 3+ groups of raw data — full summary table (SS, df, MS, F, p), exact p-value from the F-distribution, shaded F-curve diagram, α-based verdict and a post-hoc note when the result is significant.", icon: Sigma, slug: "anova", href: "/calculators/math/anova-calculator" },
          { name: "F-Test Calculator", description: "Two-sample F-test for equal variances — from raw data or summary stats (s², n). Get F = larger/smaller variance, degrees of freedom, exact F-distribution p-value, critical value, shaded F-curve diagram and a plain-language reject / fail-to-reject verdict.", icon: Sigma, slug: "f-test", href: "/calculators/math/f-test-calculator" },
          { name: "Critical Value Calculator", description: "Find critical values for Z, t, χ² and F distributions at any α, with left / right / two-tailed support. Shows both cutoffs for two-tailed tests, a shaded rejection-region diagram and links to the matching hypothesis-test calculators.", icon: Sigma, slug: "critical-value", href: "/calculators/math/critical-value-calculator" },
          { name: "Margin of Error Calculator", description: "Margin of error for a proportion (survey / poll) and for a mean — with confidence level, optional finite-population correction, auto Z/t switch, ± result, full confidence interval and a shaded normal-curve diagram.", icon: Sigma, slug: "margin-of-error", href: "/calculators/math/margin-of-error-calculator" },
          { name: "Standard Error Calculator", description: "Standard error of the mean (s/√n), of a proportion (√(p(1−p)/n)) and of the difference between two independent means — with a sampling-distribution diagram and show/hide step-by-step working.", icon: Sigma, slug: "standard-error", href: "/calculators/math/standard-error-calculator" },
          { name: "Degrees of Freedom Calculator", description: "df for one-sample, pooled and Welch's t-tests, paired t-tests, chi-square goodness-of-fit and independence, one-way ANOVA and simple linear regression — with a t-distribution diagram and show/hide step-by-step working.", icon: Sigma, slug: "degrees-of-freedom", href: "/calculators/math/degrees-of-freedom-calculator" },
          { name: "Binomial Distribution Calculator", description: "Exact binomial probabilities — P(X = k), P(X ≤ k), P(X < k), P(X ≥ k), P(X > k) — plus mean, variance and standard deviation, with a full probability bar chart across 0..n and show/hide step-by-step working.", icon: Sigma, slug: "binomial-distribution", href: "/calculators/math/binomial-distribution-calculator" },
          { name: "Poisson Distribution Calculator", description: "Exact Poisson probabilities from an average rate λ — P(X = k), P(X ≤ k), P(X < k), P(X ≥ k), P(X > k) — with mean, variance, standard deviation, a probability bar chart over the meaningful range of k and show/hide step-by-step working.", icon: Sigma, slug: "poisson-distribution", href: "/calculators/math/poisson-distribution-calculator" },
          { name: "Empirical Rule Calculator", description: "68-95-99.7 rule for any normal distribution — enter the mean and standard deviation to get the μ±1σ, μ±2σ and μ±3σ ranges with a shaded bell-curve diagram, optional value-in-band check and show/hide step-by-step working.", icon: Sigma, slug: "empirical-rule", href: "/calculators/math/empirical-rule-calculator" },
          { name: "Exponential Distribution Calculator", description: "Exponential-distribution probabilities from either the rate λ or the mean 1/λ — P(X ≤ x), P(X > x) and P(a < X ≤ b) — with mean, variance, standard deviation, a shaded PDF curve, a full explanation of the memoryless property and show/hide step-by-step working.", icon: Sigma, slug: "exponential-distribution", href: "/calculators/math/exponential-distribution-calculator" },
          { name: "Dice Probability Calculator", description: "Probability of rolling any sum with 1–6 dice of 4, 6, 8, 10, 12 or 20 sides — exact, at-least and at-most probabilities as fraction, decimal and percent, with a full distribution bar chart and show/hide step-by-step working.", icon: Dices, slug: "dice-probability", href: "/calculators/math/dice-probability-calculator" },
          { name: "Odds Ratio & Relative Risk Calculator", description: "Odds ratio (OR) and relative risk (RR) from a 2×2 contingency table with 95% confidence intervals via the log-transform method — color-coded a/b/c/d cells, Haldane–Anscombe correction for zero cells, and a clear explanation of when to use OR vs RR.", icon: GitCompareArrows, slug: "odds-ratio-relative-risk", href: "/calculators/math/odds-ratio-relative-risk-calculator" },
          { name: "Grade Percentile Calculator", description: "Find the percentile of any test score — from a full class score list (linear-interpolation method matching NumPy percentile / Excel PERCENTILE.INC) or from the class mean and standard deviation using the standard-normal CDF. Shaded bell-curve diagram, highlighted sorted-list view, show/hide step-by-step working and a clear explanation of percentile vs percentage score.", icon: Sigma, slug: "grade-percentile", href: "/calculators/math/grade-percentile-calculator" },
          { name: "Central Limit Theorem Simulator", description: "Interactive Central Limit Theorem demo — pick a Uniform, Skewed or Bimodal population, draw thousands of samples of any size n, and watch the sampling distribution of the mean turn into a bell curve regardless of the population's shape. Side-by-side histograms, empirical vs theoretical mean and SE (σ/√n) and show/hide step-by-step working.", icon: Sigma, slug: "central-limit-theorem", href: "/calculators/math/central-limit-theorem-calculator" },
          { name: "Relative Frequency Calculator", description: "Build a full frequency distribution — frequency, relative frequency (decimal + %), cumulative frequency and cumulative relative frequency — from raw categorical data, raw numeric data grouped into class intervals (Sturges or manual width), or a pre-tallied table. Bar chart / histogram, an ogive (the cumulative chart most calculators skip) and show/hide step-by-step working.", icon: PieChart, slug: "relative-frequency", href: "/calculators/math/relative-frequency-calculator" },
          { name: "Coin Flip Probability Calculator", description: "Exact probability of getting a given number of heads in n coin flips — exactly, at least, at most — for a fair or biased coin, plus the probability of a streak of k consecutive heads (or tails) somewhere in n flips. Full binomial distribution bar chart and show/hide step-by-step working.", icon: Dices, slug: "coin-flip", href: "/calculators/math/coin-flip-calculator" },
          { name: "Lottery Odds Calculator", description: "Odds of winning any lottery — pick-N-from-M games plus Powerball, Mega Millions and EuroMillions style formats with a separate bonus ball. Shown as 1-in-N, probability and percent, with a partial-match tier option, a perspective bar chart against real-world rare events (lightning, hole-in-one, plane crash) on a log scale and show/hide step-by-step working using C(n, r).", icon: Dices, slug: "lottery-odds", href: "/calculators/math/lottery-odds-calculator" },
          { name: "Geometric Distribution Calculator", description: "Probability the first success happens on trial k — P(X = k), P(X ≤ k) and P(X > k) — using (1 − p)^(k−1)·p, with mean 1/p, variance (1 − p)/p², a full probability bar chart with your k highlighted and show/hide step-by-step working.", icon: Sigma, slug: "geometric-distribution", href: "/calculators/math/geometric-distribution-calculator" },
          { name: "Hypergeometric Distribution Calculator", description: "Sampling without replacement — P(X = k), P(X ≤ k) and P(X ≥ k) for drawing n items from a finite population of N with K successes. Uses exact BigInt combinations, includes mean nK/N with the finite-population variance correction, a side-by-side binomial comparison, full probability bar chart and show/hide step-by-step working. Works for card hands, lottery matches, quality control and MTG deck-building.", icon: Sigma, slug: "hypergeometric-distribution", href: "/calculators/math/hypergeometric-distribution-calculator" },
          { name: "Uniform Distribution Calculator", description: "Discrete or continuous uniform on [a, b] in one tool. Discrete gives P(X = x) = 1/n with mean (a+b)/2 and variance (n²−1)/12; continuous gives P(c ≤ X ≤ d) = (d−c)/(b−a) with density 1/(b−a) and variance (b−a)²/12. Auto-clips sub-intervals to the support, ships a shaded PDF/PMF diagram and show/hide step-by-step working.", icon: Sigma, slug: "uniform-distribution", href: "/calculators/math/uniform-distribution-calculator" },
         { name: "Mann-Whitney U Test Calculator", description: "Non-parametric two-sample test (aka Wilcoxon rank-sum). Ranks both groups together with average ranks for ties, reports U₁, U₂ and U, normal-approximation z with continuity + tie correction, one- or two-sided p-value, plain-language verdict at your chosen α, dot-plot diagram showing overlap and show/hide step-by-step working.", icon: Sigma, slug: "mann-whitney", href: "/calculators/math/mann-whitney-calculator" },
         { name: "Wilcoxon Signed-Rank Test Calculator", description: "Paired non-parametric test. Enter Before/After values, drops zero differences with a note, ranks |d| with average ranks for ties, reports W⁺, W⁻ and W, normal-approximation z with continuity + tie correction, one- or two-sided p-value, plain-language verdict, lollipop diagram of signed changes and show/hide step-by-step working.", icon: Sigma, slug: "wilcoxon", href: "/calculators/math/wilcoxon-calculator" },
          { name: "Cronbach's Alpha Calculator", description: "Survey / test internal-consistency reliability. Editable respondents × items grid pre-filled with a Likert example, per-item variances and total-score variance, α with the (k/(k−1))·(1 − Σσᵢ²/σ²ₜ) substitution shown, plain-language verdict with a warning at α ≥ 0.95 for redundant items, variance-contribution diagram and show/hide step-by-step working.", icon: Sigma, slug: "cronbachs-alpha", href: "/calculators/math/cronbachs-alpha-calculator" },
          { name: "Moving Average Calculator", description: "Smooth any time series with a Simple Moving Average (SMA) or Exponential Moving Average (EMA). Enter your data and a window size, get the full smoothed series in a table, an overlaid raw-vs-smoothed line chart, auto or custom α = 2/(n+1) for EMA and show/hide step-by-step working.", icon: Sigma, slug: "moving-average", href: "/calculators/math/moving-average-calculator" },
          { name: "Kruskal-Wallis Test Calculator", description: "Non-parametric one-way ANOVA on 3+ independent groups — ranks with average-rank tie handling, H statistic with tie correction, df = k−1 and an exact chi-square p-value with reject/fail-to-reject verdict at your chosen α.", icon: Sigma, slug: "kruskal-wallis", href: "/calculators/math/kruskal-wallis-calculator" },
          { name: "Cohen's d / Effect Size Calculator", description: "Standardized effect size between two groups from raw data or summary stats — Cohen's d, Hedges' g (small-sample corrected), Glass's Δ and an approximate 95% CI for d, with plain-language interpretation and step-by-step working.", icon: Sigma, slug: "effect-size", href: "/calculators/math/effect-size-calculator" },



        ],
      },
      {
        title: "Geometry",
        items: [
          { name: "Area Calculator", description: "Area of 11 common 2D shapes — square, rectangle, triangle (base–height & Heron), trapezoid, parallelogram, rhombus, circle, sector, ellipse, regular polygon and annulus — with live diagrams, unit conversions and show/hide steps.", icon: Shapes, slug: "area", href: "/calculators/math/area-calculator" },
          { name: "Volume Calculator", description: "Volume of 13 solids — sphere, cone, cylinder, tank, capsule, cap, frustum, ellipsoid, pyramid, tube, prism, torus.", icon: Shapes, slug: "volume", href: "/calculators/math/volume-calculator" },
          { name: "Surface Area Calculator", description: "Total, lateral and base surface area of 13 solids — sphere, cube, cylinder, cone, rectangular tank, capsule, spherical cap, conical frustum, ellipsoid, pyramid, triangular prism, tube (hollow cylinder) and torus — with live diagrams, unit conversions, significant-figures control and full step-by-step working.", icon: Shapes, slug: "surface-area", href: "/calculators/math/surface-area-calculator" },
          { name: "Triangle Calculator", description: "Solve any triangle from 3 inputs — SSS, SAS, ASA, AAS and the ambiguous SSA (returns both triangles when they exist). Reports all sides and angles, area (Heron and ½·ab·sinC), perimeter, all three medians, inradius, circumradius, a labeled scale SVG diagram, and show/hide step-by-step working. Degrees or radians.", icon: Shapes, slug: "triangle", href: "/calculators/math/triangle-calculator" },
          { name: "Pythagorean Theorem Calculator", description: "Solve a² + b² = c² for any missing side, check whether three sides form a right triangle, or find the 3D space diagonal of a box. Live scale diagram, unit selector (mm–km, in/ft/yd), significant-figures control, Pythagorean-triple detector, one-click real-world presets (ladder, screen diagonal, door, ramp) and personalized step-by-step working.", icon: Shapes, slug: "pythagorean-theorem", href: "/calculators/math/pythagorean-theorem-calculator" },
          { name: "Right Triangle Calculator", description: "Specialised right-triangle solver: enter any 2 of 7 values — legs a and b, hypotenuse c, either acute angle α or β, altitude h, area A or perimeter P — and get every other value plus the inradius r and circumradius R = c/2. Live to-scale diagram with altitude, degrees/radians toggle, 3-4-5 / 30-60-90 / 45-45-90 presets and step-by-step working.", icon: Shapes, slug: "right-triangle", href: "/calculators/math/right-triangle-calculator" },
          { name: "Isosceles Triangle Calculator", description: "Specialised isosceles-triangle solver: enter any 2 of 8 values — leg a, base b, either altitude (hb or ha), vertex angle B, base angle A, area K or perimeter P — and get every side, angle, altitude, perimeter, semiperimeter, area, inradius and circumradius R = a²/√(4a²−b²). Live to-scale diagram with axis of symmetry, degrees/radians toggle, equilateral / golden-triangle / 45-45-90 presets, auto-detects equilateral/right/golden cases, and personalised step-by-step working.", icon: Shapes, slug: "isosceles-triangle", href: "/calculators/math/isosceles-triangle-calculator" },
          { name: "Equilateral Triangle Calculator", description: "Specialised equilateral-triangle solver: enter any one of side a, perimeter P, height h, area A, circumradius R or inradius r — and get every other measurement (all angles are 60°). Live to-scale diagram, unit selector (mm–km, in/ft/yd) with automatic conversion table, presets (yield sign, tetrahedron face, roof gable, reverse-from-area), and personalised step-by-step working.", icon: Shapes, slug: "equilateral-triangle", href: "/calculators/math/equilateral-triangle-calculator" },
          { name: "Triangle Sum Theorem Calculator", description: "Know two interior angles of a triangle? Get the third instantly using α + β + γ = 180° (or π radians). Degrees/radians toggle, labelled diagram, step-by-step working, parallel-line and exterior-angle proofs, and worked examples for degree, right-triangle and radian cases.", icon: Shapes, slug: "triangle-sum-theorem", href: "/calculators/math/triangle-sum-theorem-calculator" },
          { name: "Law of Sines Calculator", description: "Solve ASA, AAS and the SSA ambiguous case using a/sin A = b/sin B = c/sin C. Classifies SSA as no / one / two triangles and shows both solutions side-by-side with scaled diagrams, plus every side, angle, area, perimeter, inradius and circumradius, degrees/radians toggle, altitude proof and law-of-sines-vs-cosines comparison.", icon: Shapes, slug: "law-of-sines", href: "/calculators/math/law-of-sines-calculator" },
          { name: "Law of Cosines Calculator", description: "Solve SAS (two sides + included angle → third side + other two angles) and SSS (three sides → all three angles) using c² = a² + b² − 2ab·cos C. Returns area (Heron), perimeter, semiperimeter, inradius and circumradius, plus a scaled diagram, four proofs (trigonometric, distance-formula, Ptolemy, vector) and worked SAS/SSS examples.", icon: Shapes, slug: "law-of-cosines", href: "/calculators/math/law-of-cosines-calculator" },
          { name: "Distance Calculator", description: "Distance between two points in 2D and 3D, plus great-circle distance between latitudes/longitudes with the Haversine and Lambert (ellipsoidal) formulas — km and miles, DMS input, click-to-place world map and show/hide step-by-step working.", icon: RulerIcon, slug: "distance", href: "/calculators/math/distance-calculator" },
          { name: "Slope Calculator", description: "Slope, distance and angle of incline between two points, or find the second point from one point plus slope/angle and distance. Reports grade %, rise:run ratio, radians and degrees, with a right-triangle diagram and full working.", icon: RulerIcon, slug: "slope", href: "/calculators/math/slope-calculator" },
          { name: "Circle Calculator", description: "Solve a circle from any one of radius, diameter, circumference or area, from three points, from a center + point, or from the general equation x² + y² + Dx + Ey + F = 0. Plus arc length, sector, chord, circular segment, annulus, tangent from external point and equivalent-square tools with a live diagram, unit conversions and step-by-step working.", icon: Shapes, slug: "circle", href: "/calculators/math/circle-calculator" },
        ],
      },
    ],
  },
  finance: {
    slug: "finance",
    name: "Finance",
    sections: [
      {
        title: "Loans & Mortgages",
        items: [
          { name: "Mortgage Calculator", description: "Monthly payments, interest and amortization.", icon: HomeIcon, slug: "mortgage" },
          { name: "Loan Calculator", description: "Payment schedule for any loan.", icon: Landmark, slug: "loan" },
          { name: "Auto Loan Calculator", description: "Estimate car payments and interest.", icon: Wallet, slug: "auto-loan" },
        ],
      },
      {
        title: "Investing & Savings",
        items: [
          { name: "Compound Interest", description: "Growth of savings over time.", icon: TrendingUp, slug: "compound-interest" },
          { name: "Investment Calculator", description: "Future value with contributions.", icon: TrendingUp, slug: "investment" },
          { name: "Retirement Calculator", description: "Project a retirement nest egg.", icon: PiggyBank, slug: "retirement" },
          { name: "Savings Goal", description: "How much to save each month.", icon: PiggyBank, slug: "savings-goal" },
        ],
      },
      {
        title: "Taxes & Everyday",
        items: [
          { name: "Sales Tax Calculator", description: "Tax on any purchase.", icon: ReceiptText, slug: "sales-tax" },
          { name: "Tip Calculator", description: "Split checks and add tip.", icon: ReceiptText, slug: "tip" },
          { name: "Income Tax Estimator", description: "Rough federal tax owed.", icon: Landmark, slug: "income-tax" },
        ],
      },
    ],
  },
  health: {
    slug: "health",
    name: "Health & Fitness",
    sections: [
      {
        title: "Body Metrics",
        items: [
          { name: "BMI Calculator", description: "Body mass index by height and weight.", icon: Scale, slug: "bmi" },
          { name: "Body Fat Calculator", description: "Estimate body fat percentage.", icon: Activity, slug: "body-fat" },
          { name: "Ideal Weight", description: "Target weight range for your height.", icon: HeartPulse, slug: "ideal-weight" },
        ],
      },
      {
        title: "Nutrition",
        items: [
          { name: "TDEE Calculator", description: "Total daily energy expenditure.", icon: Flame, slug: "tdee" },
          { name: "Calorie Calculator", description: "Daily calorie needs for your goal.", icon: Flame, slug: "calorie" },
          { name: "Macro Calculator", description: "Protein, carb and fat targets.", icon: Salad, slug: "macro" },
          { name: "Water Intake", description: "Daily hydration recommendation.", icon: Salad, slug: "water" },
        ],
      },
      {
        title: "Fitness",
        items: [
          { name: "One-Rep Max", description: "Estimate your 1RM for any lift.", icon: Dumbbell, slug: "one-rep-max" },
          { name: "Pace Calculator", description: "Running pace and split times.", icon: Activity, slug: "pace" },
          { name: "Heart Rate Zones", description: "Training zones from max HR.", icon: HeartPulse, slug: "heart-rate" },
        ],
      },
    ],
  },
  "unit-converters": {
    slug: "unit-converters",
    name: "Unit Converters",
    sections: [
      {
        title: "Common",
        items: [
          { name: "Length Converter", description: "Meters, feet, inches, miles and more.", icon: Ruler, slug: "length" },
          { name: "Weight Converter", description: "Kilograms, pounds, ounces, tons.", icon: Weight, slug: "weight" },
          { name: "Temperature Converter", description: "Celsius, Fahrenheit and Kelvin.", icon: Thermometer, slug: "temperature" },
          { name: "Volume Converter", description: "Liters, gallons, cups and more.", icon: Beaker, slug: "volume" },
        ],
      },
      {
        title: "Science & Engineering",
        items: [
          { name: "Speed Converter", description: "mph, km/h, m/s and knots.", icon: Timer, slug: "speed" },
          { name: "Energy Converter", description: "Joules, calories and kWh.", icon: Zap, slug: "energy" },
          { name: "Pressure Converter", description: "Pa, bar, psi and atm.", icon: Zap, slug: "pressure" },
          { name: "Power Converter", description: "Watts, horsepower and more.", icon: Zap, slug: "power" },
        ],
      },
    ],
  },
  "date-time": {
    slug: "date-time",
    name: "Date & Time",
    sections: [
      {
        title: "Dates",
        items: [
          { name: "Days Between Dates", description: "Count days between any two dates.", icon: CalendarDays, slug: "days-between" },
          { name: "Age Calculator", description: "Your exact age in years, months, days.", icon: CalendarClock, slug: "age" },
          { name: "Date Duration", description: "Duration in years, weeks and days.", icon: CalendarRange, slug: "duration" },
          { name: "Add / Subtract Days", description: "Shift a date forward or backward.", icon: CalendarDays, slug: "add-subtract" },
        ],
      },
      {
        title: "Time",
        items: [
          { name: "Time Calculator", description: "Add or subtract hours and minutes.", icon: Clock, slug: "time" },
          { name: "Countdown Timer", description: "Time remaining to any event.", icon: Hourglass, slug: "countdown" },
          { name: "Workday Calculator", description: "Business days between dates.", icon: Sunrise, slug: "workday" },
        ],
      },
    ],
  },
  education: {
    slug: "education",
    name: "Education",
    sections: [
      {
        title: "Grades & GPA",
        items: [
          { name: "GPA Calculator", description: "Semester and cumulative GPA.", icon: GraduationCap, slug: "gpa" },
          { name: "Cumulative GPA", description: "Combine multiple semesters.", icon: School, slug: "cumulative-gpa" },
          { name: "Grade Calculator", description: "Weighted grade from categories.", icon: Trophy, slug: "grade" },
          { name: "Final Grade Needed", description: "Score needed on the final exam.", icon: BookOpen, slug: "final-grade" },
        ],
      },
      {
        title: "Scores",
        items: [
          { name: "Test Score Calculator", description: "Percentage from correct answers.", icon: ScrollText, slug: "test-score" },
          { name: "Percentage Grade", description: "Convert points to percent and letter.", icon: CalcIcon, slug: "percentage-grade" },
        ],
      },
    ],
  },
};
