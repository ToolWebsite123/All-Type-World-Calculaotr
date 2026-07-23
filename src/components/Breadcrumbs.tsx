import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { Fragment } from "react";

export interface Crumb {
  label: string;
  to?: string;
}

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-8">
      <ol className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
        {items.map((item, i) => {
          const isLast = i === items.length - 1;
          return (
            <Fragment key={`${item.label}-${i}`}>
              <li>
                {item.to && !isLast ? (
                  <Link
                    to={item.to}
                    className="rounded-full px-2 py-1 transition-colors hover:bg-secondary/60 hover:text-foreground"
                  >
                    {item.label}
                  </Link>
                ) : (
                  <span
                    className="px-2 py-1 font-medium text-foreground"
                    aria-current={isLast ? "page" : undefined}
                  >
                    {item.label}
                  </span>
                )}
              </li>
              {!isLast && (
                <li aria-hidden>
                  <ChevronRight className="h-3.5 w-3.5 opacity-60" />
                </li>
              )}
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}
