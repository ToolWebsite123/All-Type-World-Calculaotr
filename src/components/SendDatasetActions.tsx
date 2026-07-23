import { useNavigate } from "@tanstack/react-router";
import { STATS_TARGETS, stashDataset } from "@/lib/dataset-handoff";

interface Props {
  /** Route path of the current calculator — that target is filtered out. */
  currentPath: string;
  /** Called to get the raw dataset text at click time. */
  getDataset: () => string;
}

export function SendDatasetActions({ currentPath, getDataset }: Props) {
  const navigate = useNavigate();
  const others = STATS_TARGETS.filter((t) => t.path !== currentPath);

  return (
    <div className="rounded-2xl border border-border/60 bg-secondary/20 p-3">
      <div className="mb-2 text-xs uppercase tracking-[0.14em] text-muted-foreground">
        Analyze this dataset elsewhere
      </div>
      <div className="flex flex-wrap gap-2">
        {others.map((t) => (
          <button
            key={t.path}
            type="button"
            onClick={() => {
              const raw = getDataset().trim();
              if (raw) stashDataset(t.path, raw);
              navigate({ to: t.path });
            }}
            className="inline-flex items-center justify-center rounded-full border border-border bg-background/60 px-4 py-1.5 text-sm font-medium text-foreground transition-colors hover:border-primary/50 hover:bg-primary/10"
          >
            Analyze in {t.short} →
          </button>
        ))}
      </div>
    </div>
  );
}
