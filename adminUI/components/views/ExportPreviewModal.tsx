"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { SheetData, DatasetStats } from "@/types";
import { 
  ExportFormatDefinition, 
  ExportOptions, 
  generateExportPayload, 
  triggerFileDownload 
} from "@/utils/exportConverters";
import { 
  X, 
  Download, 
  Copy, 
  Check, 
  Eye, 
  Code2, 
  FileSpreadsheet, 
  FileText, 
  Layers, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle,
  ZoomIn,
  ZoomOut,
  Maximize2,
  RefreshCw,
  Terminal,
  Database,
  Cpu,
  FileCheck,
  Globe,
  SlidersHorizontal,
  Table
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";

interface ExportPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  format: ExportFormatDefinition | null;
  sheet: SheetData;
  datasetName: string;
  stats?: DatasetStats | null;
}

export function ExportPreviewModal({
  isOpen,
  onClose,
  format,
  sheet,
  datasetName,
  stats,
}: ExportPreviewModalProps) {
  if (!isOpen || !format) return null;

  // Configuration options state: 0 = All Rows by default
  const [rowLimit, setRowLimit] = useState<number>(0);
  const [includeHeaders, setIncludeHeaders] = useState<boolean>(true);
  const [sqlDialect, setSqlDialect] = useState<"postgres" | "mysql" | "sqlite" | "mssql">("postgres");
  const [latexDocument, setLatexDocument] = useState<boolean>(true);
  const [imageTheme, setImageTheme] = useState<"dark" | "light">("dark");
  const [imageScale, setImageScale] = useState<number>(2);
  
  // Custom filename
  const defaultBaseName = `${datasetName.replace(/\.[^/.]+$/, "")}_${sheet.name}`;
  const [customFileName, setCustomFileName] = useState<string>(`${defaultBaseName}${format.extension}`);

  // Preview Generation State
  const [loading, setLoading] = useState<boolean>(true);
  const [previewContent, setPreviewContent] = useState<string>("");
  const [binaryBuffer, setBinaryBuffer] = useState<Uint8Array | null>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [currentBlob, setCurrentBlob] = useState<Blob | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [binaryTab, setBinaryTab] = useState<"schema" | "hex">("schema");
  const [htmlMode, setHtmlMode] = useState<"rendered" | "source">("rendered");
  const [zoomLevel, setZoomLevel] = useState<number>(100);

  // Update default filename if format changes
  useEffect(() => {
    setCustomFileName(`${defaultBaseName}${format.extension}`);
  }, [format.id, defaultBaseName]);

  // Handle escape key to close
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      window.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }
    return () => {
      window.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  // Generate Preview & Blob
  useEffect(() => {
    let isCancelled = false;
    setLoading(true);

    const runGeneration = async () => {
      try {
        const options: ExportOptions = {
          rowLimit: rowLimit === 0 ? undefined : rowLimit,
          includeHeaders,
          sqlDialect,
          latexDocument,
          imageTheme,
          imageScale,
        };

        const result = await generateExportPayload(format.id, sheet, datasetName, options);
        if (isCancelled) return;

        setCurrentBlob(result.blob);
        setPreviewContent(result.previewContent || "");
        setBinaryBuffer(result.binaryBuffer || null);

        // Generate object URL for PDF/Images/HTML
        if (blobUrl) {
          URL.revokeObjectURL(blobUrl);
        }
        const newUrl = URL.createObjectURL(result.blob);
        setBlobUrl(newUrl);
        setLoading(false);
      } catch (err: any) {
        if (isCancelled) return;
        console.error("Failed to generate export preview:", err);
        toast.error(`Could not generate preview for ${format.name}`);
        setLoading(false);
      }
    };

    runGeneration();

    return () => {
      isCancelled = true;
    };
  }, [
    format.id,
    sheet,
    datasetName,
    rowLimit,
    includeHeaders,
    sqlDialect,
    latexDocument,
    imageTheme,
    imageScale,
  ]);

  // Cleanup object URL on unmount
  useEffect(() => {
    return () => {
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [blobUrl]);

  // Copy to clipboard
  const handleCopyContent = async () => {
    if (!previewContent) {
      toast.error("Nothing to copy for this format");
      return;
    }
    try {
      await navigator.clipboard.writeText(previewContent);
      setCopied(true);
      toast.success("Copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy text");
    }
  };

  // Download Action
  const handleDownload = () => {
    if (!currentBlob) {
      toast.error("Download payload not ready yet");
      return;
    }
    const finalName = customFileName.trim().endsWith(format.extension)
      ? customFileName.trim()
      : `${customFileName.trim()}${format.extension}`;
    triggerFileDownload(currentBlob, finalName);
    toast.success(`Downloaded: ${finalName}`);
  };

  // Hex dump helper for binary formats
  const hexDump = useMemo(() => {
    if (!binaryBuffer) return [];
    const bytesToDisplay = binaryBuffer.slice(0, 512); // First 512 bytes
    const lines: Array<{ offset: string; hex: string; ascii: string }> = [];

    for (let i = 0; i < bytesToDisplay.length; i += 16) {
      const chunk = bytesToDisplay.slice(i, i + 16);
      const offset = i.toString(16).padStart(8, "0").toUpperCase();
      const hexParts: string[] = [];
      let ascii = "";

      for (let j = 0; j < 16; j++) {
        if (j < chunk.length) {
          const byte = chunk[j];
          hexParts.push(byte.toString(16).padStart(2, "0").toUpperCase());
          ascii += byte >= 32 && byte <= 126 ? String.fromCharCode(byte) : ".";
        } else {
          hexParts.push("  ");
        }
      }

      // Group into 8-byte halves
      const hexStr = `${hexParts.slice(0, 8).join(" ")}  ${hexParts.slice(8).join(" ")}`;
      lines.push({ offset, hex: hexStr, ascii });
    }
    return lines;
  }, [binaryBuffer]);

  // Estimated file size
  const formattedSize = useMemo(() => {
    if (!currentBlob) return "Calculating...";
    const bytes = currentBlob.size;
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }, [currentBlob]);

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-6xl h-[92vh] flex flex-col bg-card border border-border rounded-2xl shadow-2xl overflow-hidden glass-panel-heavy"
        onClick={(e) => e.stopPropagation()}
      >
        {/* MODAL HEADER */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center font-bold text-sm">
              {format.extension}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display font-bold text-lg text-foreground">{format.name}</h2>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-accent text-accent-foreground border border-border">
                  {format.categoryLabel}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                  {formattedSize}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {format.description}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 h-9 text-xs"
              onClick={handleDownload}
              disabled={loading || !currentBlob}
            >
              <Download className="h-3.5 w-3.5" />
              <span>Download {format.extension}</span>
            </Button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              aria-label="Close dialog"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* CONTROLS & OPTIONS TOOLBAR */}
        <div className="px-6 py-3 border-b border-border bg-accent/30 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
          <div className="flex flex-wrap items-center gap-3">
            {/* Row limit picker */}
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground font-semibold">Rows to Export:</span>
              <select
                value={rowLimit}
                onChange={(e) => setRowLimit(Number(e.target.value))}
                className="bg-background border border-border rounded-lg px-2.5 py-1 text-xs text-foreground font-semibold focus:ring-1 focus:ring-primary outline-none"
              >
                <option value={0}>All {sheet.rows.length.toLocaleString()} Rows (Entire Dataset)</option>
                <option value={25}>First 25 Rows (Sample)</option>
                <option value={50}>First 50 Rows (Sample)</option>
                <option value={100}>First 100 Rows (Sample)</option>
                <option value={500}>First 500 Rows (Sample)</option>
                <option value={1000}>First 1,000 Rows (Sample)</option>
              </select>
            </div>

            {/* SQL Dialect Selector */}
            {format.id === "sql" && (
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground font-semibold">SQL Dialect:</span>
                <select
                  value={sqlDialect}
                  onChange={(e) => setSqlDialect(e.target.value as any)}
                  className="bg-background border border-border rounded-lg px-2.5 py-1 text-xs text-foreground focus:ring-1 focus:ring-primary outline-none"
                >
                  <option value="postgres">PostgreSQL</option>
                  <option value="mysql">MySQL</option>
                  <option value="sqlite">SQLite</option>
                  <option value="mssql">SQL Server</option>
                </select>
              </div>
            )}

            {/* LaTeX Document Toggle */}
            {format.id === "latex" && (
              <label className="flex items-center gap-1.5 cursor-pointer text-muted-foreground hover:text-foreground">
                <input
                  type="checkbox"
                  checked={latexDocument}
                  onChange={(e) => setLatexDocument(e.target.checked)}
                  className="rounded border-border text-primary focus:ring-primary h-3.5 w-3.5"
                />
                <span>Include \documentclass & preamble</span>
              </label>
            )}

            {/* Image Theme & Scale */}
            {(format.category === "images" && format.id !== "svg") && (
              <>
                <div className="flex items-center gap-1.5">
                  <span className="text-muted-foreground font-semibold">Theme:</span>
                  <select
                    value={imageTheme}
                    onChange={(e) => setImageTheme(e.target.value as any)}
                    className="bg-background border border-border rounded-lg px-2.5 py-1 text-xs text-foreground focus:ring-1 focus:ring-primary outline-none"
                  >
                    <option value="dark">Dark Theme</option>
                    <option value="light">Light Studio</option>
                  </select>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-muted-foreground font-semibold">Resolution:</span>
                  <select
                    value={imageScale}
                    onChange={(e) => setImageScale(Number(e.target.value))}
                    className="bg-background border border-border rounded-lg px-2.5 py-1 text-xs text-foreground focus:ring-1 focus:ring-primary outline-none"
                  >
                    <option value={1}>1x Standard</option>
                    <option value={2}>2x High-DPI Retina</option>
                    <option value={3}>3x Ultra-Crisp</option>
                  </select>
                </div>
              </>
            )}

            {/* HTML View Toggle */}
            {format.id === "html" && (
              <div className="flex rounded-lg border border-border p-0.5 bg-background">
                <button
                  onClick={() => setHtmlMode("rendered")}
                  className={`px-2.5 py-0.5 rounded-md font-semibold ${
                    htmlMode === "rendered" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                  }`}
                >
                  Live Web Page
                </button>
                <button
                  onClick={() => setHtmlMode("source")}
                  className={`px-2.5 py-0.5 rounded-md font-semibold ${
                    htmlMode === "source" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                  }`}
                >
                  HTML Source
                </button>
              </div>
            )}

            {/* Binary Format Tabs */}
            {format.isBinary && format.previewType === "binary" && (
              <div className="flex rounded-lg border border-border p-0.5 bg-background">
                <button
                  onClick={() => setBinaryTab("schema")}
                  className={`px-2.5 py-0.5 rounded-md font-semibold ${
                    binaryTab === "schema" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                  }`}
                >
                  Column Schema
                </button>
                <button
                  onClick={() => setBinaryTab("hex")}
                  className={`px-2.5 py-0.5 rounded-md font-semibold ${
                    binaryTab === "hex" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                  }`}
                >
                  Hex Stream View
                </button>
              </div>
            )}
          </div>

          {/* Filename Editor */}
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground font-semibold">Save As:</span>
            <input
              type="text"
              value={customFileName}
              onChange={(e) => setCustomFileName(e.target.value)}
              className="bg-background border border-border rounded-lg px-2.5 py-1 text-xs text-foreground font-mono w-56 focus:ring-1 focus:ring-primary outline-none"
            />
          </div>
        </div>

        {/* PREVIEW VIEWPORT */}
        <div className="flex-1 overflow-auto bg-card relative min-h-0 flex flex-col">
          {loading ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
              <RefreshCw className="h-8 w-8 animate-spin text-primary mb-3" />
              <p className="font-semibold text-sm text-foreground">Compiling {format.name} Client-Side...</p>
              <p className="text-xs text-muted-foreground mt-1">Transforming table records in memory without network transmission.</p>
            </div>
          ) : (
            <>
              {/* 1. SPREADSHEET PREVIEW (XLSX, XLS, XLSB, ODS) */}
              {format.previewType === "table" && (
                <div className="flex-1 flex flex-col p-4 overflow-hidden">
                  <div className="mb-3 flex items-center justify-between text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground">
                      {rowLimit === 0 ? (
                        <span>
                          Exporting <strong className="text-emerald-500">All {sheet.rows.length.toLocaleString()} Rows</strong> (Showing preview sample below)
                        </span>
                      ) : (
                        <span>
                          Exporting <strong className="text-primary">First {rowLimit} Rows</strong>
                        </span>
                      )}
                    </span>
                    <span className="font-mono">
                      {sheet.headers.length} Columns • Total Cells: {(sheet.rows.length * sheet.headers.length).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex-1 overflow-auto border border-border rounded-xl bg-background/50">
                    <table className="w-full border-collapse text-xs text-left">
                      <thead className="sticky top-0 bg-muted/80 backdrop-blur z-10 border-b border-border">
                        <tr>
                          <th className="py-2.5 px-3 font-semibold text-muted-foreground border-r border-border w-12 text-center">#</th>
                          {sheet.headers.map((h) => (
                            <th key={h} className="py-2.5 px-3 font-semibold text-foreground border-r border-border whitespace-nowrap">
                              <div className="flex items-center gap-1.5">
                                <span>{h}</span>
                                <span className="text-[10px] font-normal text-muted-foreground uppercase">
                                  ({sheet.columnTypes?.[h] || (sheet as any).types?.[h] || "str"})
                                </span>
                              </div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {(rowLimit > 0 ? sheet.rows.slice(0, rowLimit) : sheet.rows.slice(0, 100)).map((row, rIdx) => (
                          <tr key={rIdx} className="border-b border-border/50 hover:bg-accent/40 transition-colors">
                            <td className="py-2 px-3 text-muted-foreground border-r border-border font-mono text-center">
                              {rIdx + 1}
                            </td>
                            {sheet.headers.map((h) => (
                              <td key={h} className="py-2 px-3 text-foreground/90 border-r border-border/50 whitespace-nowrap font-mono text-[11px]">
                                {row[h] !== null && row[h] !== undefined ? String(row[h]) : <span className="text-muted-foreground italic">null</span>}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {rowLimit === 0 && sheet.rows.length > 100 && (
                      <div className="p-2.5 text-center text-xs text-muted-foreground bg-accent/40 border-t border-border font-medium">
                        Showing first 100 rows in preview window. All <strong className="text-emerald-500">{sheet.rows.length.toLocaleString()} rows</strong> will be included in the downloaded file.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 2. TEXT & CODE PREVIEW (CSV, TSV, TXT, JSON, XML, YAML, SQL, LATEX, MD) */}
              {(format.previewType === "code" || (format.id === "html" && htmlMode === "source") || format.id === "svg") && (
                <div className="flex-1 flex flex-col p-4 overflow-hidden relative">
                  <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
                    <span className="font-semibold flex items-center gap-1.5">
                      <Terminal className="h-3.5 w-3.5 text-primary" />
                      <span>Syntax Preview ({previewContent.split("\n").length} lines, {previewContent.length.toLocaleString()} characters)</span>
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCopyContent}
                      className="h-7 text-xs gap-1.5 border-border"
                    >
                      {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                      <span>{copied ? "Copied" : "Copy Content"}</span>
                    </Button>
                  </div>
                  <pre className="flex-1 overflow-auto p-4 bg-background/80 border border-border rounded-xl font-mono text-xs text-foreground/90 leading-relaxed select-text">
                    <code>{previewContent}</code>
                  </pre>
                </div>
              )}

              {/* 3. HTML LIVE EMBEDDED PREVIEW */}
              {format.id === "html" && htmlMode === "rendered" && (
                <div className="flex-1 flex flex-col p-4 overflow-hidden">
                  <div className="mb-2 text-xs text-muted-foreground flex justify-between items-center">
                    <span className="font-semibold">Interactive Standalone Web Page Preview</span>
                    <span className="text-[11px] text-primary">Fully functional search & filter embedded in iframe</span>
                  </div>
                  <iframe
                    srcDoc={previewContent}
                    title="HTML Preview"
                    sandbox="allow-scripts"
                    className="flex-1 w-full border border-border rounded-xl bg-slate-950 shadow-inner"
                  />
                </div>
              )}

              {/* 4. PDF DOCUMENT VIEWER */}
              {format.previewType === "pdf" && blobUrl && (
                <div className="flex-1 flex flex-col p-4 overflow-hidden">
                  <div className="mb-2 text-xs text-muted-foreground flex justify-between items-center">
                    <span className="font-semibold">Live Executive PDF Document Preview</span>
                    <span className="text-[11px]">Rendered using client-side jsPDF Document Engine</span>
                  </div>
                  <iframe
                    src={blobUrl}
                    title="PDF Preview"
                    className="flex-1 w-full border border-border rounded-xl bg-card shadow-inner"
                  />
                </div>
              )}

              {/* 5. WORD DOCUMENT (.DOCX) PREVIEW */}
              {format.id === "docx" && (
                <div className="flex-1 overflow-auto p-6 bg-slate-900/60 flex justify-center">
                  <div className="w-full max-w-3xl bg-white text-slate-900 rounded-lg shadow-xl p-10 min-h-[800px] border border-slate-300">
                    <div className="border-b border-indigo-600 pb-4 mb-6">
                      <h1 className="text-2xl font-bold text-indigo-700">Report-IQ Dataset Report</h1>
                      <p className="text-xs text-slate-500 mt-1">
                        Sheet: <strong className="text-slate-800">{sheet.name}</strong> • Exported: {new Date().toLocaleDateString()} • {sheet.rows.length} Total Records
                      </p>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse text-xs">
                        <thead>
                          <tr className="bg-indigo-600 text-white font-semibold">
                            {sheet.headers.map((h) => (
                              <th key={h} className="p-2 border border-indigo-700 text-left whitespace-nowrap">
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {(rowLimit ? sheet.rows.slice(0, rowLimit) : sheet.rows.slice(0, 30)).map((r, i) => (
                            <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                              {sheet.headers.map((h) => (
                                <td key={h} className="p-2 border border-slate-200 text-slate-800 whitespace-nowrap">
                                  {r[h] !== null && r[h] !== undefined ? String(r[h]) : ""}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="mt-8 pt-4 border-t border-slate-200 text-[11px] text-slate-400 text-right italic">
                      Native Microsoft Word OpenXML (.docx) compiled in browser.
                    </div>
                  </div>
                </div>
              )}

              {/* 6. IMAGE PREVIEW (PNG, JPEG, WEBP) */}
              {format.previewType === "image" && format.id !== "svg" && blobUrl && (
                <div className="flex-1 flex flex-col p-4 overflow-hidden items-center justify-center bg-black/40 relative">
                  <div className="absolute top-4 right-4 flex items-center gap-1.5 bg-background/80 backdrop-blur px-2 py-1 rounded-lg border border-border text-xs z-10">
                    <button
                      onClick={() => setZoomLevel((z) => Math.max(50, z - 25))}
                      className="p-1 hover:text-primary transition-colors"
                      title="Zoom Out"
                    >
                      <ZoomOut className="h-3.5 w-3.5" />
                    </button>
                    <span className="font-mono px-1 font-semibold">{zoomLevel}%</span>
                    <button
                      onClick={() => setZoomLevel((z) => Math.min(200, z + 25))}
                      className="p-1 hover:text-primary transition-colors"
                      title="Zoom In"
                    >
                      <ZoomIn className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="overflow-auto max-w-full max-h-full p-4 flex items-center justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={blobUrl}
                      alt="Rendered Table Snapshot"
                      style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: "center center" }}
                      className="rounded-xl shadow-2xl border border-border transition-transform duration-200"
                    />
                  </div>
                </div>
              )}

              {/* 7. BIG DATA & BINARY PREVIEWS (PARQUET, ARROW, FEATHER, AVRO, ORC, SQLITE) */}
              {format.isBinary && format.previewType === "binary" && (
                <div className="flex-1 flex flex-col p-4 overflow-hidden">
                  {binaryTab === "schema" ? (
                    <div className="flex-1 overflow-auto flex flex-col gap-4">
                      {/* Format Specs Card */}
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
                        <div className="p-3 bg-accent/40 border border-border rounded-xl">
                          <span className="text-muted-foreground block text-[10px] uppercase font-bold">Physical Storage</span>
                          <span className="font-bold text-foreground text-sm mt-0.5 block">{format.name} Binary</span>
                        </div>
                        <div className="p-3 bg-accent/40 border border-border rounded-xl">
                          <span className="text-muted-foreground block text-[10px] uppercase font-bold">Encoding Scheme</span>
                          <span className="font-bold text-foreground text-sm mt-0.5 block">
                            {format.id === "parquet" ? "Dictionary / RLE Plain" : format.id === "avro" ? "Avro OCF Binary" : format.id === "sqlite" ? "SQLite3 B-Tree Leaf" : "Arrow IPC RecordBatch"}
                          </span>
                        </div>
                        <div className="p-3 bg-accent/40 border border-border rounded-xl">
                          <span className="text-muted-foreground block text-[10px] uppercase font-bold">Compression Codec</span>
                          <span className="font-bold text-emerald-500 text-sm mt-0.5 block">Uncompressed (Zero-Copy)</span>
                        </div>
                        <div className="p-3 bg-accent/40 border border-border rounded-xl">
                          <span className="text-muted-foreground block text-[10px] uppercase font-bold">Magic Header Bytes</span>
                          <span className="font-mono font-bold text-primary text-sm mt-0.5 block">
                            {format.id === "parquet" ? "PAR1" : format.id === "avro" ? "Obj\\x01" : format.id === "sqlite" ? "SQLite format 3" : format.id === "feather" ? "FEA1" : format.id === "orc" ? "ORC" : "ARROW1"}
                          </span>
                        </div>
                      </div>

                      {/* Schema Fields Table */}
                      <div className="flex-1 border border-border rounded-xl bg-background/50 overflow-auto">
                        <div className="p-3 bg-muted/60 border-b border-border flex justify-between items-center text-xs font-semibold">
                          <span>Column Schema & Data Types ({sheet.headers.length} fields)</span>
                          <span className="text-muted-foreground font-mono">Row Count: {sheet.rows.length.toLocaleString()}</span>
                        </div>
                        <table className="w-full border-collapse text-xs text-left">
                          <thead className="bg-muted/40 border-b border-border text-muted-foreground">
                            <tr>
                              <th className="py-2 px-3 font-semibold w-12 text-center">#</th>
                              <th className="py-2 px-3 font-semibold">Field Name</th>
                              <th className="py-2 px-3 font-semibold">Inferred Logical Type</th>
                              <th className="py-2 px-3 font-semibold">Binary Storage Type</th>
                              <th className="py-2 px-3 font-semibold">Nullable</th>
                              <th className="py-2 px-3 font-semibold">Sample First Value</th>
                            </tr>
                          </thead>
                          <tbody>
                            {sheet.headers.map((h, i) => {
                              const type = sheet.columnTypes?.[h] || (sheet as any).types?.[h] || "string";
                              const sampleVal = sheet.rows[0]?.[h];
                              return (
                                <tr key={h} className="border-b border-border/40 hover:bg-accent/30 font-mono text-[11px]">
                                  <td className="py-2 px-3 text-muted-foreground text-center">{i + 1}</td>
                                  <td className="py-2 px-3 font-bold text-foreground">{h}</td>
                                  <td className="py-2 px-3 text-primary uppercase">{type}</td>
                                  <td className="py-2 px-3 text-muted-foreground">
                                    {type === "number" ? "FLOAT64 / INT64" : type === "boolean" ? "BOOLEAN" : "UTF8_STRING"}
                                  </td>
                                  <td className="py-2 px-3 text-emerald-500 font-semibold">true</td>
                                  <td className="py-2 px-3 text-foreground/80 truncate max-w-xs">
                                    {sampleVal !== null && sampleVal !== undefined ? String(sampleVal) : "-"}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : (
                    /* Hex dump inspector */
                    <div className="flex-1 flex flex-col overflow-hidden">
                      <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
                        <span className="font-semibold flex items-center gap-1.5 font-mono">
                          <span>Binary Hex Stream (First 512 bytes)</span>
                        </span>
                        <span className="text-[11px] text-emerald-500 font-semibold">Verified Valid Binary Header</span>
                      </div>
                      <div className="flex-1 overflow-auto bg-background/90 border border-border rounded-xl p-4 font-mono text-[11px] leading-relaxed select-text">
                        <div className="grid grid-cols-[80px_1fr_160px] gap-4 font-bold text-muted-foreground border-b border-border pb-1 mb-2">
                          <span>OFFSET</span>
                          <span>HEX VALUES (00-0F)</span>
                          <span>ASCII</span>
                        </div>
                        {hexDump.map((line, idx) => (
                          <div key={idx} className="grid grid-cols-[80px_1fr_160px] gap-4 hover:bg-accent/40 rounded px-1">
                            <span className="text-primary font-bold">{line.offset}</span>
                            <span className="text-foreground tracking-wider">{line.hex}</span>
                            <span className="text-muted-foreground font-bold">{line.ascii}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* MODAL FOOTER */}
        <div className="px-6 py-4 border-t border-border bg-card/90 flex flex-wrap items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
            <span>
              <strong>Client-Side Confidentiality:</strong> Transformed 100% locally in your browser. No data ever leaves your device.
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={onClose} className="h-9 text-xs">
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleDownload}
              disabled={loading || !currentBlob}
              className="h-9 px-5 text-xs gap-1.5 shadow-md shadow-primary/20"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Download {customFileName}</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
