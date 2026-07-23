import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Calculator, Search, X } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import { CATEGORIES } from "@/lib/calculator-catalog";
import { cn } from "@/lib/cn";

interface SearchItem {
  name: string;
  category: string;
  href: string;
}

/** Flatten the catalog into a searchable list of calculators with a live route. */
const SEARCH_INDEX: SearchItem[] = Object.values(CATEGORIES).flatMap((cat) =>
  cat.sections.flatMap((s) =>
    s.items
      .filter((it) => !!it.href)
      .map((it) => ({ name: it.name, category: cat.name, href: it.href! })),
  ),
);

function matchScore(query: string, item: SearchItem): number {
  const q = query.trim().toLowerCase();
  if (!q) return 0;
  const name = item.name.toLowerCase();
  if (name === q) return 100;
  if (name.startsWith(q)) return 80;
  if (name.includes(q)) return 60;
  // fuzzy: every char of q appears in order in name
  let i = 0;
  for (const ch of name) {
    if (ch === q[i]) i++;
    if (i === q.length) return 30;
  }
  // category fallback
  if (item.category.toLowerCase().includes(q)) return 10;
  return 0;
}

function useSearch(query: string): SearchItem[] {
  return useMemo(() => {
    if (!query.trim()) return [];
    return SEARCH_INDEX.map((it) => ({ it, s: matchScore(query, it) }))
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, 8)
      .map((x) => x.it);
  }, [query]);
}

interface SearchBoxProps {
  autoFocus?: boolean;
  onNavigate?: () => void;
  className?: string;
}

function SearchBox({ autoFocus, onNavigate, className }: SearchBoxProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const results = useSearch(query);
  const navigate = useNavigate();
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  const go = (href: string) => {
    setOpen(false);
    setQuery("");
    onNavigate?.();
    navigate({ to: href });
  };

  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      if (query) {
        setQuery("");
      } else {
        setOpen(false);
        onNavigate?.();
      }
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, Math.max(results.length - 1, 0)));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      const pick = results[activeIndex];
      if (pick) go(pick.href);
      return;
    }
  };

  return (
    <div ref={wrapRef} className={cn("relative", className)}>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          ref={inputRef}
          role="combobox"
          aria-expanded={open && results.length > 0}
          aria-controls="calc-search-listbox"
          aria-autocomplete="list"
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKey}
          placeholder="Search calculators…"
          className="h-9 w-full rounded-full border border-border bg-secondary/40 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground/70 focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>
      {open && query.trim() && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-border bg-popover/95 shadow-2xl backdrop-blur-xl">
          {results.length === 0 ? (
            <div className="px-4 py-3 text-sm text-muted-foreground">
              No calculators match "{query}".
            </div>
          ) : (
            <ul id="calc-search-listbox" role="listbox" className="max-h-80 overflow-y-auto py-1">
              {results.map((r, i) => (
                <li key={r.href} role="option" aria-selected={i === activeIndex}>
                  <button
                    type="button"
                    onMouseEnter={() => setActiveIndex(i)}
                    onClick={() => go(r.href)}
                    className={cn(
                      "flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-sm transition-colors",
                      i === activeIndex
                        ? "bg-secondary/70 text-foreground"
                        : "text-foreground/90 hover:bg-secondary/50",
                    )}
                  >
                    <span className="font-medium">{r.name}</span>
                    <span className="text-xs text-muted-foreground">{r.category}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export function Navbar() {
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-3 sm:h-16 sm:px-6">
        <Link to="/" className="group flex min-w-0 items-center gap-2.5">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-primary/15 text-primary ring-1 ring-primary/25 transition-colors group-hover:bg-primary/25">
            <Calculator className="h-4.5 w-4.5" strokeWidth={2.25} />
          </span>
          <span className="hidden truncate font-display text-sm font-semibold tracking-tight sm:inline sm:text-base">
            All Type Calculator
          </span>
        </Link>

        {/* Desktop search */}
        <div className="ml-4 hidden max-w-sm flex-1 md:block">
          <SearchBox />
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-2">
          <button
            type="button"
            aria-label="Search calculators"
            onClick={() => setMobileSearchOpen(true)}
            className="grid h-9 w-9 place-items-center rounded-full border border-border bg-secondary/40 text-muted-foreground transition-colors hover:bg-secondary/70 hover:text-foreground md:hidden"
          >
            <Search className="h-4 w-4" />
          </button>
          <Link
            to="/calculators"
            className="rounded-full px-3 py-2 text-sm font-medium text-foreground/80 transition-colors hover:bg-secondary/60 hover:text-foreground sm:px-5"
            activeProps={{ className: "bg-secondary/70 text-foreground" }}
          >
            Calculators
          </Link>
          <ThemeToggle />
        </div>
      </div>

      {/* Mobile search overlay */}
      {mobileSearchOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-background/70 backdrop-blur-sm"
            onClick={() => setMobileSearchOpen(false)}
            aria-hidden
          />
          <div className="relative mx-auto mt-16 max-w-lg px-4">
            <div className="rounded-3xl border border-border bg-card p-3 shadow-2xl">
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <SearchBox autoFocus onNavigate={() => setMobileSearchOpen(false)} />
                </div>
                <button
                  type="button"
                  aria-label="Close search"
                  onClick={() => setMobileSearchOpen(false)}
                  className="grid h-9 w-9 place-items-center rounded-full border border-border bg-secondary/40 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
