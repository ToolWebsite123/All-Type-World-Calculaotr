import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { History, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { evaluateExpression, formatResult, type AngleMode } from "@/lib/calculator-eval";
import { CopyButton } from "@/components/CopyButton";

type BtnKind = "digit" | "op" | "fn" | "mem" | "eq" | "clear";

interface Key {
  label: string;
  aria?: string;
  kind: BtnKind;
  /** Text inserted into the expression (may contain a trailing paren for wrapping). */
  insert?: string;
  /** Action override — takes precedence over insert. */
  action?:
    | "equals"
    | "clear"
    | "back"
    | "sign"
    | "rnd"
    | "ans"
    | "mplus"
    | "mminus"
    | "mrecall"
    | "square"
    | "cube"
    | "inverse"
    | "factorial";
  span?: number;
}

const ROWS: Key[][] = [
  [
    { label: "sin", kind: "fn", insert: "sin(" },
    { label: "cos", kind: "fn", insert: "cos(" },
    { label: "tan", kind: "fn", insert: "tan(" },
    { label: "sin⁻¹", aria: "arcsine", kind: "fn", insert: "asin(" },
    { label: "cos⁻¹", aria: "arccosine", kind: "fn", insert: "acos(" },
    { label: "tan⁻¹", aria: "arctangent", kind: "fn", insert: "atan(" },
  ],
  [
    { label: "π", aria: "pi", kind: "fn", insert: "π" },
    { label: "e", kind: "fn", insert: "e" },
    { label: "x^y", aria: "x to the power y", kind: "fn", insert: "^" },
    { label: "x²", aria: "square", kind: "fn", action: "square" },
    { label: "x³", aria: "cube", kind: "fn", action: "cube" },
    { label: "eˣ", aria: "e to the x", kind: "fn", insert: "exp(" },
  ],
  [
    { label: "10ˣ", aria: "ten to the x", kind: "fn", insert: "10^(" },
    { label: "y√x", aria: "nth root", kind: "fn", insert: "nthRoot(" },
    { label: "³√x", aria: "cube root", kind: "fn", insert: "cbrt(" },
    { label: "√x", aria: "square root", kind: "fn", insert: "sqrt(" },
    { label: "ln", kind: "fn", insert: "log(" },
    { label: "log", kind: "fn", insert: "log10(" },
  ],
  [
    { label: "(", kind: "op", insert: "(" },
    { label: ")", kind: "op", insert: ")" },
    { label: "1/x", aria: "reciprocal", kind: "fn", action: "inverse" },
    { label: "%", kind: "op", insert: "%" },
    { label: "n!", aria: "factorial", kind: "fn", action: "factorial" },
    { label: "Back", aria: "backspace", kind: "clear", action: "back" },
  ],
  [
    { label: "7", kind: "digit", insert: "7" },
    { label: "8", kind: "digit", insert: "8" },
    { label: "9", kind: "digit", insert: "9" },
    { label: "÷", aria: "divide", kind: "op", insert: "/" },
    { label: "AC", aria: "all clear", kind: "clear", action: "clear" },
    { label: "±", aria: "negate", kind: "op", action: "sign" },
  ],
  [
    { label: "4", kind: "digit", insert: "4" },
    { label: "5", kind: "digit", insert: "5" },
    { label: "6", kind: "digit", insert: "6" },
    { label: "×", aria: "multiply", kind: "op", insert: "*" },
    { label: "M+", aria: "memory add", kind: "mem", action: "mplus" },
    { label: "M-", aria: "memory subtract", kind: "mem", action: "mminus" },
  ],
  [
    { label: "1", kind: "digit", insert: "1" },
    { label: "2", kind: "digit", insert: "2" },
    { label: "3", kind: "digit", insert: "3" },
    { label: "−", aria: "minus", kind: "op", insert: "-" },
    { label: "MR", aria: "memory recall", kind: "mem", action: "mrecall" },
    { label: "RND", aria: "random", kind: "fn", action: "rnd" },
  ],
  [
    { label: "0", kind: "digit", insert: "0" },
    { label: ".", kind: "digit", insert: "." },
    { label: "Ans", aria: "answer", kind: "mem", action: "ans" },
    { label: "+", aria: "plus", kind: "op", insert: "+" },
    { label: "=", aria: "equals", kind: "eq", action: "equals", span: 2 },
  ],
];

const kindStyles: Record<BtnKind, string> = {
  digit:
    "bg-secondary/70 text-foreground hover:bg-secondary border border-border/60",
  op: "bg-secondary/40 text-foreground hover:bg-secondary/70 border border-border/60",
  fn: "bg-white/[0.03] text-primary hover:bg-white/[0.07] border border-border/60",
  mem: "bg-white/[0.03] text-primary/90 hover:bg-white/[0.07] border border-border/60",
  clear:
    "bg-destructive/15 text-destructive hover:bg-destructive/25 border border-destructive/30",
  eq: "bg-primary text-primary-foreground hover:brightness-110 shadow-[0_8px_30px_-8px_var(--color-primary)] border border-primary/60 text-lg font-semibold",
};

interface HistoryItem {
  id: string;
  expression: string;
  result: string;
}

export function ScientificCalculator() {
  const [expression, setExpression] = useState("");
  const [display, setDisplay] = useState("0");
  const [mode, setMode] = useState<AngleMode>("Deg");
  const [memory, setMemory] = useState(0);
  const [ans, setAns] = useState(0);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [justEvaluated, setJustEvaluated] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const scope = useMemo(() => ({ Ans: ans, M: memory }), [ans, memory]);

  const insert = useCallback((text: string) => {
    setExpression((prev) => (justEvaluated && /^[0-9.(]/.test(text) ? text : prev + text));
    setJustEvaluated(false);
  }, [justEvaluated]);

  const back = useCallback(() => {
    setExpression((prev) => prev.slice(0, -1));
    setJustEvaluated(false);
  }, []);

  const clear = useCallback(() => {
    setExpression("");
    setDisplay("0");
    setJustEvaluated(false);
  }, []);

  const evaluate = useCallback(() => {
    if (!expression.trim()) return;
    try {
      const result = evaluateExpression(expression, mode, scope);
      const shown = formatResult(result);
      setDisplay(shown);
      setAns(result);
      setHistory((h) => [
        { id: `${Date.now()}-${Math.random()}`, expression, result: shown },
        ...h,
      ].slice(0, 50));
      setJustEvaluated(true);
      setExpression(shown);
    } catch {
      setDisplay("Error");
    }
  }, [expression, mode, scope]);

  const handleKey = useCallback((key: Key) => {
    if (key.action) {
      switch (key.action) {
        case "equals": return evaluate();
        case "clear": return clear();
        case "back": return back();
        case "sign":
          setExpression((prev) => {
            if (!prev) return "-";
            if (prev.startsWith("-(") && prev.endsWith(")")) return prev.slice(2, -1);
            return `-(${prev})`;
          });
          return;
        case "rnd": return insert(Math.random().toString());
        case "ans": return insert("Ans");
        case "mplus":
          try { setMemory((m) => m + evaluateExpression(expression || display, mode, scope)); } catch {}
          return;
        case "mminus":
          try { setMemory((m) => m - evaluateExpression(expression || display, mode, scope)); } catch {}
          return;
        case "mrecall": return insert(String(memory));
        case "square": return insert("^2");
        case "cube": return insert("^3");
        case "inverse":
          setExpression((prev) => (prev ? `1/(${prev})` : "1/"));
          return;
        case "factorial":
          setExpression((prev) => prev + "!");
          return;
      }
    }
    if (key.insert) insert(key.insert);
  }, [back, clear, display, evaluate, expression, insert, memory, mode, scope]);

  // Keyboard support
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;
      const k = e.key;
      if (/^[0-9]$/.test(k)) { e.preventDefault(); insert(k); return; }
      if (["+", "-", "*", "/", "(", ")", ".", "%", "^"].includes(k)) { e.preventDefault(); insert(k); return; }
      if (k === "Enter" || k === "=") { e.preventDefault(); evaluate(); return; }
      if (k === "Backspace") { e.preventDefault(); back(); return; }
      if (k === "Escape") { e.preventDefault(); clear(); return; }
      if (k === "h" || k === "H") { e.preventDefault(); setHistoryOpen((o) => !o); return; }
      if (k === "d" || k === "D") { e.preventDefault(); setMode((m) => (m === "Deg" ? "Rad" : "Deg")); return; }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [back, clear, evaluate, insert]);

  return (
    <div ref={containerRef} className="scientific-calculator relative mx-auto w-full max-w-md">
      <div className="scientific-calculator-card rounded-3xl border border-border bg-card/60 p-3 shadow-[0_20px_80px_-30px_rgba(0,0,0,0.8)] backdrop-blur-sm sm:p-4">
        {/* Top bar */}
        <div className="scientific-calculator-topbar mb-3 flex items-center justify-between">
          <div
            role="radiogroup"
            aria-label="Angle mode"
            className="inline-flex rounded-full border border-border bg-secondary/40 p-1"
          >
            {(["Deg", "Rad"] as const).map((m) => (
              <button
                key={m}
                role="radio"
                aria-checked={mode === m}
                onClick={() => setMode(m)}
                className={cn(
                  "rounded-full px-3.5 py-1 text-xs font-medium transition-colors",
                  mode === m
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {m}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            {memory !== 0 && (
              <span className="rounded-full border border-border bg-secondary/40 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                M
              </span>
            )}
            <button
              type="button"
              aria-label="Toggle history"
              aria-expanded={historyOpen}
              onClick={() => setHistoryOpen((o) => !o)}
              className="grid h-9 w-9 place-items-center rounded-full border border-border bg-secondary/40 text-muted-foreground transition-colors hover:bg-secondary/70 hover:text-foreground"
            >
              <History className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Display */}
        <div className="scientific-calculator-display mb-3 rounded-2xl border border-border/60 bg-background/60 px-4 py-3">
          <div className="min-h-[1rem] truncate text-right text-xs text-muted-foreground tabular-nums">
            {expression || "\u00a0"}
          </div>
          <div className="mt-0.5 flex items-center justify-between gap-2">
            <CopyButton text={display} className="shrink-0" />
            <div className="scientific-calculator-result min-w-0 flex-1 truncate text-right text-3xl font-semibold tabular-nums text-foreground sm:text-4xl">
              {display}
            </div>
          </div>
        </div>

        {/* Keypad */}
        <div className="scientific-calculator-keypad grid grid-cols-6 gap-1.5 sm:gap-2">
          {ROWS.flat().map((k, idx) => (
            <button
              key={idx}
              type="button"
              aria-label={k.aria ?? k.label}
              onClick={() => handleKey(k)}
              className={cn(
                "scientific-calculator-key h-10 rounded-2xl text-sm font-medium transition-all duration-150 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:h-11 sm:rounded-full",
                kindStyles[k.kind],
                k.span === 2 && "col-span-2",
                k.kind === "eq" && "scientific-calculator-eq h-11 sm:h-12",
              )}
            >
              {k.label}
            </button>
          ))}
        </div>
      </div>

      {/* History panel */}
      {historyOpen && (
        <>
          <div
            aria-hidden
            className="fixed inset-0 z-30 bg-background/60 backdrop-blur-sm"
            onClick={() => setHistoryOpen(false)}
          />
          <aside
            role="dialog"
            aria-label="Calculation history"
            className="fixed right-0 top-0 z-40 h-full w-full max-w-sm border-l border-border bg-card/95 p-5 shadow-2xl backdrop-blur-xl animate-in slide-in-from-right"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold">History</h2>
              <button
                type="button"
                aria-label="Close history"
                onClick={() => setHistoryOpen(false)}
                className="grid h-9 w-9 place-items-center rounded-full border border-border bg-secondary/40 text-muted-foreground transition-colors hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {history.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No calculations yet. Your recent results will appear here.
              </p>
            ) : (
              <ul className="space-y-2">
                {history.map((h) => (
                  <li key={h.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setExpression(h.expression);
                        setDisplay(h.result);
                        setHistoryOpen(false);
                      }}
                      className="group w-full rounded-2xl border border-border/60 bg-background/50 p-3 text-left transition-colors hover:border-primary/40 hover:bg-secondary/40"
                    >
                      <div className="truncate text-xs text-muted-foreground tabular-nums">
                        {h.expression}
                      </div>
                      <div className="mt-1 truncate text-lg font-medium tabular-nums text-foreground group-hover:text-primary">
                        = {h.result}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </aside>
        </>
      )}
    </div>
  );
}
