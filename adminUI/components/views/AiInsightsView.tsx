import React, { useState, useMemo } from "react";
import { useAnalyticsStore } from "@/store/useAnalyticsStore";
import { analyzeDataset } from "@/utils/dataOperations";
import { exportToPdf } from "@/utils/pdfExporter";
import { toast } from "@/components/ui/toast";
import { 
  Download, 
  FileSpreadsheet, 
  FileText, 
  FileCode,
  Database,
  Table,
  CheckCircle,
  HelpCircle,
  FileArchive
} from "lucide-react";
import { Button } from "@/components/ui/button";
import * as XLSX from "xlsx";

export function AiInsightsView() {
  const datasets = useAnalyticsStore((state) => state.datasets);
  const selectedDatasetId = useAnalyticsStore((state) => state.selectedDatasetId);
  const selectedSheetName = useAnalyticsStore((state) => state.selectedSheetName);
  const setActiveTab = useAnalyticsStore((state) => state.setActiveTab);

  // Active dataset & sheet
  const activeDataset = useMemo(() => {
    return datasets.find((d) => d.id === selectedDatasetId) || null;
  }, [datasets, selectedDatasetId]);

  const activeSheet = useMemo(() => {
    if (!activeDataset || !selectedSheetName) return null;
    return activeDataset.sheets.find((s) => s.name === selectedSheetName) || activeDataset.sheets[0] || null;
  }, [activeDataset, selectedSheetName]);

  // Compute profiling statistics for report compilation
  const stats = useMemo(() => {
    if (!activeSheet) return null;
    return analyzeDataset(activeSheet);
  }, [activeSheet]);

  const [includeStats, setIncludeStats] = useState(true);
  const [includePreview, setIncludePreview] = useState(true);

  // Export Excel
  const handleExportExcel = () => {
    if (!activeSheet) return;

    try {
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(activeSheet.rows);
      XLSX.utils.book_append_sheet(wb, ws, activeSheet.name.substring(0, 30));
      
      const fileName = `${activeDataset?.name.replace(/\.[^/.]+$/, "")}_Export.xlsx`;
      XLSX.writeFile(wb, fileName);
      toast.success(`Spreadsheet exported: ${fileName}`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to compile Excel spreadsheet");
    }
  };

  // Export CSV
  const handleExportCsv = () => {
    if (!activeSheet) return;

    try {
      const ws = XLSX.utils.json_to_sheet(activeSheet.rows);
      const csv = XLSX.utils.sheet_to_csv(ws);
      
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement("a");
      link.href = url;
      link.download = `${activeSheet.name}_Export.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success("CSV file downloaded successfully!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate CSV data");
    }
  };

  // Export PDF Report
  const handleExportPdf = () => {
    if (!activeSheet || !stats || !activeDataset) return;

    try {
      // Find any active chart canvas on the DOM to embed as preview (if Vis tab was loaded)
      const chartImages: string[] = [];
      const svgElements = document.querySelectorAll(".recharts-wrapper svg");
      
      if (svgElements.length > 0) {
        // Can convert SVGs on screen to base64 if needed, but standard tables & summary are built in
      }

      exportToPdf({
        sheet: activeSheet,
        stats,
        datasetName: activeDataset.name,
        chartImages,
      });

      toast.success("PDF Executive Report generated!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to compile PDF Report");
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
    <div className="flex-1 flex flex-col min-h-0 overflow-y-auto gap-6">
      
      <div className="flex flex-wrap items-center justify-between gap-4 shrink-0">
        <div>
          <h2 className="font-display font-bold text-2xl text-foreground flex items-center gap-2">
            <Download className="h-6 w-6 text-primary" />
            <span>Export & Report Center</span>
          </h2>
          <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider block mt-0.5">
            Download cleaned, merged, or filtered sheets in multiple file specifications
          </span>
        </div>

        {/* Info indicators */}
        <div className="flex gap-2 text-xs font-semibold">
          <div className="px-2.5 py-1 bg-accent border border-border rounded-lg text-muted-foreground flex items-center gap-1.5">
            <Database className="h-3.5 w-3.5" />
            <span className="text-foreground">{activeDataset.name}</span>
          </div>
          <div className="px-2.5 py-1 bg-accent border border-border rounded-lg text-muted-foreground flex items-center gap-1.5">
            <Table className="h-3.5 w-3.5" />
            <span className="text-foreground">{activeSheet.name}</span>
          </div>
        </div>
      </div>

      {/* Grid of export cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Card 1: Excel */}
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm flex flex-col justify-between hover:shadow-md transition-all">
          <div className="space-y-4">
            <div className="h-10 w-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-display font-bold text-base text-foreground">Excel Worksheet (.xlsx)</h3>
              <p className="text-xs text-muted-foreground font-semibold uppercase mt-0.5">Format: SheetJS OpenXML</p>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed font-medium">
              Saves the currently active grid sheet containing all text casing fixes, null value fills, and applied filters as a native Excel file.
            </p>
          </div>
          <Button variant="outline" className="w-full mt-6 gap-1.5 border-emerald-500/20 hover:bg-emerald-500/5 hover:text-emerald-500 text-foreground" onClick={handleExportExcel}>
            <Download className="h-4 w-4" />
            <span>Download Excel</span>
          </Button>
        </div>

        {/* Card 2: CSV */}
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm flex flex-col justify-between hover:shadow-md transition-all">
          <div className="space-y-4">
            <div className="h-10 w-10 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-500 flex items-center justify-center">
              <FileCode className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-display font-bold text-base text-foreground">Comma Separated Values (.csv)</h3>
              <p className="text-xs text-muted-foreground font-semibold uppercase mt-0.5">Format: Plain Text CSV</p>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed font-medium">
              Exports the spreadsheet data using comma separators. Ideal for database ingestion, python scripts, and third-party dashboards.
            </p>
          </div>
          <Button variant="outline" className="w-full mt-6 gap-1.5 border-cyan-500/20 hover:bg-cyan-500/5 hover:text-cyan-500 text-foreground" onClick={handleExportCsv}>
            <Download className="h-4 w-4" />
            <span>Download CSV</span>
          </Button>
        </div>

        {/* Card 3: PDF */}
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm flex flex-col justify-between hover:shadow-md transition-all">
          <div className="space-y-4">
            <div className="h-10 w-10 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-500 flex items-center justify-center">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-display font-bold text-base text-foreground">Executive PDF Report</h3>
              <p className="text-xs text-muted-foreground font-semibold uppercase mt-0.5">Format: jsPDF Document</p>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed font-medium">
              Compiles metadata parameters, statistical anomalies, columns schema completeness tables, and an active data preview table.
            </p>

            {/* Toggles */}
            <div className="space-y-2 pt-2 border-t border-border">
              <label className="flex items-center gap-2 text-xs font-semibold text-foreground/80 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeStats}
                  onChange={(e) => setIncludeStats(e.target.checked)}
                  className="rounded border-border text-primary focus:ring-primary/40 h-3.5 w-3.5"
                />
                <span>Include Quality Diagnostics</span>
              </label>
              <label className="flex items-center gap-2 text-xs font-semibold text-foreground/80 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includePreview}
                  onChange={(e) => setIncludePreview(e.target.checked)}
                  className="rounded border-border text-primary focus:ring-primary/40 h-3.5 w-3.5"
                />
                <span>Include Data Grid Preview</span>
              </label>
            </div>
          </div>
          <Button variant="primary" className="w-full mt-6 gap-1.5" onClick={handleExportPdf}>
            <Download className="h-4 w-4" />
            <span>Generate PDF Report</span>
          </Button>
        </div>

      </div>

      {/* Security alert footnote */}
      <div className="p-4 bg-accent/40 border border-border rounded-xl text-xs text-muted-foreground leading-normal flex gap-2 font-medium">
        <CheckCircle className="h-4.5 w-4.5 text-success shrink-0 mt-0.5" />
        <p>
          <span className="font-bold text-foreground">Secure Local Processing Guaranteed:</span> Because this analytical software executes entirely within the Javascript runtime of your local web browser, clicking download does not trigger any network transfers or API calls. Your corporate spreadsheets remain 100% private and protected by your device's sandbox.
        </p>
      </div>
    </div>
  );
}
