import { useState, type RefObject } from "react";
import { Check, Copy, Download, FileText, Loader2, Printer } from "lucide-react";
import { toPng } from "html-to-image";

interface Props {
  /** Plain-text summary that will be copied to clipboard. */
  getCopyText: () => string;
  /** Ref to the DOM node that should be captured for the image download. */
  captureRef: RefObject<HTMLElement | null>;
  /** Filename (without extension) for the downloaded PNG/PDF. */
  filename: string;
  className?: string;
}

/**
 * Result-panel action bar: "Copy result" + "Download as image" + "Download PDF".
 * Used across the Statistics calculators.
 */
export function ResultActions({ getCopyText, captureRef, filename, className = "" }: Props) {
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [printing, setPrinting] = useState(false);

  const btn =
    "inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-secondary/40 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground disabled:opacity-60";

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(getCopyText());
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  };

  const capturePng = async (): Promise<{ dataUrl: string; width: number; height: number } | null> => {
    const node = captureRef.current;
    if (!node) return null;
    const bg =
      getComputedStyle(node).backgroundColor ||
      getComputedStyle(document.body).backgroundColor ||
      "#0b0b0f";
    const dataUrl = await toPng(node, { pixelRatio: 2, backgroundColor: bg, cacheBust: true });
    // Load into an Image to get natural pixel dimensions.
    const dims = await new Promise<{ width: number; height: number }>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = reject;
      img.src = dataUrl;
    });
    return { dataUrl, ...dims };
  };

  const onDownload = async () => {
    setDownloading(true);
    try {
      const captured = await capturePng();
      if (!captured) return;
      const link = document.createElement("a");
      link.download = `${filename}.png`;
      link.href = captured.dataUrl;
      link.click();
    } catch (err) {
      console.error("Download image failed", err);
    } finally {
      setDownloading(false);
    }
  };

  const onDownloadPdf = async () => {
    setExportingPdf(true);
    try {
      const captured = await capturePng();
      if (!captured) return;
      // Dynamic import so jsPDF isn't in the main bundle.
      const { jsPDF } = await import("jspdf");

      // Fit to A4 with 40pt margins. Preserve aspect ratio.
      const pageW = 595.28; // A4 width in pt
      const pageH = 841.89;
      const margin = 40;
      const maxW = pageW - margin * 2;
      const maxH = pageH - margin * 2;
      const ratio = captured.width / captured.height;
      let w = maxW;
      let h = w / ratio;
      if (h > maxH) {
        h = maxH;
        w = h * ratio;
      }
      const x = (pageW - w) / 2;
      const y = (pageH - h) / 2;

      const pdf = new jsPDF({ unit: "pt", format: "a4", orientation: "portrait" });
      pdf.addImage(captured.dataUrl, "PNG", x, y, w, h);
      pdf.save(`${filename}.pdf`);
    } catch (err) {
      console.error("Download PDF failed", err);
    } finally {
      setExportingPdf(false);
    }
  };

  const onPrint = async () => {
    setPrinting(true);
    try {
      const captured = await capturePng();
      if (!captured) return;
      const w = window.open("", "_blank", "noopener,noreferrer,width=900,height=1200");
      if (!w) return;
      const safeTitle = filename.replace(/[<>&"]/g, "");
      w.document.open();
      w.document.write(
        `<!doctype html><html><head><title>${safeTitle}</title><meta charset="utf-8"/><style>
          html,body{margin:0;padding:0;background:#fff;}
          img{display:block;max-width:100%;height:auto;margin:0 auto;}
          @media print{@page{margin:12mm;}}
        </style></head><body><img alt="${safeTitle}" src="${captured.dataUrl}"/></body></html>`,
      );
      w.document.close();
      const doPrint = () => {
        try {
          w.focus();
          w.print();
        } catch {
          /* ignore */
        }
      };
      // Some browsers need the image decoded before print()
      const img = w.document.querySelector("img");
      if (img && !img.complete) {
        img.addEventListener("load", doPrint, { once: true });
      } else {
        setTimeout(doPrint, 100);
      }
    } catch (err) {
      console.error("Print failed", err);
    } finally {
      setPrinting(false);
    }
  };

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <button type="button" onClick={onCopy} className={btn} aria-label="Copy result to clipboard">
        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        {copied ? "Copied!" : "Copy result"}
      </button>
      <button
        type="button"
        onClick={onDownload}
        disabled={downloading}
        className={btn}
        aria-label="Download result as PNG image"
      >
        {downloading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Download className="h-3.5 w-3.5" />
        )}
        {downloading ? "Rendering…" : "Download as image"}
      </button>
      <button
        type="button"
        onClick={onDownloadPdf}
        disabled={exportingPdf}
        className={btn}
        aria-label="Download result as PDF"
      >
        {exportingPdf ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <FileText className="h-3.5 w-3.5" />
        )}
        {exportingPdf ? "Building PDF…" : "Download PDF"}
      </button>
      <button
        type="button"
        onClick={onPrint}
        disabled={printing}
        className={btn}
        aria-label="Print result"
      >
        {printing ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Printer className="h-3.5 w-3.5" />
        )}
        {printing ? "Preparing…" : "Print / PDF"}
      </button>
    </div>
  );
}
