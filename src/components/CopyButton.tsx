import { useState } from "react";
import { Check, Copy } from "lucide-react";

interface Props {
  text: string;
  label?: string;
  className?: string;
}

/**
 * Small clipboard button used across calculator result panels.
 * Matches the styling used on the Fraction and Percentage calculators.
 */
export function CopyButton({ text, label = "Copy", className = "" }: Props) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1400);
        } catch {
          /* ignore */
        }
      }}
      className={
        "inline-flex items-center gap-1 rounded-full border border-border/60 bg-secondary/40 px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground " +
        className
      }
      aria-label={`${copied ? "Copied" : label} ${text.length < 40 ? text : "result"}`}
    >
      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
      {copied ? "Copied!" : label}
    </button>
  );
}
