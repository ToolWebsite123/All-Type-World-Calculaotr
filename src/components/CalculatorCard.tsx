import { useNavigate } from "@tanstack/react-router";
import type { MouseEvent } from "react";
import { ArrowUpRight, type LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/Card";

export interface CalculatorCardProps {
  name: string;
  description: string;
  icon: LucideIcon;
  to: string;
  disabled?: boolean;
}

export function CalculatorCard({ name, description, icon: Icon, to, disabled }: CalculatorCardProps) {
  const navigate = useNavigate();

  const openCalculator = (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) {
      return;
    }
    if (!to.startsWith("/")) return;
    event.preventDefault();
    void navigate({ to: to as never });
  };

  const inner = (
    <Card
      className={
        "h-full p-5 transition-all duration-300 " +
        (disabled
          ? "opacity-70"
          : "group-hover:-translate-y-0.5 group-hover:border-primary/40")
      }
    >
      <div className="flex items-start gap-3.5">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/12 text-primary ring-1 ring-primary/20">
          <Icon className="h-5 w-5" strokeWidth={2} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-[15px] font-medium tracking-tight text-foreground">{name}</h3>
            {!disabled && (
              <ArrowUpRight className="h-4 w-4 text-muted-foreground transition-all group-hover:text-primary group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            )}
          </div>
          <p className="mt-1.5 line-clamp-2 text-[13px] leading-relaxed text-muted-foreground">
            {description}
          </p>

          {disabled && (
            <span className="mt-2 inline-block rounded-full border border-border bg-secondary/40 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Coming soon
            </span>
          )}
        </div>
      </div>
    </Card>
  );

  if (disabled) return <div className="group block">{inner}</div>;
  return (
    <a
      href={to}
      onClick={openCalculator}
      className="group block focus:outline-none"
      aria-label={`Open ${name}`}
    >
      {inner}
    </a>
  );
}
