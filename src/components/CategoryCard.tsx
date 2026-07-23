import { Link } from "@tanstack/react-router";
import { ArrowUpRight, type LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/Card";

export interface CategoryCardProps {
  name: string;
  description: string;
  icon: LucideIcon;
  count: number;
  to: string;
}

export function CategoryCard({ name, description, icon: Icon, count, to }: CategoryCardProps) {
  return (
    <Link to={to} className="group block focus:outline-none">
      <Card className="h-full transition-all duration-300 group-hover:-translate-y-0.5 group-hover:border-primary/40 group-focus-visible:ring-2 group-focus-visible:ring-ring">
        <div className="flex items-start justify-between">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/12 text-primary ring-1 ring-primary/20">
            <Icon className="h-5 w-5" strokeWidth={2} />
          </span>
          <ArrowUpRight className="h-5 w-5 text-muted-foreground transition-all group-hover:text-primary group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
        </div>
        <div className="mt-6">
          <h3 className="text-lg font-semibold tracking-tight text-foreground">{name}</h3>
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{description}</p>
        </div>
        <div className="mt-6 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground/80">
          {count > 0 ? (
            <>
              <span className="tabular-nums text-foreground/90">{count}</span>
              <span>{count === 1 ? "calculator" : "calculators"}</span>
            </>
          ) : (
            <span>Coming soon</span>
          )}
        </div>
      </Card>
    </Link>
  );
}
