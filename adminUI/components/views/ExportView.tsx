"use client";

import React, { useState, useMemo } from "react";
import { useAnalyticsStore } from "@/store/useAnalyticsStore";
import { analyzeDataset } from "@/utils/dataOperations";
import { toast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { 
  EXPORT_FORMATS, 
  ExportFormatDefinition, 
  ExportFormatCategory,
  generateExportPayload,
  triggerFileDownload 
} from "@/utils/exportConverters";
import { ExportPreviewModal } from "./ExportPreviewModal";
import { 
  Download, 
  Search, 
  Eye, 
  FileSpreadsheet, 
  FileText, 
  FileCode, 
  Database, 
  Table, 
  CheckCircle, 
  Sparkles, 
  SlidersHorizontal, 
  Layers, 
  HardDrive, 
  Image as ImageIcon, 
  Globe, 
  Braces, 
  BookOpen, 
  ArrowRight,
  Filter,
  CheckCircle2,
  FolderDown,
  Info
} from "lucide-react";

export function ExportView() {
  const datasets = useAnalyticsStore((state) => state.datasets);
  const selectedDatasetId = useAnalyticsStore((state) => state.selectedDatasetId);
  const selectedSheetName = useAnalyticsStore((state) => state.selectedSheetName);
  const setSelectedSheetName = useAnalyticsStore((state) => state.setSelectedSheetName);
  const setActiveTab = useAnalyticsStore((state) => state.setActiveTab);

  // Active dataset & sheet
  const activeDataset = useMemo(() => {
    return datasets.find((d) => d.id === selectedDatasetId) || datasets[0] || null;
  }, [datasets, selectedDatasetId]);

  const activeSheet = useMemo(() => {
    if (!activeDataset) return null;
    if (selectedSheetName) {
      const found = activeDataset.sheets.find((s) => s.name === selectedSheetName);
      if (found) return found;
    }
    return activeDataset.sheets[0] || null;
  }, [activeDataset, selectedSheetName]);

  // Compute profiling statistics
  const stats = useMemo(() => {
    if (!activeSheet) return null;
    return analyzeDataset(activeSheet);
  }, [activeSheet]);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [previewFormat, setPreviewFormat] = useState<ExportFormatDefinition | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [quickDownloadingId, setQuickDownloadingId] = useState<string | null>(null);
  const [showStudentGuide, setShowStudentGuide] = useState(false);

  // Filtered formats
  const filteredFormats = useMemo(() => {
    return EXPORT_FORMATS.filter((fmt) => {
      const matchesCategory = selectedCategory === "all" || fmt.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = 
        !q ||
        fmt.name.toLowerCase().includes(q) ||
        fmt.extension.toLowerCase().includes(q) ||
        fmt.categoryLabel.toLowerCase().includes(q) ||
        fmt.bestFor.toLowerCase().includes(q) ||
        fmt.description.toLowerCase().includes(q);

      return matchesCategory && matchesSearch;
    });
  }, [selectedCategory, searchQuery]);

  // Quick 1-click download with default settings
  const handleQuickDownload = async (e: React.MouseEvent, fmt: ExportFormatDefinition) => {
    e.stopPropagation();
    if (!activeSheet || !activeDataset) return;

    try {
      setQuickDownloadingId(fmt.id);
      const fileName = `${activeDataset.name.replace(/\.[^/.]+$/, "")}_${activeSheet.name}${fmt.extension}`;
      const result = await generateExportPayload(fmt.id, activeSheet, activeDataset.name);
      triggerFileDownload(result.blob, fileName);
      toast.success(`Downloaded: ${fileName}`);
    } catch (err) {
      console.error(err);
      toast.error(`Failed to export ${fmt.name}`);
    } finally {
      setQuickDownloadingId(null);
    }
  };

  // Open Preview Modal
  const handleOpenPreview = (fmt: ExportFormatDefinition) => {
    setPreviewFormat(fmt);
    setIsModalOpen(true);
  };

  // Helper: Category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: EXPORT_FORMATS.length };
    for (const fmt of EXPORT_FORMATS) {
      counts[fmt.category] = (counts[fmt.category] || 0) + 1;
    }
    return counts;
  }, []);

  // Format category icon helper
  const getCategoryIcon = (category: ExportFormatCategory) => {
    switch (category) {
      case "spreadsheets":
        return <FileSpreadsheet className="h-5 w-5 text-emerald-500" />;
      case "documents":
        return <FileText className="h-5 w-5 text-indigo-500" />;
      case "flat":
        return <FileCode className="h-5 w-5 text-cyan-500" />;
      case "code":
        return <Braces className="h-5 w-5 text-amber-500" />;
      case "databases":
        return <Database className="h-5 w-5 text-blue-500" />;
      case "bigdata":
        return <Layers className="h-5 w-5 text-purple-500" />;
      case "images":
        return <ImageIcon className="h-5 w-5 text-teal-500" />;
      default:
        return <Table className="h-5 w-5 text-primary" />;
    }
  };

  // Badge color mapping
  const getBadgeStyle = (category: ExportFormatCategory) => {
    switch (category) {
      case "spreadsheets":
        return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
      case "documents":
        return "bg-indigo-500/10 text-indigo-500 border-indigo-500/20";
      case "flat":
        return "bg-cyan-500/10 text-cyan-500 border-cyan-500/20";
      case "code":
        return "bg-amber-500/10 text-amber-500 border-amber-500/20";
      case "databases":
        return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      case "bigdata":
        return "bg-purple-500/10 text-purple-500 border-purple-500/20";
      case "images":
        return "bg-teal-500/10 text-teal-500 border-teal-500/20";
      default:
        return "bg-accent text-muted-foreground border-border";
    }
  };

  if (!activeDataset || !activeSheet || !stats) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-muted-foreground bg-card border border-border rounded-2xl">
        <Download className="h-12 w-12 opacity-30 mb-3" />
        <h3 className="font-display font-semibold text-lg text-foreground mb-1">No Active Dataset</h3>
        <p className="text-xs max-w-sm mb-4">Please upload a spreadsheet file in the Upload tab before exporting files.</p>
        <Button size="sm" onClick={() => setActiveTab("upload")}>
          Go to Upload Tab
        </Button>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-y-auto gap-6 pr-1">
      {/* 1. TOP HEADER & DATASET SWITCHER */}
      <div className="flex flex-wrap items-center justify-between gap-4 shrink-0 bg-card border border-border rounded-2xl p-5 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <Download className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-display font-bold text-xl text-foreground">
                Universal Export & Report Hub
              </h2>
              <p className="text-xs text-muted-foreground font-medium">
                Convert your dataset into 27 professional formats with 100% private client-side processing & live previews
              </p>
            </div>
          </div>
        </div>

        {/* Dataset & Sheet Pill Selectors */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="px-3 py-1.5 bg-accent/60 border border-border rounded-xl text-muted-foreground flex items-center gap-2">
            <Database className="h-3.5 w-3.5 text-primary" />
            <span className="font-semibold text-foreground">{activeDataset.name}</span>
          </div>

          {activeDataset.sheets.length > 1 && (
            <div className="flex items-center gap-1.5 bg-accent/60 border border-border rounded-xl px-2.5 py-1 text-xs">
              <Table className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-muted-foreground font-semibold">Sheet:</span>
              <select
                value={activeSheet.name}
                onChange={(e) => setSelectedSheetName(e.target.value)}
                className="bg-transparent text-foreground font-semibold border-none outline-none cursor-pointer pr-1"
              >
                {activeDataset.sheets.map((s) => (
                  <option key={s.name} value={s.name} className="bg-card text-foreground">
                    {s.name} ({s.rows.length} rows)
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="px-3 py-1.5 bg-accent/60 border border-border rounded-xl text-muted-foreground flex items-center gap-1.5 font-mono">
            <span>{activeSheet.rows.length.toLocaleString()} rows</span>
            <span>•</span>
            <span>{activeSheet.headers.length} cols</span>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowStudentGuide(!showStudentGuide)}
            className="h-8 gap-1.5 text-xs border-primary/30 text-primary hover:bg-primary/10"
          >
            <BookOpen className="h-3.5 w-3.5" />
            <span>Format Guide</span>
          </Button>
        </div>
      </div>

      {/* 2. STUDENT-FRIENDLY FORMAT GUIDE (COLLAPSIBLE) */}
      {showStudentGuide && (
        <div className="p-5 bg-gradient-to-r from-primary/10 via-indigo-500/10 to-purple-500/10 border border-primary/30 rounded-2xl animate-in fade-in duration-200">
          <div className="flex items-start justify-between gap-4 mb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <h3 className="font-display font-bold text-sm text-foreground">
                Student & Beginner Guide: Which format should I choose?
              </h3>
            </div>
            <button
              onClick={() => setShowStudentGuide(false)}
              className="text-muted-foreground hover:text-foreground text-xs"
            >
              ✕ Close
            </button>
          </div>

          <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
            Think of export formats like saving a picture or writing a letter. Different programs prefer different file formats!
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <div className="p-3 bg-card/80 border border-border rounded-xl">
              <div className="font-bold text-foreground flex items-center gap-1.5 mb-1">
                <FileSpreadsheet className="h-4 w-4 text-emerald-500" />
                <span>School / Homework</span>
              </div>
              <p className="text-muted-foreground text-[11px] leading-normal">
                Pick <strong>Excel (.xlsx)</strong> or <strong>CSV (.csv)</strong>. They open easily in Microsoft Excel, Google Sheets, and LibreOffice.
              </p>
            </div>

            <div className="p-3 bg-card/80 border border-border rounded-xl">
              <div className="font-bold text-foreground flex items-center gap-1.5 mb-1">
                <FileText className="h-4 w-4 text-indigo-500" />
                <span>Reports & Papers</span>
              </div>
              <p className="text-muted-foreground text-[11px] leading-normal">
                Pick <strong>PDF (.pdf)</strong> to submit a clean printable report, or <strong>Word (.docx)</strong> if you want to edit it further.
              </p>
            </div>

            <div className="p-3 bg-card/80 border border-border rounded-xl">
              <div className="font-bold text-foreground flex items-center gap-1.5 mb-1">
                <Braces className="h-4 w-4 text-amber-500" />
                <span>Coding / Python Projects</span>
              </div>
              <p className="text-muted-foreground text-[11px] leading-normal">
                Pick <strong>JSON (.json)</strong> or <strong>CSV (.csv)</strong>. They work with Python, Pandas, Javascript, and web apps with zero setup.
              </p>
            </div>

            <div className="p-3 bg-card/80 border border-border rounded-xl">
              <div className="font-bold text-foreground flex items-center gap-1.5 mb-1">
                <Layers className="h-4 w-4 text-purple-500" />
                <span>Big Data & Fast Queries</span>
              </div>
              <p className="text-muted-foreground text-[11px] leading-normal">
                Pick <strong>Parquet (.parquet)</strong> or <strong>Arrow (.arrow)</strong>. They compress large files and run queries up to 100x faster!
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 3. SEARCH & CATEGORY FILTER TABS */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 shrink-0">
        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full text-xs font-semibold scrollbar-thin">
          <button
            onClick={() => setSelectedCategory("all")}
            className={`px-3 py-1.5 rounded-xl border transition-all whitespace-nowrap flex items-center gap-1.5 ${
              selectedCategory === "all"
                ? "bg-primary text-primary-foreground border-primary shadow-sm"
                : "bg-card border-border text-muted-foreground hover:bg-accent hover:text-foreground"
            }`}
          >
            <span>All Formats</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/20">
              {categoryCounts.all}
            </span>
          </button>

          <button
            onClick={() => setSelectedCategory("spreadsheets")}
            className={`px-3 py-1.5 rounded-xl border transition-all whitespace-nowrap flex items-center gap-1.5 ${
              selectedCategory === "spreadsheets"
                ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                : "bg-card border-border text-muted-foreground hover:bg-accent hover:text-foreground"
            }`}
          >
            <FileSpreadsheet className="h-3.5 w-3.5" />
            <span>Spreadsheets</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/20">
              {categoryCounts.spreadsheets || 0}
            </span>
          </button>

          <button
            onClick={() => setSelectedCategory("documents")}
            className={`px-3 py-1.5 rounded-xl border transition-all whitespace-nowrap flex items-center gap-1.5 ${
              selectedCategory === "documents"
                ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                : "bg-card border-border text-muted-foreground hover:bg-accent hover:text-foreground"
            }`}
          >
            <FileText className="h-3.5 w-3.5" />
            <span>Documents</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/20">
              {categoryCounts.documents || 0}
            </span>
          </button>

          <button
            onClick={() => setSelectedCategory("flat")}
            className={`px-3 py-1.5 rounded-xl border transition-all whitespace-nowrap flex items-center gap-1.5 ${
              selectedCategory === "flat"
                ? "bg-cyan-600 text-white border-cyan-600 shadow-sm"
                : "bg-card border-border text-muted-foreground hover:bg-accent hover:text-foreground"
            }`}
          >
            <FileCode className="h-3.5 w-3.5" />
            <span>Flat Text</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/20">
              {categoryCounts.flat || 0}
            </span>
          </button>

          <button
            onClick={() => setSelectedCategory("code")}
            className={`px-3 py-1.5 rounded-xl border transition-all whitespace-nowrap flex items-center gap-1.5 ${
              selectedCategory === "code"
                ? "bg-amber-600 text-white border-amber-600 shadow-sm"
                : "bg-card border-border text-muted-foreground hover:bg-accent hover:text-foreground"
            }`}
          >
            <Braces className="h-3.5 w-3.5" />
            <span>Data & Code</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/20">
              {categoryCounts.code || 0}
            </span>
          </button>

          <button
            onClick={() => setSelectedCategory("databases")}
            className={`px-3 py-1.5 rounded-xl border transition-all whitespace-nowrap flex items-center gap-1.5 ${
              selectedCategory === "databases"
                ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                : "bg-card border-border text-muted-foreground hover:bg-accent hover:text-foreground"
            }`}
          >
            <Database className="h-3.5 w-3.5" />
            <span>Databases</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/20">
              {categoryCounts.databases || 0}
            </span>
          </button>

          <button
            onClick={() => setSelectedCategory("bigdata")}
            className={`px-3 py-1.5 rounded-xl border transition-all whitespace-nowrap flex items-center gap-1.5 ${
              selectedCategory === "bigdata"
                ? "bg-purple-600 text-white border-purple-600 shadow-sm"
                : "bg-card border-border text-muted-foreground hover:bg-accent hover:text-foreground"
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            <span>Big Data</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/20">
              {categoryCounts.bigdata || 0}
            </span>
          </button>

          <button
            onClick={() => setSelectedCategory("images")}
            className={`px-3 py-1.5 rounded-xl border transition-all whitespace-nowrap flex items-center gap-1.5 ${
              selectedCategory === "images"
                ? "bg-teal-600 text-white border-teal-600 shadow-sm"
                : "bg-card border-border text-muted-foreground hover:bg-accent hover:text-foreground"
            }`}
          >
            <ImageIcon className="h-3.5 w-3.5" />
            <span>Images</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/20">
              {categoryCounts.images || 0}
            </span>
          </button>
        </div>

        {/* Search input */}
        <div className="relative min-w-[260px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search 27 formats (e.g. parquet, xlsx, docx, json)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-card border border-border rounded-xl text-xs text-foreground placeholder:text-muted-foreground focus:ring-1 focus:ring-primary outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* 4. FORMAT CARDS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredFormats.map((fmt) => {
          const isDownloading = quickDownloadingId === fmt.id;

          return (
            <div
              key={fmt.id}
              onClick={() => handleOpenPreview(fmt)}
              className="group bg-card border border-border rounded-2xl p-4 shadow-sm hover:shadow-md hover:border-primary/40 transition-all cursor-pointer flex flex-col justify-between relative overflow-hidden"
            >
              {/* Top Accent Strip */}
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="h-10 w-10 rounded-xl bg-accent border border-border flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      {getCategoryIcon(fmt.category)}
                    </div>
                    <div>
                      <h3 className="font-display font-bold text-sm text-foreground group-hover:text-primary transition-colors flex items-center gap-1.5">
                        <span>{fmt.name}</span>
                      </h3>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="font-mono font-bold text-xs text-primary">
                          {fmt.extension}
                        </span>
                        <span className={`px-2 py-0.2 rounded-full text-[10px] font-semibold border ${getBadgeStyle(fmt.category)}`}>
                          {fmt.categoryLabel}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                  {fmt.description}
                </p>

                <div className="pt-2 border-t border-border/50">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
                    Ideal For:
                  </span>
                  <p className="text-[11px] text-foreground/80 font-medium truncate mt-0.5">
                    {fmt.bestFor}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 mt-2 flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenPreview(fmt);
                  }}
                  className="flex-1 h-8 text-xs gap-1.5 group-hover:border-primary/40"
                >
                  <Eye className="h-3.5 w-3.5 text-primary" />
                  <span>Preview</span>
                </Button>

                <Button
                  variant="primary"
                  size="sm"
                  onClick={(e) => handleQuickDownload(e, fmt)}
                  disabled={isDownloading}
                  className="h-8 px-3 text-xs gap-1"
                  title={`Quick Download ${fmt.extension}`}
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>{isDownloading ? "..." : "Export"}</span>
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {filteredFormats.length === 0 && (
        <div className="p-12 text-center bg-card border border-border rounded-2xl text-muted-foreground">
          <Search className="h-10 w-10 mx-auto opacity-30 mb-2" />
          <h4 className="font-semibold text-foreground text-sm">No matching export formats found</h4>
          <p className="text-xs mt-1">Try searching for &quot;parquet&quot;, &quot;excel&quot;, &quot;csv&quot;, or click &quot;All Formats&quot;.</p>
        </div>
      )}

      {/* 5. PRIVACY & ARCHITECTURE FOOTNOTE */}
      <div className="p-4 bg-accent/30 border border-border rounded-2xl text-xs text-muted-foreground flex items-center justify-between gap-4 font-medium shrink-0">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
          <p>
            <span className="font-bold text-foreground">Zero-Server Data Guarantee:</span> All 27 formats are generated using in-browser WebAssembly, SheetJS, and TypedArray memory buffers. Your data never touches any external server or API.
          </p>
        </div>
        <span className="font-mono text-[11px] text-muted-foreground shrink-0 hidden sm:inline">
          Report-IQ Export Engine v2.0
        </span>
      </div>

      {/* 6. MODAL PREVIEW & CONFIGURATION DIALOG */}
      <ExportPreviewModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setPreviewFormat(null);
        }}
        format={previewFormat}
        sheet={activeSheet}
        datasetName={activeDataset.name}
        stats={stats}
      />
    </div>
  );
}
