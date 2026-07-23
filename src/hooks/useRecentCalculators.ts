import { useEffect, useState } from "react";
import { CATEGORIES } from "@/lib/calculator-catalog";

const STORAGE_KEY = "atc:recent-calcs-v1";
const MAX_RECENTS = 6;
const CHANGE_EVENT = "atc:recent-calcs-changed";

export interface RecentItem {
  name: string;
  href: string;
  category: string;
}

/** Flatten the catalog once so we can resolve href -> {name, category}. */
const INDEX: Record<string, { name: string; category: string }> = (() => {
  const map: Record<string, { name: string; category: string }> = {};
  for (const cat of Object.values(CATEGORIES)) {
    for (const section of cat.sections) {
      for (const item of section.items) {
        if (item.href) map[item.href] = { name: item.name, category: cat.name };
      }
    }
  }
  return map;
})();

function readStorage(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function writeStorage(hrefs: string[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(hrefs));
    window.dispatchEvent(new Event(CHANGE_EVENT));
  } catch {
    /* ignore quota / privacy errors */
  }
}

/** Record a visit to a calculator page. Silently ignores unknown paths. */
export function pushRecentCalculator(href: string) {
  if (typeof window === "undefined") return;
  if (!INDEX[href]) return; // only track known, built calculators
  const current = readStorage();
  const next = [href, ...current.filter((h) => h !== href)].slice(0, MAX_RECENTS);
  writeStorage(next);
}

/** Clear the recent-calculators history. */
export function clearRecentCalculators() {
  writeStorage([]);
}

/** Reactive subscription to the recent-calculators list. */
export function useRecentCalculators(): RecentItem[] {
  const [items, setItems] = useState<RecentItem[]>([]);

  useEffect(() => {
    const sync = () => {
      const resolved = readStorage()
        .map((href) => {
          const meta = INDEX[href];
          return meta ? { href, name: meta.name, category: meta.category } : null;
        })
        .filter((x): x is RecentItem => x !== null);
      setItems(resolved);
    };
    sync();
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) sync();
    };
    window.addEventListener(CHANGE_EVENT, sync);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(CHANGE_EVENT, sync);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  return items;
}
