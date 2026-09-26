import React, { useState, useMemo } from "react";
import { useAnalyticsStore } from "@/store/useAnalyticsStore";
import { analyzeDataset } from "@/utils/dataOperations";
import { toast } from "@/components/ui/toast";
import { 
  Brain, 
  Sparkles, 
  AlertTriangle, 
  CheckCircle2, 
  ArrowRight, 
  Table, 
  FileSpreadsheet, 
  Layers, 
  Lightbulb, 
  SlidersHorizontal, 
  Download, 
  Copy, 
  ChevronRight, 
  Info, 
  TrendingUp, 
  BarChart3, 
  Database, 
  Filter, 
  ShieldAlert, 
  ShieldCheck, 
  Activity, 
  RefreshCw, 
  FileText,
  Check,
  Zap,
  Grid3X3,
  Columns
} from "lucide-react";
import { Button } from "@/components/ui/button";
import * as XLSX from "xlsx";

type AggFunction = "sum" | "avg" | "count" | "min" | "max";

export function AiInsightsView() {
  const datasets = useAnalyticsStore((state) => state.datasets);
  const selectedDatasetId = useAnalyticsStore((state) => state.selectedDatasetId);
  const selectedSheetName = useAnalyticsStore((state) => state.selectedSheetName);
  const selectDataset = useAnalyticsStore((state) => state.selectDataset);
  const selectSheet = useAnalyticsStore((state) => state.selectSheet);
  const setActiveTab = useAnalyticsStore((state) => state.setActiveTab);

  // Active dataset & sheet
  const activeDataset = useMemo(() => {
    return datasets.find((d) => d.id === selectedDatasetId) || null;
  }, [datasets, selectedDatasetId]);

  const activeSheet = useMemo(() => {
    if (!activeDataset || !selectedSheetName) return null;
    return activeDataset.sheets.find((s) => s.name === selectedSheetName) || activeDataset.sheets[0] || null;
  }, [activeDataset, selectedSheetName]);

  // Compute profiling statistics
  const stats = useMemo(() => {
    if (!activeSheet) return null;
    return analyzeDataset(activeSheet);
  }, [activeSheet]);

  // View state for High Quality mode: "profile" vs "pivot"
  const [activeTabMode, setActiveTabMode] = useState<"profile" | "pivot">("profile");

  // Pivot Table configuration state
  const [rowField, setRowField] = useState<string>("");
  const [colField, setColField] = useState<string>("none");
  const [valField, setValField] = useState<string>("");
  const [aggFunc, setAggFunc] = useState<AggFunction>("sum");

  // Search filter for column list
  const [searchColQuery, setSearchColQuery] = useState("");

  // Categorize columns
  const columnCategories = useMemo(() => {
    if (!activeSheet) return { numeric: [], categorical: [], all: [] };
    const numeric: string[] = [];
    const categorical: string[] = [];

    activeSheet.headers.forEach((h) => {
      const type = activeSheet.columnTypes[h];
      if (type === "number") {
        numeric.push(h);
      } else {
        categorical.push(h);
      }
    });

    return { numeric, categorical, all: activeSheet.headers };
  }, [activeSheet]);

  // Auto-initialize Pivot configuration when sheet changes
  React.useEffect(() => {
    if (activeSheet && activeSheet.headers.length > 0) {
      const cats = columnCategories.categorical;
      const nums = columnCategories.numeric;

      setRowField(cats[0] || activeSheet.headers[0]);
      setColField(cats[1] || "none");
      setValField(nums[0] || activeSheet.headers[0]);
      setAggFunc(nums.length > 0 ? "sum" : "count");
    }
  }, [activeSheet, columnCategories]);

  // Calculate total missing cells
  const totalMissingCells = useMemo(() => {
    if (!stats) return 0;
    return stats.nullSummaries.reduce((acc, curr) => acc + curr.missingCount, 0);
  }, [stats]);

  // Columns with missing values
  const missingColumns = useMemo(() => {
    if (!stats) return [];
    return stats.nullSummaries
      .filter((s) => s.missingCount > 0)
      .sort((a, b) => b.missingPercentage - a.missingPercentage);
  }, [stats]);

  // Detailed statistics for each column (for High Quality Profile view)
  const columnProfiles = useMemo(() => {
    if (!activeSheet) return [];

    return activeSheet.headers.map((header) => {
      const type = activeSheet.columnTypes[header] || "string";
      const total = activeSheet.rows.length;
      let nonNullCount = 0;

      if (type === "number") {
        const nums: number[] = [];
        activeSheet.rows.forEach((r) => {
          const val = r[header];
          if (val !== null && val !== undefined && val !== "") {
            const num = Number(val);
            if (!isNaN(num)) {
              nums.push(num);
              nonNullCount++;
            }
          }
        });

        const sum = nums.reduce((a, b) => a + b, 0);
        const mean = nums.length > 0 ? sum / nums.length : 0;
        const sorted = [...nums].sort((a, b) => a - b);
        const min = sorted.length > 0 ? sorted[0] : 0;
        const max = sorted.length > 0 ? sorted[sorted.length - 1] : 0;
        const mid = Math.floor(sorted.length / 2);
        const median = sorted.length === 0 ? 0 : sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;

        return {
          header,
          type,
          nonNullCount,
          completeness: total > 0 ? ((nonNullCount / total) * 100).toFixed(1) : "0",
          stats: { min, max, mean, median, sum },
        };
      } else {
        const valueCounts: Record<string, number> = {};
        activeSheet.rows.forEach((r) => {
          const val = r[header];
          if (val !== null && val !== undefined && val !== "") {
            nonNullCount++;
            const s = String(val);
            valueCounts[s] = (valueCounts[s] || 0) + 1;
          }
        });

        const uniqueCount = Object.keys(valueCounts).length;
        let topVal = "None";
        let topValCount = 0;
        Object.entries(valueCounts).forEach(([k, count]) => {
          if (count > topValCount) {
            topVal = k;
            topValCount = count;
          }
        });

        return {
          header,
          type,
          nonNullCount,
          completeness: total > 0 ? ((nonNullCount / total) * 100).toFixed(1) : "0",
          stats: {
            uniqueCount,
            topVal,
            topValCount,
            topValPercent: total > 0 ? ((topValCount / total) * 100).toFixed(1) : "0",
          },
        };
      }
    });
  }, [activeSheet]);

  // Pivot Table Computation
  const pivotData = useMemo(() => {
    if (!activeSheet || !rowField || !valField) return null;

    const rows = activeSheet.rows;

    // Distinct Row Keys
    const rawRowKeys = Array.from(
      new Set(rows.map((r) => (r[rowField] !== null && r[rowField] !== undefined && r[rowField] !== "" ? String(r[rowField]) : "(Blank)")))
    ).sort();

    // Limit to top 50 row categories for UI performance
    const rowKeys = rawRowKeys.slice(0, 50);

    // Distinct Col Keys
    const hasColDimension = colField && colField !== "none";
    const rawColKeys = hasColDimension
      ? Array.from(
          new Set(rows.map((r) => (r[colField] !== null && r[colField] !== undefined && r[colField] !== "" ? String(r[colField]) : "(Blank)")))
        ).sort()
      : ["(Total)"];

    // Limit to top 15 column categories for horizontal table fit
    const colKeys = rawColKeys.slice(0, 15);

    // Matrix buckets: [rKey][cKey] = number[]
    const cellBuckets: Record<string, Record<string, number[]>> = {};
    const rowBucketTotals: Record<string, number[]> = {};
    const colBucketTotals: Record<string, number[]> = {};
    const grandTotals: number[] = [];

    rowKeys.forEach((rk) => {
      cellBuckets[rk] = {};
      rowBucketTotals[rk] = [];
      colKeys.forEach((ck) => {
        cellBuckets[rk][ck] = [];
      });
    });

    colKeys.forEach((ck) => {
      colBucketTotals[ck] = [];
    });

    // Populate values
    rows.forEach((row) => {
      const rk = row[rowField] !== null && row[rowField] !== undefined && row[rowField] !== "" ? String(row[rowField]) : "(Blank)";
      const ck = hasColDimension
        ? row[colField] !== null && row[colField] !== undefined && row[colField] !== "" ? String(row[colField]) : "(Blank)"
        : "(Total)";

      if (cellBuckets[rk] && cellBuckets[rk][ck]) {
        const rawVal = row[valField];
        if (aggFunc === "count") {
          if (rawVal !== null && rawVal !== undefined && rawVal !== "") {
            cellBuckets[rk][ck].push(1);
            rowBucketTotals[rk].push(1);
            colBucketTotals[ck].push(1);
            grandTotals.push(1);
          }
        } else {
          const num = Number(rawVal);
          if (!isNaN(num) && rawVal !== null && rawVal !== undefined && rawVal !== "") {
            cellBuckets[rk][ck].push(num);
            rowBucketTotals[rk].push(num);
            colBucketTotals[ck].push(num);
            grandTotals.push(num);
          }
        }
      }
    });

    // Compute aggregated single values
    const computeAgg = (nums: number[]): number | null => {
      if (nums.length === 0) return null;
      if (aggFunc === "count") return nums.length;
      if (aggFunc === "sum") return nums.reduce((a, b) => a + b, 0);
      if (aggFunc === "avg") return nums.reduce((a, b) => a + b, 0) / nums.length;
      if (aggFunc === "min") return Math.min(...nums);
      if (aggFunc === "max") return Math.max(...nums);
      return null;
    };

    const matrix: Record<string, Record<string, number | null>> = {};
    const rowTotals: Record<string, number | null> = {};
    const colTotals: Record<string, number | null> = {};

    rowKeys.forEach((rk) => {
      matrix[rk] = {};
      colKeys.forEach((ck) => {
        matrix[rk][ck] = computeAgg(cellBuckets[rk][ck]);
      });
      rowTotals[rk] = computeAgg(rowBucketTotals[rk]);
    });

    colKeys.forEach((ck) => {
      colTotals[ck] = computeAgg(colBucketTotals[ck]);
    });

    const grandTotal = computeAgg(grandTotals);

    return {
      rowKeys,
      colKeys,
      matrix,
      rowTotals,
      colTotals,
      grandTotal,
      hasColDimension,
      isTruncatedRows: rawRowKeys.length > 50,
      isTruncatedCols: rawColKeys.length > 15,
    };
  }, [activeSheet, rowField, colField, valField, aggFunc]);

  // Export Pivot Table to Excel
  const handleExportPivotExcel = () => {
    if (!pivotData || !activeSheet) return;

    try {
      const wb = XLSX.utils.book_new();
      const exportRows: any[] = [];

      // Header row
      const headerRow: Record<string, any> = { [rowField]: "" };
      pivotData.colKeys.forEach((ck) => {
        headerRow[ck] = ck;
      });
      headerRow["Total"] = "Total";

      // Data rows
      pivotData.rowKeys.forEach((rk) => {
        const rowObj: Record<string, any> = { [rowField]: rk };
        pivotData.colKeys.forEach((ck) => {
          const val = pivotData.matrix[rk][ck];
          rowObj[ck] = val !== null ? Number(val.toFixed(2)) : "";
        });
        const rt = pivotData.rowTotals[rk];
        rowObj["Total"] = rt !== null ? Number(rt.toFixed(2)) : "";
        exportRows.push(rowObj);
      });

      // Total row
      const summaryRow: Record<string, any> = { [rowField]: "Grand Total" };
      pivotData.colKeys.forEach((ck) => {
        const ct = pivotData.colTotals[ck];
        summaryRow[ck] = ct !== null ? Number(ct.toFixed(2)) : "";
      });
      summaryRow["Total"] = pivotData.grandTotal !== null ? Number(pivotData.grandTotal.toFixed(2)) : "";
      exportRows.push(summaryRow);

      const ws = XLSX.utils.json_to_sheet(exportRows);
      XLSX.utils.book_append_sheet(wb, ws, "Pivot_Summary");
      
      const fileName = `${activeSheet.name}_Pivot_${aggFunc}.xlsx`;
      XLSX.writeFile(wb, fileName);
      toast.success(`Exported Pivot table as ${fileName}`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to export Pivot table");
    }
  };

  // Copy Pivot Table to Clipboard (TSV format)
  const handleCopyPivotClipboard = () => {
    if (!pivotData) return;

    try {
      let tsv = `${rowField}\t` + pivotData.colKeys.join("\t") + "\tTotal\n";

      pivotData.rowKeys.forEach((rk) => {
        tsv += rk + "\t";
        tsv += pivotData.colKeys
          .map((ck) => {
            const v = pivotData.matrix[rk][ck];
            return v !== null ? v.toFixed(2) : "";
          })
          .join("\t");
        tsv += "\t" + (pivotData.rowTotals[rk] !== null ? pivotData.rowTotals[rk]?.toFixed(2) : "") + "\n";
      });

      tsv += "Grand Total\t";
      tsv += pivotData.colKeys
        .map((ck) => {
          const v = pivotData.colTotals[ck];
          return v !== null ? v.toFixed(2) : "";
        })
        .join("\t");
      tsv += "\t" + (pivotData.grandTotal !== null ? pivotData.grandTotal.toFixed(2) : "") + "\n";

      navigator.clipboard.writeText(tsv);
      toast.success("Pivot table copied to clipboard! (Paste directly into Excel/Sheets)");
    } catch (err) {
      console.error(err);
      toast.error("Could not copy to clipboard");
    }
  };

  // Format cell value
  const formatCellValue = (val: number | null) => {
    if (val === null || val === undefined) return <span className="text-muted-foreground/40 font-mono">—</span>;
    if (aggFunc === "count") return <span className="font-mono">{val.toLocaleString()}</span>;
    if (Number.isInteger(val)) return <span className="font-mono">{val.toLocaleString()}</span>;
    return <span className="font-mono">{val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>;
  };

  // Empty state: No dataset loaded
  if (!activeDataset || !activeSheet || !stats) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-card border border-border rounded-2xl shadow-sm">
        <div className="h-16 w-16 rounded-2xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center mb-4 shadow-inner">
          <Brain className="h-8 w-8" />
        </div>
        <h3 className="font-display font-bold text-xl text-foreground mb-1.5">No Active Dataset Loaded</h3>
        <p className="text-xs text-muted-foreground max-w-md mb-6 leading-relaxed font-medium">
          Upload an Excel (.xlsx, .xls) or CSV file in the Upload tab to generate real-time AI Insights, health diagnostics, and automated pivot summaries.
        </p>
        <Button size="sm" className="gap-2" onClick={() => setActiveTab("upload")}>
          <FileSpreadsheet className="h-4 w-4" />
          <span>Upload Dataset</span>
        </Button>
      </div>
    );
  }

  const completenessScore = stats.completenessScore;
  const isLowQuality = completenessScore < 90;

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-y-auto gap-6 pb-6">
      
      {/* Top Header & Workspace Navigator */}
      <div className="flex flex-wrap items-center justify-between gap-4 shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shadow-sm">
              <Brain className="h-4.5 w-4.5" />
            </div>
            <h2 className="font-display font-bold text-2xl text-foreground">
              AI Insights & Data Quality Engine
            </h2>
          </div>
          <p className="text-xs text-muted-foreground font-medium mt-1">
            Automated completeness diagnostics, data profiling, and executive pivot summaries.
          </p>
        </div>

        {/* Dataset & Sheet Switchers */}
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
          {/* Dataset Switcher */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-accent/60 border border-border rounded-lg text-foreground">
            <Database className="h-3.5 w-3.5 text-primary" />
            <select
              value={selectedDatasetId || ""}
              onChange={(e) => selectDataset(e.target.value)}
              className="bg-transparent text-xs font-semibold focus:outline-none cursor-pointer"
            >
              {datasets.map((d) => (
                <option key={d.id} value={d.id} className="bg-card text-foreground">
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          {/* Sheet Switcher */}
          {activeDataset.sheets.length > 1 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-accent/60 border border-border rounded-lg text-foreground">
              <Table className="h-3.5 w-3.5 text-primary" />
              <select
                value={selectedSheetName || ""}
                onChange={(e) => selectSheet(e.target.value)}
                className="bg-transparent text-xs font-semibold focus:outline-none cursor-pointer"
              >
                {activeDataset.sheets.map((s) => (
                  <option key={s.name} value={s.name} className="bg-card text-foreground">
                    Sheet: {s.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* BRANCH 1: LOW QUALITY (< 90% COMPLETENESS SCORE)                          */}
      {/* ========================================================================= */}
      {isLowQuality ? (
        <div className="flex flex-col gap-6">
          
          {/* Prominent Action Alert Card with Direct Redirect to CleaningView */}
          <div className="rounded-2xl border-2 border-amber-500/40 bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent p-6 shadow-md relative overflow-hidden">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
              
              <div className="flex items-start gap-4">
                <div className="h-14 w-14 rounded-2xl bg-amber-500/20 border border-amber-500/30 text-amber-500 flex items-center justify-center shrink-0 shadow-sm">
                  <ShieldAlert className="h-7 w-7 animate-pulse" />
                </div>
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/30 text-[10px] font-bold text-amber-500 uppercase tracking-wider mb-1.5">
                    <AlertTriangle className="h-3 w-3" />
                    <span>Action Required • Below 90% Quality Benchmark</span>
                  </div>
                  <h3 className="font-display font-extrabold text-xl text-foreground">
                    Dataset Completeness is {completenessScore}%
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1 max-w-xl leading-relaxed font-medium">
                    This spreadsheet contains <strong className="text-foreground">{totalMissingCells.toLocaleString()} missing cells</strong> across <strong className="text-foreground">{missingColumns.length} columns</strong>. Data below 90% completeness produces unreliable aggregates, distorted averages, and biased analytics.
                  </p>
                </div>
              </div>

              {/* Redirect Button */}
              <div className="shrink-0 flex flex-col sm:flex-row gap-3">
                <Button
                  size="lg"
                  className="bg-amber-600 hover:bg-amber-700 text-white font-bold shadow-lg shadow-amber-600/20 gap-2 text-sm px-6 h-12"
                  onClick={() => {
                    setActiveTab("cleaning");
                    toast.info(`Redirected to Data Cleaning to repair ${activeSheet.name}`);
                  }}
                >
                  <Sparkles className="h-4.5 w-4.5" />
                  <span>Launch Data Cleaning Studio</span>
                  <ArrowRight className="h-4.5 w-4.5 ml-1" />
                </Button>
              </div>
            </div>

            {/* Completeness Progress Bar */}
            <div className="mt-6 pt-4 border-t border-amber-500/20">
              <div className="flex items-center justify-between text-xs mb-1.5 font-semibold">
                <span className="text-muted-foreground">Current Quality Index</span>
                <span className="text-amber-500 font-bold font-mono">{completenessScore}% / 100%</span>
              </div>
              <div className="h-2.5 w-full bg-accent rounded-full overflow-hidden p-0.5 border border-border">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-amber-600 rounded-full transition-all duration-500"
                  style={{ width: `${Math.max(5, completenessScore)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Overview of Data KPI Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
              <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider block mb-1">
                Total Rows
              </span>
              <div className="text-xl font-bold font-display text-foreground">
                {stats.totalRows.toLocaleString()}
              </div>
              <span className="text-[10px] text-muted-foreground font-medium mt-0.5 block">
                Total records in sheet
              </span>
            </div>

            <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
              <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider block mb-1">
                Total Columns
              </span>
              <div className="text-xl font-bold font-display text-foreground">
                {stats.totalCols}
              </div>
              <span className="text-[10px] text-muted-foreground font-medium mt-0.5 block">
                Features / attributes
              </span>
            </div>

            <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
              <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider block mb-1">
                Missing Cells
              </span>
              <div className="text-xl font-bold font-display text-amber-500 font-mono">
                {totalMissingCells.toLocaleString()}
              </div>
              <span className="text-[10px] text-amber-500/80 font-medium mt-0.5 block">
                {((100 - completenessScore)).toFixed(1)}% empty rate
              </span>
            </div>

            <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
              <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider block mb-1">
                Duplicate Rows
              </span>
              <div className="text-xl font-bold font-display text-foreground font-mono">
                {stats.duplicateRows}
              </div>
              <span className="text-[10px] text-muted-foreground font-medium mt-0.5 block">
                Identical records
              </span>
            </div>

            <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
              <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider block mb-1">
                Empty Rows
              </span>
              <div className="text-xl font-bold font-display text-foreground font-mono">
                {stats.emptyRows}
              </div>
              <span className="text-[10px] text-muted-foreground font-medium mt-0.5 block">
                Zero data content
              </span>
            </div>
          </div>

          {/* Missing Columns Diagnostic Table */}
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-amber-500" />
                <h4 className="font-display font-bold text-sm text-foreground">
                  Incomplete Columns Requiring Imputation
                </h4>
              </div>
              <span className="text-xs text-muted-foreground font-semibold">
                {missingColumns.length} affected columns
              </span>
            </div>

            {missingColumns.length > 0 ? (
              <div className="overflow-x-auto border border-border rounded-lg">
                <table className="w-full text-left text-xs">
                  <thead className="bg-accent/50 text-muted-foreground font-semibold border-b border-border uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-2.5 px-4">Column Name</th>
                      <th className="py-2.5 px-4">Type</th>
                      <th className="py-2.5 px-4">Missing Count</th>
                      <th className="py-2.5 px-4">Missing %</th>
                      <th className="py-2.5 px-4">Recommended Cleaning Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border font-medium">
                    {missingColumns.map((col) => (
                      <tr key={col.columnName} className="hover:bg-accent/30 transition-colors">
                        <td className="py-2.5 px-4 font-semibold text-foreground">
                          {col.columnName}
                        </td>
                        <td className="py-2.5 px-4">
                          <span className="px-2 py-0.5 rounded-full bg-accent border border-border text-[10px] font-mono uppercase">
                            {col.type}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-amber-500 font-mono">
                          {col.missingCount.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-4">
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-1.5 bg-accent rounded-full overflow-hidden">
                              <div
                                className="h-full bg-amber-500 rounded-full"
                                style={{ width: `${Math.min(100, col.missingPercentage)}%` }}
                              />
                            </div>
                            <span className="font-mono text-muted-foreground text-[11px]">
                              {col.missingPercentage}%
                            </span>
                          </div>
                        </td>
                        <td className="py-2.5 px-4">
                          <span className="text-xs text-muted-foreground">
                            {col.type === "number"
                              ? "Impute with Mean or Median in Cleaning"
                              : col.missingPercentage > 50
                              ? "Consider dropping empty column"
                              : "Impute with Mode or custom label"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-xs text-muted-foreground py-4 text-center">
                No specific columns flagged for missing values.
              </div>
            )}
          </div>

          {/* Educational Insights: Why Completeness Score Matters */}
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Lightbulb className="h-5 w-5 text-primary" />
              <h3 className="font-display font-bold text-base text-foreground">
                Tips & Tricks: Why Data Completeness is Critical
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Tip 1 */}
              <div className="p-4 rounded-xl border border-border bg-accent/20 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-md bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0">
                    <Activity className="h-3.5 w-3.5" />
                  </div>
                  <h4 className="font-display font-bold text-xs text-foreground">
                    1. Prevents Statistical Calculation Bias
                  </h4>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed font-medium">
                  When numeric cells contain null or empty values, standard calculations like <code>SUM</code>, <code>AVERAGE</code>, and <code>VARIANCE</code> either silently drop the rows or evaluate to zero. This skews KPI projections and causes flawed strategic decisions.
                </p>
              </div>

              {/* Tip 2 */}
              <div className="p-4 rounded-xl border border-border bg-accent/20 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-md bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
                    <Table className="h-3.5 w-3.5" />
                  </div>
                  <h4 className="font-display font-bold text-xs text-foreground">
                    2. Avoids Blank Buckets in Pivot Tables
                  </h4>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed font-medium">
                  Pivot cross-tabulations and group-by summaries require categorical keys. If category or status columns have missing cells, records get lumped into an ambiguous <code>(Blank)</code> bucket, fragmenting your reports and hiding real trends.
                </p>
              </div>

              {/* Tip 3 */}
              <div className="p-4 rounded-xl border border-border bg-accent/20 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-md bg-indigo-500/10 text-indigo-500 flex items-center justify-center shrink-0">
                    <Brain className="h-3.5 w-3.5" />
                  </div>
                  <h4 className="font-display font-bold text-xs text-foreground">
                    3. Essential for Machine Learning & Forecasting
                  </h4>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed font-medium">
                  Predictive algorithms, regression engines, and AI agents immediately fail or drop entire records with <code>NaN</code> values. Maintaining 90%+ completeness ensures your sample size is preserved without survival bias.
                </p>
              </div>

              {/* Tip 4 */}
              <div className="p-4 rounded-xl border border-border bg-accent/20 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-md bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                    <Sparkles className="h-3.5 w-3.5" />
                  </div>
                  <h4 className="font-display font-bold text-xs text-foreground">
                    4. Fast Imputation Strategy Guide
                  </h4>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed font-medium">
                  Use <strong>Mean</strong> for normally distributed numbers, <strong>Median</strong> for skewed data with extreme outliers, and <strong>Mode</strong> for categorical labels. If a column has &gt;60% missing data, consider dropping it in the Data Cleaning tab.
                </p>
              </div>

            </div>

            {/* Bottom Redirect Footer */}
            <div className="mt-5 p-4 rounded-xl bg-primary/10 border border-primary/20 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-primary">
                <Zap className="h-4 w-4" />
                <span>Ready to clean? The Data Cleaning studio provides 1-click mean, median, and mode replacements.</span>
              </div>
              <Button
                size="sm"
                onClick={() => {
                  setActiveTab("cleaning");
                  toast.info("Navigated to Data Cleaning");
                }}
                className="gap-1.5 shrink-0"
              >
                <span>Go to Data Cleaning</span>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

        </div>
      ) : (
        /* ========================================================================= */
        /* BRANCH 2: HIGH QUALITY (>= 90% COMPLETENESS SCORE)                        */
        /* ========================================================================= */
        <div className="flex flex-col gap-6">
          
          {/* Quality Certification Banner */}
          <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent p-6 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              
              <div className="flex items-start gap-4">
                <div className="h-14 w-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-500 flex items-center justify-center shrink-0 shadow-sm">
                  <ShieldCheck className="h-7 w-7" />
                </div>
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-[10px] font-bold text-emerald-500 uppercase tracking-wider mb-1.5">
                    <CheckCircle2 className="h-3 w-3" />
                    <span>High Quality Dataset • Quality Verified</span>
                  </div>
                  <h3 className="font-display font-extrabold text-xl text-foreground">
                    Dataset Completeness: {completenessScore}% (Production Ready)
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1 max-w-xl leading-relaxed font-medium">
                    Excellent data integrity. Your spreadsheet satisfies high quality standards with {stats.totalRows.toLocaleString()} rows and {stats.totalCols} columns. It is ready for deep statistical profiling and multi-dimensional Pivot Table summarization.
                  </p>
                </div>
              </div>

              {/* Ready to Summarize with Pivot Tables Button */}
              <div className="shrink-0 flex items-center gap-3">
                <Button
                  size="lg"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-lg shadow-emerald-600/20 gap-2 text-sm px-6 h-12"
                  onClick={() => {
                    setActiveTabMode("pivot");
                    toast.success("Opened Pivot Table Studio");
                  }}
                >
                  <Grid3X3 className="h-5 w-5" />
                  <span>Summarize with Pivot Tables</span>
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </div>

            </div>

            {/* Sub-tab navigation */}
            <div className="flex items-center gap-2 mt-6 pt-4 border-t border-emerald-500/20">
              <button
                onClick={() => setActiveTabMode("profile")}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                  activeTabMode === "profile"
                    ? "bg-primary text-white shadow-sm"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                }`}
              >
                <Activity className="h-3.5 w-3.5" />
                <span>Data Health & Column Profiler</span>
              </button>
              <button
                onClick={() => setActiveTabMode("pivot")}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                  activeTabMode === "pivot"
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                }`}
              >
                <Grid3X3 className="h-3.5 w-3.5" />
                <span>Pivot Table Summary Matrix</span>
              </button>
            </div>
          </div>

          {/* VIEW MODE 1: DATA PROFILE OF UPLOADED DATA */}
          {activeTabMode === "profile" && (
            <div className="flex flex-col gap-6">
              
              {/* Overview Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
                  <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider block mb-1">
                    Verified Records
                  </span>
                  <div className="text-2xl font-bold font-display text-foreground">
                    {stats.totalRows.toLocaleString()}
                  </div>
                  <span className="text-[10px] text-emerald-500 font-medium mt-0.5 block flex items-center gap-1">
                    <Check className="h-3 w-3" /> 100% addressable rows
                  </span>
                </div>

                <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
                  <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider block mb-1">
                    Total Columns
                  </span>
                  <div className="text-2xl font-bold font-display text-foreground">
                    {stats.totalCols}
                  </div>
                  <span className="text-[10px] text-muted-foreground font-medium mt-0.5 block">
                    {columnCategories.numeric.length} numeric, {columnCategories.categorical.length} categorical
                  </span>
                </div>

                <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
                  <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider block mb-1">
                    Data Completeness
                  </span>
                  <div className="text-2xl font-bold font-display text-emerald-500 font-mono">
                    {completenessScore}%
                  </div>
                  <span className="text-[10px] text-emerald-500/80 font-medium mt-0.5 block">
                    Meets executive standard
                  </span>
                </div>

                <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
                  <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider block mb-1">
                    Duplicate Records
                  </span>
                  <div className="text-2xl font-bold font-display text-foreground font-mono">
                    {stats.duplicateRows}
                  </div>
                  <span className="text-[10px] text-muted-foreground font-medium mt-0.5 block">
                    {stats.duplicateRows === 0 ? "Zero redundancy detected" : "Identical rows identified"}
                  </span>
                </div>
              </div>

              {/* Detailed Column Profiler Section */}
              <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="font-display font-bold text-base text-foreground flex items-center gap-2">
                      <Columns className="h-4 w-4 text-primary" />
                      <span>Comprehensive Column Profile & Statistical Distribution</span>
                    </h4>
                    <p className="text-xs text-muted-foreground font-medium mt-0.5">
                      Detailed profiling across numeric measures and categorical dimensions.
                    </p>
                  </div>

                  {/* Search filter for columns */}
                  <div className="w-full sm:w-64">
                    <input
                      type="text"
                      placeholder="Search column schema..."
                      value={searchColQuery}
                      onChange={(e) => setSearchColQuery(e.target.value)}
                      className="w-full bg-accent/40 text-foreground border border-border rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/40 font-medium"
                    />
                  </div>
                </div>

                {/* Profiler Table */}
                <div className="overflow-x-auto border border-border rounded-lg">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-accent/50 text-muted-foreground font-semibold border-b border-border uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="py-2.5 px-4">Column Name</th>
                        <th className="py-2.5 px-4">Data Type</th>
                        <th className="py-2.5 px-4">Valid Count</th>
                        <th className="py-2.5 px-4">Completeness</th>
                        <th className="py-2.5 px-4">Summary Statistics / Cardinality</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border font-medium">
                      {columnProfiles
                        .filter((c) => c.header.toLowerCase().includes(searchColQuery.toLowerCase()))
                        .map((col) => (
                          <tr key={col.header} className="hover:bg-accent/30 transition-colors">
                            <td className="py-3 px-4 font-semibold text-foreground">
                              {col.header}
                            </td>
                            <td className="py-3 px-4">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-mono uppercase border ${
                                  col.type === "number"
                                    ? "bg-blue-500/10 text-blue-500 border-blue-500/20"
                                    : "bg-purple-500/10 text-purple-500 border-purple-500/20"
                                }`}
                              >
                                {col.type}
                              </span>
                            </td>
                            <td className="py-3 px-4 font-mono text-foreground">
                              {col.nonNullCount.toLocaleString()} / {stats.totalRows.toLocaleString()}
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                <div className="w-14 h-1.5 bg-accent rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-emerald-500 rounded-full"
                                    style={{ width: `${col.completeness}%` }}
                                  />
                                </div>
                                <span className="font-mono text-muted-foreground text-[11px]">
                                  {col.completeness}%
                                </span>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              {col.type === "number" && "min" in col.stats ? (
                                <div className="flex flex-wrap items-center gap-3 text-[11px] font-mono text-muted-foreground">
                                  <span>Min: <strong className="text-foreground">{col.stats.min.toLocaleString()}</strong></span>
                                  <span>Mean: <strong className="text-foreground">{col.stats.mean.toFixed(2)}</strong></span>
                                  <span>Median: <strong className="text-foreground">{col.stats.median.toLocaleString()}</strong></span>
                                  <span>Max: <strong className="text-foreground">{col.stats.max.toLocaleString()}</strong></span>
                                </div>
                              ) : "uniqueCount" in col.stats ? (
                                <div className="flex flex-wrap items-center gap-3 text-[11px] font-mono text-muted-foreground">
                                  <span>Unique: <strong className="text-foreground">{col.stats.uniqueCount.toLocaleString()}</strong></span>
                                  <span>
                                    Mode: <strong className="text-foreground">"{col.stats.topVal.substring(0, 15)}"</strong> ({col.stats.topValPercent}%)
                                  </span>
                                </div>
                              ) : null}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>

              </div>

            </div>
          )}

          {/* VIEW MODE 2: INTERACTIVE PIVOT TABLE SUMMARY STUDIO */}
          {activeTabMode === "pivot" && (
            <div className="flex flex-col gap-6">
              
              {/* Configuration Controls Bar */}
              <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <div className="flex items-center gap-2">
                    <Grid3X3 className="h-4.5 w-4.5 text-emerald-500" />
                    <h4 className="font-display font-bold text-sm text-foreground">
                      Pivot Table Aggregator Controls
                    </h4>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCopyPivotClipboard}
                      className="gap-1.5 text-xs text-foreground"
                    >
                      <Copy className="h-3.5 w-3.5" />
                      <span>Copy TSV</span>
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleExportPivotExcel}
                      className="gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span>Export Pivot Excel</span>
                    </Button>
                  </div>
                </div>

                {/* 4 Dimension & Value Dropdowns */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
                  
                  {/* 1. Row Dimension */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                      Row Dimension (Y-Axis)
                    </label>
                    <select
                      value={rowField}
                      onChange={(e) => setRowField(e.target.value)}
                      className="w-full bg-accent/40 text-foreground border border-border rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer"
                    >
                      {activeSheet.headers.map((h) => (
                        <option key={h} value={h} className="bg-card text-foreground">
                          {h} ({activeSheet.columnTypes[h]})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* 2. Column Dimension */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                      Column Dimension (X-Axis)
                    </label>
                    <select
                      value={colField}
                      onChange={(e) => setColField(e.target.value)}
                      className="w-full bg-accent/40 text-foreground border border-border rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer"
                    >
                      <option value="none" className="bg-card text-foreground">
                        (None - Single Metric View)
                      </option>
                      {activeSheet.headers
                        .filter((h) => h !== rowField)
                        .map((h) => (
                          <option key={h} value={h} className="bg-card text-foreground">
                            {h} ({activeSheet.columnTypes[h]})
                          </option>
                        ))}
                    </select>
                  </div>

                  {/* 3. Value Column */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                      Value Metric Field
                    </label>
                    <select
                      value={valField}
                      onChange={(e) => setValField(e.target.value)}
                      className="w-full bg-accent/40 text-foreground border border-border rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer"
                    >
                      {activeSheet.headers.map((h) => (
                        <option key={h} value={h} className="bg-card text-foreground">
                          {h} {activeSheet.columnTypes[h] === "number" ? "★ (numeric)" : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* 4. Aggregation Function */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                      Aggregation Formula
                    </label>
                    <select
                      value={aggFunc}
                      onChange={(e) => setAggFunc(e.target.value as AggFunction)}
                      className="w-full bg-accent/40 text-foreground border border-border rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer"
                    >
                      <option value="sum" className="bg-card text-foreground">SUM (Total)</option>
                      <option value="avg" className="bg-card text-foreground">AVERAGE (Mean)</option>
                      <option value="count" className="bg-card text-foreground">COUNT (Record Frequency)</option>
                      <option value="min" className="bg-card text-foreground">MIN (Minimum Value)</option>
                      <option value="max" className="bg-card text-foreground">MAX (Maximum Value)</option>
                    </select>
                  </div>

                </div>
              </div>

              {/* Pivot Result Matrix */}
              <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Table className="h-4 w-4 text-primary" />
                    <h4 className="font-display font-bold text-sm text-foreground">
                      Pivot Cross-Tabulation Matrix: {aggFunc.toUpperCase()}({valField}) by {rowField} {colField !== "none" ? `vs. ${colField}` : ""}
                    </h4>
                  </div>
                  <span className="text-xs text-muted-foreground font-semibold">
                    {pivotData ? `${pivotData.rowKeys.length} rows × ${pivotData.colKeys.length} columns` : ""}
                  </span>
                </div>

                {pivotData ? (
                  <div className="overflow-x-auto border border-border rounded-lg max-h-[500px] overflow-y-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="sticky top-0 z-10 bg-accent text-foreground font-bold border-b border-border shadow-sm uppercase tracking-wider text-[10px]">
                        <tr>
                          <th className="py-3 px-4 border-r border-border bg-accent sticky left-0 z-20">
                            {rowField}
                          </th>
                          {pivotData.colKeys.map((ck) => (
                            <th key={ck} className="py-3 px-4 border-r border-border text-right whitespace-nowrap">
                              {ck}
                            </th>
                          ))}
                          <th className="py-3 px-4 text-right bg-primary/10 text-primary font-extrabold whitespace-nowrap">
                            Row Total
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border font-medium">
                        {pivotData.rowKeys.map((rk) => (
                          <tr key={rk} className="hover:bg-accent/40 transition-colors">
                            <td className="py-2.5 px-4 font-semibold text-foreground border-r border-border bg-card sticky left-0 z-10 whitespace-nowrap">
                              {rk}
                            </td>
                            {pivotData.colKeys.map((ck) => (
                              <td key={ck} className="py-2.5 px-4 text-right border-r border-border whitespace-nowrap">
                                {formatCellValue(pivotData.matrix[rk][ck])}
                              </td>
                            ))}
                            <td className="py-2.5 px-4 text-right font-bold text-foreground bg-primary/5 whitespace-nowrap">
                              {formatCellValue(pivotData.rowTotals[rk])}
                            </td>
                          </tr>
                        ))}

                        {/* Grand Total Row */}
                        <tr className="sticky bottom-0 z-10 bg-accent/90 border-t-2 border-border font-bold text-foreground">
                          <td className="py-3 px-4 border-r border-border bg-accent sticky left-0 z-20 font-extrabold">
                            Grand Total
                          </td>
                          {pivotData.colKeys.map((ck) => (
                            <td key={ck} className="py-3 px-4 text-right border-r border-border font-bold text-foreground whitespace-nowrap">
                              {formatCellValue(pivotData.colTotals[ck])}
                            </td>
                          ))}
                          <td className="py-3 px-4 text-right font-extrabold text-emerald-500 bg-emerald-500/10 whitespace-nowrap">
                            {formatCellValue(pivotData.grandTotal)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="py-8 text-center text-xs text-muted-foreground">
                    Select dimensions above to compute the Pivot Table summary.
                  </div>
                )}

                {pivotData?.isTruncatedRows && (
                  <p className="text-[11px] text-muted-foreground italic">
                    * Showing top 50 row categories for optimal browser rendering performance. Use the Excel export to download the complete cross-tabulation.
                  </p>
                )}
              </div>

            </div>
          )}

        </div>
      )}

    </div>
  );
}
