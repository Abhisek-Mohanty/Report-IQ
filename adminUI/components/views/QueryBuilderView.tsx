"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useAnalyticsStore } from "@/store/useAnalyticsStore";
import { filterDataset, mergeMultipleDatasets, MultiMergeSource } from "@/utils/dataOperations";
import { FilterOperator, FilterRule, FilterGroup, SheetData, JoinType, ColumnType } from "@/types";
import { toast } from "@/components/ui/toast";
import { 
  Filter, 
  Plus, 
  Trash2, 
  Database, 
  Table, 
  Play, 
  Download,
  CheckCircle2,
  FileSpreadsheet,
  FileText,
  CheckSquare,
  Square,
  GitMerge,
  Layers,
  Sparkles,
  Info,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  HelpCircle,
  BookOpen,
  GraduationCap,
  Lightbulb,
  X,
  Search,
  ArrowRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import * as XLSX from "xlsx";

// Plain-English operators tailored for 10th-grade understanding
const OPERATORS: { value: FilterOperator; label: string; example: string }[] = [
  { value: "equals", label: "Is exactly equal to (=)", example: 'e.g. City = "New York"' },
  { value: "not_equals", label: "Is not equal to (!=)", example: 'e.g. Status != "Cancelled"' },
  { value: "contains", label: "Contains the text", example: 'e.g. Name contains "John"' },
  { value: "not_contains", label: "Does not contain text", example: 'e.g. Email does not contain "@spam"' },
  { value: "starts_with", label: "Starts with", example: 'e.g. Phone starts with "415"' },
  { value: "ends_with", label: "Ends with", example: 'e.g. Website ends with ".org"' },
  { value: "greater_than", label: "Is strictly greater than (>)", example: "e.g. Age > 16" },
  { value: "greater_than_or_equals", label: "Is at least / greater or equal (>=)", example: "e.g. Score >= 75" },
  { value: "less_than", label: "Is strictly less than (<)", example: "e.g. Price < 50" },
  { value: "less_than_or_equals", label: "Is at most / less or equal (<=)", example: "e.g. Quantity <= 10" },
  { value: "is_empty", label: "Is empty / blank", example: "Finds rows with missing values" },
  { value: "is_not_empty", label: "Is not blank (has any value)", example: "Finds rows with valid data" },
];

interface MultiQueryRule extends FilterRule {
  targetDatasetId?: string;
}

interface JoinKeyConfig {
  datasetId: string;
  leftKey: string;
  rightKey: string;
  joinType: JoinType;
}

export function QueryBuilderView() {
  const datasets = useAnalyticsStore((state) => state.datasets);
  const selectedDatasetId = useAnalyticsStore((state) => state.selectedDatasetId);
  const selectedSheetName = useAnalyticsStore((state) => state.selectedSheetName);
  const addDataset = useAnalyticsStore((state) => state.addDataset);
  const selectDataset = useAnalyticsStore((state) => state.selectDataset);
  const setActiveTab = useAnalyticsStore((state) => state.setActiveTab);

  // Selected dataset IDs (supports 1, 2, 3, 4, 5+ datasets!)
  const [selectedDatasetIds, setSelectedDatasetIds] = useState<string[]>([]);

  // Multi-dataset mode: "union" (search across all files) or "join" (connect tables by key)
  const [multiDatasetMode, setMultiDatasetMode] = useState<"union" | "join">("union");

  // Join configuration for "join" mode
  const [joinKeys, setJoinKeys] = useState<Record<string, JoinKeyConfig>>({});

  // Query rules state
  const [conjunction, setConjunction] = useState<"AND" | "OR">("AND");
  const [rules, setRules] = useState<MultiQueryRule[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);

  // User Guide Modal state
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [isGuideBannerDismissed, setIsGuideBannerDismissed] = useState(false);

  // Result state
  const [filteredResult, setFilteredResult] = useState<SheetData | null>(null);
  const [datasetMatchStats, setDatasetMatchStats] = useState<{
    name: string;
    matched: number;
    total: number;
  }[]>([]);
  const [totalScannedRows, setTotalScannedRows] = useState(0);

  // Pagination for result preview
  const [previewPage, setPreviewPage] = useState(1);
  const rowsPerPage = 12;

  // Initialize selected datasets on mount
  useEffect(() => {
    if (datasets.length > 0 && selectedDatasetIds.length === 0) {
      if (selectedDatasetId) {
        setSelectedDatasetIds([selectedDatasetId]);
      } else {
        setSelectedDatasetIds([datasets[0].id]);
      }
    }
  }, [datasets, selectedDatasetId, selectedDatasetIds.length]);

  // Selected dataset objects
  const selectedDatasets = useMemo(() => {
    return datasets.filter((d) => selectedDatasetIds.includes(d.id));
  }, [datasets, selectedDatasetIds]);

  // Total rows across all selected datasets
  const totalSelectedRows = useMemo(() => {
    return selectedDatasets.reduce((sum, d) => sum + (d.sheets[0]?.rowCount || 0), 0);
  }, [selectedDatasets]);

  // Gather available columns across all selected datasets
  const availableColumns = useMemo(() => {
    if (selectedDatasets.length === 0) return [];

    const columnMap = new Map<string, { name: string; datasets: string[] }>();

    selectedDatasets.forEach((ds) => {
      const sheet = ds.sheets[0];
      if (sheet) {
        sheet.headers.forEach((h) => {
          const entry = columnMap.get(h) || { name: h, datasets: [] };
          entry.datasets.push(ds.name);
          columnMap.set(h, entry);
        });
      }
    });

    const result: { label: string; value: string; isCommon: boolean }[] = [];

    // If multiple datasets selected and in union mode, include source file column
    if (selectedDatasets.length > 1 && multiDatasetMode === "union") {
      result.push({
        label: "📁 Source Spreadsheet File",
        value: "_source_dataset",
        isCommon: true,
      });
    }

    columnMap.forEach((entry, col) => {
      const isCommon = entry.datasets.length === selectedDatasets.length;
      result.push({
        label: isCommon ? col : `${col} (in ${entry.datasets.length} files)`,
        value: col,
        isCommon,
      });
    });

    return result;
  }, [selectedDatasets, multiDatasetMode]);

  // Reset or initialize rules when selected datasets change
  useEffect(() => {
    if (availableColumns.length > 0 && rules.length === 0) {
      const defaultCol = availableColumns.find((c) => c.value !== "_source_dataset") || availableColumns[0];
      setRules([
        {
          id: Math.random().toString(36).substring(2, 9),
          targetDatasetId: "all",
          column: defaultCol.value,
          operator: "contains",
          value: "",
        },
      ]);
    }
  }, [availableColumns, rules.length]);

  // Rule management
  const handleAddRule = () => {
    if (availableColumns.length === 0) return;
    const defaultCol = availableColumns.find((c) => c.value !== "_source_dataset") || availableColumns[0];
    setRules((prev) => [
      ...prev,
      {
        id: Math.random().toString(36).substring(2, 9),
        targetDatasetId: "all",
        column: defaultCol.value,
        operator: "equals",
        value: "",
      },
    ]);
  };

  const handleRemoveRule = (id: string) => {
    setRules((prev) => prev.filter((r) => r.id !== id));
  };

  const handleRuleChange = (id: string, field: keyof MultiQueryRule, val: any) => {
    setRules((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        return { ...r, [field]: val };
      })
    );
  };

  // Toggle selection of a dataset
  const toggleDatasetSelection = (id: string) => {
    setSelectedDatasetIds((prev) => {
      if (prev.includes(id)) {
        if (prev.length === 1) {
          toast.error("You must have at least one spreadsheet selected!");
          return prev;
        }
        return prev.filter((item) => item !== id);
      } else {
        return [...prev, id];
      }
    });
    setFilteredResult(null);
  };

  const selectAllDatasets = () => {
    setSelectedDatasetIds(datasets.map((d) => d.id));
    setFilteredResult(null);
  };

  // ==========================================
  // QUERY EXECUTION (ACROSS 1, 2, 3+ DATASETS)
  // ==========================================
  const handleExecuteQuery = () => {
    if (selectedDatasets.length === 0) {
      toast.error("Please pick at least one spreadsheet to search in!");
      return;
    }

    setIsExecuting(true);
    setFilteredResult(null);
    setPreviewPage(1);

    try {
      const filterGroup: FilterGroup = {
        id: "root",
        conjunction,
        rules: rules.map(({ id, column, operator, value }) => ({
          id,
          column,
          operator,
          value,
        })),
      };

      // 1. Single Dataset Search
      if (selectedDatasets.length === 1) {
        const ds = selectedDatasets[0];
        const sheet = ds.sheets.find((s) => s.name === selectedSheetName) || ds.sheets[0];
        if (!sheet) throw new Error("No sheet found in this dataset.");

        const result = filterDataset(sheet, filterGroup);
        setFilteredResult({
          ...result,
          name: `Filtered_${ds.name.replace(/\.[^/.]+$/, "")}`,
        });
        setTotalScannedRows(sheet.rowCount);
        setDatasetMatchStats([
          {
            name: ds.name,
            matched: result.rowCount,
            total: sheet.rowCount,
          },
        ]);

        toast.success(`Success! Found ${result.rowCount.toLocaleString()} matching rows out of ${sheet.rowCount.toLocaleString()}.`);
      } 
      
      // 2. Multi-Dataset Relational Join Mode
      else if (multiDatasetMode === "join") {
        const sources: MultiMergeSource[] = selectedDatasets.map((ds) => {
          const sheet = ds.sheets[0];
          const config = joinKeys[ds.id];
          return {
            sheet,
            name: ds.name,
            leftKey: config?.leftKey || sheet.headers[0],
            rightKey: config?.rightKey || sheet.headers[0],
            joinType: config?.joinType || "left",
          };
        });

        const joinedSheet = mergeMultipleDatasets(sources, "left");
        const result = filterDataset(joinedSheet, filterGroup);

        setFilteredResult({
          ...result,
          name: `Query_Join_${selectedDatasets.length}_Datasets`,
        });
        setTotalScannedRows(joinedSheet.rowCount);
        setDatasetMatchStats(
          selectedDatasets.map((d) => ({
            name: d.name,
            matched: result.rowCount,
            total: d.sheets[0]?.rowCount || 0,
          }))
        );

        toast.success(`Connected & searched across ${selectedDatasets.length} tables! Found ${result.rowCount.toLocaleString()} matching rows.`);
      }

      // 3. Multi-Dataset Union Search (Default - searches all selected files)
      else {
        const allHeadersSet = new Set<string>(["_source_dataset"]);
        const columnTypes: Record<string, ColumnType> = { _source_dataset: "string" };

        selectedDatasets.forEach((ds) => {
          const sheet = ds.sheets[0];
          if (sheet) {
            sheet.headers.forEach((h) => {
              allHeadersSet.add(h);
              if (!columnTypes[h]) {
                columnTypes[h] = sheet.columnTypes[h] || "string";
              }
            });
          }
        });

        const allHeaders = Array.from(allHeadersSet);
        const unifiedRows: Record<string, any>[] = [];
        let totalScanned = 0;
        const stats: { name: string; matched: number; total: number }[] = [];

        selectedDatasets.forEach((ds) => {
          const sheet = ds.sheets[0];
          if (!sheet) return;

          totalScanned += sheet.rowCount;

          const paddedRows = sheet.rows.map((row) => {
            const newRow: Record<string, any> = {
              _source_dataset: ds.name,
            };
            allHeaders.forEach((h) => {
              if (h !== "_source_dataset") {
                newRow[h] = row[h] !== undefined ? row[h] : null;
              }
            });
            return newRow;
          });

          const tempSheet: SheetData = {
            name: ds.name,
            headers: allHeaders,
            rows: paddedRows,
            rowCount: paddedRows.length,
            columnCount: allHeaders.length,
            columnTypes,
          };

          const filtered = filterDataset(tempSheet, filterGroup);
          unifiedRows.push(...filtered.rows);

          stats.push({
            name: ds.name,
            matched: filtered.rowCount,
            total: sheet.rowCount,
          });
        });

        const combinedResult: SheetData = {
          name: `Filtered_${selectedDatasets.length}_Files`,
          headers: allHeaders,
          rows: unifiedRows,
          rowCount: unifiedRows.length,
          columnCount: allHeaders.length,
          columnTypes,
        };

        setFilteredResult(combinedResult);
        setTotalScannedRows(totalScanned);
        setDatasetMatchStats(stats);

        toast.success(`Searched across ${selectedDatasets.length} spreadsheets! Found ${unifiedRows.length.toLocaleString()} matching rows out of ${totalScanned.toLocaleString()}.`);
      }
    } catch (err: any) {
      console.error(err);
      toast.error(`Error running search: ${err.message}`);
    } finally {
      setIsExecuting(false);
    }
  };

  // Load results into workspace as a new spreadsheet
  const handleLoadFilteredToWorkspace = () => {
    if (!filteredResult) return;

    const newDataset = {
      id: crypto.randomUUID(),
      name: `${filteredResult.name}.xlsx`,
      size: JSON.stringify(filteredResult.rows).length,
      sheets: [filteredResult],
      createdAt: new Date().toISOString(),
    };

    addDataset(newDataset);
    selectDataset(newDataset.id);
    toast.success(`Saved "${newDataset.name}" to your workspace! Click Datasets in the left menu to view it.`);
    setActiveTab("datasets");
  };

  // Export to Excel (.xlsx)
  const handleDownloadExcel = () => {
    if (!filteredResult) return;
    try {
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(filteredResult.rows);
      XLSX.utils.book_append_sheet(wb, ws, "Filtered_Results");
      const fileName = `${filteredResult.name}.xlsx`;
      XLSX.writeFile(wb, fileName);
      toast.success(`Downloaded ${fileName} to your computer!`);
    } catch (err) {
      console.error(err);
      toast.error("Could not download Excel file");
    }
  };

  // Export to CSV (.csv)
  const handleDownloadCsv = () => {
    if (!filteredResult) return;
    try {
      const ws = XLSX.utils.json_to_sheet(filteredResult.rows);
      const csv = XLSX.utils.sheet_to_csv(ws);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `${filteredResult.name}.csv`);
      link.click();
      toast.success("Downloaded CSV file to your computer!");
    } catch (err) {
      console.error(err);
      toast.error("Could not download CSV file");
    }
  };

  // Paginated rows for preview
  const paginatedRows = useMemo(() => {
    if (!filteredResult) return [];
    const start = (previewPage - 1) * rowsPerPage;
    return filteredResult.rows.slice(start, start + rowsPerPage);
  }, [filteredResult, previewPage, rowsPerPage]);

  const totalPages = filteredResult ? Math.max(1, Math.ceil(filteredResult.rowCount / rowsPerPage)) : 1;

  if (datasets.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-muted-foreground bg-card border border-border rounded-2xl">
        <Filter className="h-12 w-12 opacity-30 mb-3" />
        <h3 className="font-display font-semibold text-lg text-foreground mb-1">No Spreadsheets Loaded Yet</h3>
        <p className="text-xs max-w-sm mb-4">Please drop an Excel or CSV file in the Upload tab first so we can search through it.</p>
        <Button size="sm" onClick={() => setActiveTab("upload")}>
          Go to Upload Tab
        </Button>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-y-auto gap-5 pb-8">
      
      {/* ========================================== */}
      {/* HEADER WITH 10TH-GRADE FRIENDLY EXPLANATION */}
      {/* ========================================== */}
      <div className="flex flex-wrap items-center justify-between gap-4 shrink-0">
        <div>
          <h2 className="font-display font-bold text-2xl text-foreground flex items-center gap-2">
            <Filter className="h-6 w-6 text-primary" />
            <span>Query Builder</span>
          </h2>
          <span className="text-xs text-muted-foreground font-medium block mt-0.5">
            Like a super-smart search bar for your spreadsheets. Filter rows in 1 file or across 3, 4, 5+ files all at once!
          </span>
        </div>

        {/* User Guide Action Button */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs font-semibold text-primary border-primary/30 hover:bg-primary/10"
            onClick={() => setIsGuideOpen(true)}
          >
            <BookOpen className="h-3.5 w-3.5 text-primary" />
            <span>How to Use (Student Guide)</span>
          </Button>

          <div className="px-3 py-1 bg-accent/60 border border-border rounded-lg text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
            <Database className="h-3.5 w-3.5 text-primary" />
            <span className="text-foreground">{selectedDatasets.length} of {datasets.length} Files Active</span>
          </div>
        </div>
      </div>

      {/* ========================================== */}
      {/* QUICK TIPS BANNER (CAN BE DISMISSED) */}
      {/* ========================================== */}
      {!isGuideBannerDismissed && (
        <div className="p-3.5 bg-primary/10 border border-primary/20 rounded-xl flex items-start justify-between gap-3 text-xs">
          <div className="flex items-start gap-2.5">
            <div className="p-1 rounded-md bg-primary/20 text-primary mt-0.5 shrink-0">
              <GraduationCap className="h-4 w-4" />
            </div>
            <div>
              <div className="font-bold text-foreground mb-0.5">How this works in 3 easy steps:</div>
              <p className="text-muted-foreground leading-relaxed text-[11px]">
                <strong className="text-foreground">1. Pick your files:</strong> Check any spreadsheets you want to search (pick 1, 2, 3, or all).<br />
                <strong className="text-foreground">2. Add your search rules:</strong> Choose a column, pick a rule (like "Greater than" or "Contains"), and type your value.<br />
                <strong className="text-foreground">3. Click Search:</strong> View only the rows that match your rules, and download them as Excel or CSV!
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsGuideBannerDismissed(true)}
            className="text-muted-foreground hover:text-foreground p-1 rounded-md transition-colors shrink-0"
            title="Dismiss tip"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* ========================================== */}
      {/* STEP 1: PICK SPREADSHEETS (SUPPORTS >2 DATASETS) */}
      {/* ========================================== */}
      <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-3.5">
        <div className="flex flex-wrap items-center justify-between border-b border-border pb-2.5 gap-2">
          <div className="flex items-center gap-2">
            <span className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold font-display">
              1
            </span>
            <span className="text-xs font-bold text-foreground uppercase tracking-wider">
              Step 1: Choose Which Spreadsheets to Search In
            </span>
            <span className="text-[11px] text-muted-foreground font-medium hidden sm:inline">
              (You can check 1, 2, 3, or as many files as you want!)
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* If 2+ files selected: Simple combine mode toggle */}
            {selectedDatasets.length > 1 && (
              <div className="flex items-center bg-accent border border-border p-0.5 rounded-lg text-[10px] font-bold">
                <button
                  onClick={() => setMultiDatasetMode("union")}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-all ${
                    multiDatasetMode === "union"
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  title="Search inside all selected files together"
                >
                  <Layers className="h-3 w-3 text-primary" />
                  <span>Search All Files Together</span>
                </button>
                <button
                  onClick={() => setMultiDatasetMode("join")}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-all ${
                    multiDatasetMode === "join"
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  title="Link tables by matching ID column"
                >
                  <GitMerge className="h-3 w-3 text-primary" />
                  <span>Connect Tables (By ID)</span>
                </button>
              </div>
            )}

            {/* Select All */}
            {datasets.length > 1 && (
              <button
                onClick={selectAllDatasets}
                className="text-xs font-semibold text-primary hover:underline"
              >
                Select All ({datasets.length})
              </button>
            )}
          </div>
        </div>

        {/* Spreadsheets Checkboxes Grid */}
        <div className="flex flex-wrap gap-2.5 pt-0.5">
          {datasets.map((d) => {
            const isSelected = selectedDatasetIds.includes(d.id);
            const rowCount = d.sheets[0]?.rowCount || 0;

            return (
              <button
                key={d.id}
                onClick={() => toggleDatasetSelection(d.id)}
                className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border text-xs transition-all select-none text-left ${
                  isSelected
                    ? "bg-primary/10 border-primary text-foreground font-bold shadow-sm ring-1 ring-primary/30"
                    : "bg-accent/20 border-border text-muted-foreground hover:bg-accent/40 hover:text-foreground font-medium"
                }`}
              >
                <div className="mt-0.5">
                  {isSelected ? (
                    <CheckSquare className="h-4 w-4 text-primary shrink-0" />
                  ) : (
                    <Square className="h-4 w-4 text-muted-foreground shrink-0" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="truncate max-w-[210px] text-xs font-bold leading-tight">{d.name}</div>
                  <div className="text-[10px] text-muted-foreground font-medium mt-0.5">
                    {rowCount.toLocaleString()} rows
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Friendly explanation of selected state */}
        <div className="text-[11px] text-muted-foreground bg-accent/30 p-2.5 rounded-lg flex items-center gap-2">
          <Sparkles className="h-3.5 w-3.5 text-primary shrink-0" />
          <span>
            {selectedDatasets.length === 1 ? (
              <>Searching in <strong className="text-foreground">{selectedDatasets[0].name}</strong> ({totalSelectedRows.toLocaleString()} rows).</>
            ) : (
              <>
                Searching across <strong className="text-foreground">{selectedDatasets.length} spreadsheets</strong> at the same time ({totalSelectedRows.toLocaleString()} total rows). Every matching row in the results will clearly show which file it came from!
              </>
            )}
          </span>
        </div>
      </div>

      {/* ========================================== */}
      {/* STEP 2: WHAT TO SEARCH FOR (FILTER RULES) */}
      {/* ========================================== */}
      <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
        
        <div className="flex flex-wrap items-center justify-between border-b border-border pb-3 gap-3">
          <div className="flex items-center gap-2">
            <span className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold font-display">
              2
            </span>
            <span className="text-xs font-bold text-foreground uppercase tracking-wider">
              Step 2: Tell Us What You Are Looking For
            </span>
          </div>

          {/* Match ALL (AND) vs Match ANY (OR) */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-muted-foreground">Match Mode:</span>
            <div className="flex bg-accent border border-border p-0.5 rounded-lg text-[10px] font-bold">
              <button
                onClick={() => setConjunction("AND")}
                className={`px-3 py-1.5 rounded-md transition-all ${
                  conjunction === "AND" ? "bg-card text-foreground shadow-sm font-bold" : "text-muted-foreground"
                }`}
                title="Every single rule must be true"
              >
                Must Match ALL Rules (AND)
              </button>
              <button
                onClick={() => setConjunction("OR")}
                className={`px-3 py-1.5 rounded-md transition-all ${
                  conjunction === "OR" ? "bg-card text-foreground shadow-sm font-bold" : "text-muted-foreground"
                }`}
                title="At least one rule must be true"
              >
                Can Match ANY Rule (OR)
              </button>
            </div>
          </div>
        </div>

        {/* Student-friendly explanation of AND / OR */}
        <div className="text-[11px] text-muted-foreground px-1">
          {conjunction === "AND" ? (
            <span>
              💡 <strong className="text-foreground">Match ALL (AND):</strong> Strict search. A row only shows up if <strong className="text-foreground">every single condition</strong> below is true (like getting an 'A' in Math <em>AND</em> Science).
            </span>
          ) : (
            <span>
              💡 <strong className="text-foreground">Match ANY (OR):</strong> Flexible search. A row shows up if <strong className="text-foreground">at least one condition</strong> below is true (like joining the Basketball club <em>OR</em> the Art club).
            </span>
          )}
        </div>

        {/* Rules Stack */}
        <div className="space-y-3 font-semibold text-xs pt-1">
          {rules.length === 0 ? (
            <div className="py-6 text-center text-muted-foreground border border-dashed border-border rounded-xl">
              <Filter className="h-6 w-6 opacity-30 mx-auto mb-1" />
              <p className="text-xs">No search rules added yet. Click "+ Add Another Rule" below!</p>
            </div>
          ) : (
            rules.map((rule, idx) => (
              <div
                key={rule.id}
                className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 bg-accent/25 border border-border p-3 rounded-xl relative group transition-all hover:border-primary/40"
              >
                {/* Rule badge */}
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-bold shrink-0 min-w-[70px]">
                  <span className="h-5 w-5 rounded bg-primary/10 text-primary flex items-center justify-center text-[10px]">
                    {idx + 1}
                  </span>
                  <span>Rule</span>
                </div>

                {/* 1. Which Column? */}
                <div className="flex-1 min-w-[170px]">
                  <label className="block text-[10px] text-muted-foreground font-bold mb-1 uppercase">
                    1. In Column:
                  </label>
                  <select
                    value={rule.column}
                    onChange={(e) => handleRuleChange(rule.id, "column", e.target.value)}
                    className="w-full bg-card border border-border rounded-lg p-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary/40 text-foreground"
                  >
                    {availableColumns.map((col) => (
                      <option key={col.value} value={col.value}>
                        {col.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 2. Which Operator? */}
                <div className="w-full sm:w-56 shrink-0">
                  <label className="block text-[10px] text-muted-foreground font-bold mb-1 uppercase">
                    2. Condition:
                  </label>
                  <select
                    value={rule.operator}
                    onChange={(e) => handleRuleChange(rule.id, "operator", e.target.value)}
                    className="w-full bg-card border border-border rounded-lg p-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary/40 text-foreground"
                  >
                    {OPERATORS.map((op) => (
                      <option key={op.value} value={op.value}>
                        {op.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 3. What Value? */}
                <div className="flex-1 min-w-[160px]">
                  <label className="block text-[10px] text-muted-foreground font-bold mb-1 uppercase">
                    3. Compare with value:
                  </label>
                  {!["is_empty", "is_not_empty"].includes(rule.operator) ? (
                    <input
                      type="text"
                      value={rule.value}
                      onChange={(e) => handleRuleChange(rule.id, "value", e.target.value)}
                      placeholder="Type what to search for..."
                      className="w-full bg-card border border-border rounded-lg p-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/40 text-foreground font-medium"
                    />
                  ) : (
                    <div className="w-full bg-accent/40 rounded-lg p-2 border border-border/40 text-[10px] text-muted-foreground text-center select-none font-medium h-[34px] flex items-center justify-center">
                      No value needed (checks blank cells)
                    </div>
                  )}
                </div>

                {/* Delete rule button */}
                <div className="self-end sm:self-center pt-5 sm:pt-0">
                  <button
                    disabled={rules.length === 1}
                    onClick={() => handleRemoveRule(rule.id)}
                    className="p-2 rounded-lg hover:bg-danger/10 text-muted-foreground hover:text-danger disabled:opacity-30 disabled:pointer-events-none transition-colors"
                    title="Remove this rule"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Add Condition & Run Search Action */}
        <div className="flex flex-wrap items-center justify-between border-t border-border pt-4 gap-3">
          <Button
            size="sm"
            variant="outline"
            className="h-8 gap-1.5 text-xs font-semibold"
            onClick={handleAddRule}
            disabled={availableColumns.length === 0}
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Another Rule</span>
          </Button>

          <Button
            className="gap-2 h-10 px-7 font-bold shadow-md shadow-primary/25 text-sm"
            onClick={handleExecuteQuery}
            disabled={isExecuting || availableColumns.length === 0}
          >
            <Play className="h-4 w-4" />
            <span>
              {selectedDatasets.length === 1
                ? "Search This Spreadsheet"
                : `Search Across All ${selectedDatasets.length} Spreadsheets`}
            </span>
          </Button>
        </div>
      </div>

      {/* ========================================== */}
      {/* STEP 3: RESULTS (OUTPUT PREVIEW & EXPORT) */}
      {/* ========================================== */}
      {filteredResult && (
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
          
          <div className="flex flex-wrap items-center justify-between border-b border-border pb-3.5 gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="h-6 w-6 rounded-full bg-success text-success-foreground flex items-center justify-center text-xs font-bold font-display">
                  3
                </span>
                <CheckCircle2 className="h-5 w-5 text-success" />
                <h3 className="font-display font-bold text-lg text-foreground">
                  Search Results
                </h3>
              </div>
              <p className="text-xs text-muted-foreground font-semibold mt-1">
                Found <span className="font-bold text-foreground">{filteredResult.rowCount.toLocaleString()}</span> matching rows out of{" "}
                <span className="font-bold text-foreground">{totalScannedRows.toLocaleString()}</span> total rows{" "}
                ({totalScannedRows > 0 ? ((filteredResult.rowCount / totalScannedRows) * 100).toFixed(1) : 0}%)
                {selectedDatasets.length > 1 && (
                  <span className="text-primary ml-1.5">across {selectedDatasets.length} spreadsheets</span>
                )}
              </p>
            </div>

            {/* Actions for result set */}
            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs gap-1.5"
                onClick={handleDownloadExcel}
                title="Download this table as an Excel spreadsheet file"
              >
                <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-500" />
                <span>Download Excel</span>
              </Button>

              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs gap-1.5"
                onClick={handleDownloadCsv}
                title="Download this table as a CSV file"
              >
                <FileText className="h-3.5 w-3.5 text-blue-500" />
                <span>Download CSV</span>
              </Button>

              <Button
                size="sm"
                variant="success"
                className="gap-1.5 h-8 text-xs font-bold shadow-sm shadow-success/20"
                onClick={handleLoadFilteredToWorkspace}
                title="Save this table back into Report-IQ so you can edit or graph it!"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Save to Workspace</span>
              </Button>
            </div>
          </div>

          {/* Breakdown Pills: Matches per file */}
          {selectedDatasets.length > 1 && datasetMatchStats.length > 0 && (
            <div className="flex flex-wrap gap-2 p-3 bg-accent/20 rounded-xl border border-border text-xs">
              <div className="font-bold text-muted-foreground uppercase text-[10px] flex items-center gap-1 self-center mr-1">
                <Sparkles className="h-3 w-3 text-primary" />
                <span>Matches per File:</span>
              </div>
              {datasetMatchStats.map((st) => (
                <div
                  key={st.name}
                  className="flex items-center gap-2 px-3 py-1 bg-card border border-border rounded-lg text-xs font-medium shadow-sm"
                >
                  <span className="text-foreground font-bold">{st.name}:</span>
                  <span className="font-bold text-primary">{st.matched.toLocaleString()} matches</span>
                  <span className="text-[10px] text-muted-foreground">({st.total.toLocaleString()} total)</span>
                </div>
              ))}
            </div>
          )}

          {/* Table Preview */}
          <div className="overflow-auto border border-border rounded-xl bg-accent/10 max-h-[440px]">
            <table className="w-full text-left border-collapse text-xs select-text">
              <thead className="bg-accent/40 border-b border-border sticky top-0 z-10 shadow-sm">
                <tr>
                  <th className="w-12 px-3 py-2.5 font-bold text-muted-foreground border-r border-border text-center">
                    #
                  </th>
                  {filteredResult.headers.map((h) => {
                    const isSourceCol = h === "_source_dataset";
                    return (
                      <th
                        key={h}
                        className={`px-3 py-2.5 font-bold text-foreground border-r border-border truncate min-w-[130px] ${
                          isSourceCol ? "bg-primary/10 text-primary font-bold" : ""
                        }`}
                      >
                        {isSourceCol ? "Spreadsheet Source" : h}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredResult.rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={filteredResult.headers.length + 1}
                      className="py-12 text-center text-muted-foreground font-semibold"
                    >
                      No rows matched your search rules. Try loosening your conditions or switching to "Match ANY Rule (OR)".
                    </td>
                  </tr>
                ) : (
                  paginatedRows.map((row: any, rIdx: number) => {
                    const globalIdx = (previewPage - 1) * rowsPerPage + rIdx + 1;
                    const isEven = rIdx % 2 === 0;

                    return (
                      <tr
                        key={rIdx}
                        className={`hover:bg-primary/5 transition-colors ${
                          isEven ? "bg-card" : "bg-accent/15"
                        }`}
                      >
                        <td className="w-12 px-3 py-2 text-muted-foreground text-center font-mono text-[10px] border-r border-border">
                          {globalIdx}
                        </td>
                        {filteredResult.headers.map((h) => {
                          const val = row[h];
                          const isNull = val === null || val === undefined;
                          const isSourceCol = h === "_source_dataset";

                          return (
                            <td
                              key={h}
                              className={`px-3 py-2 border-r border-border truncate max-w-[220px] font-medium ${
                                isNull
                                  ? "text-danger/60 italic"
                                  : isSourceCol
                                  ? "text-primary font-bold"
                                  : "text-foreground/85"
                              }`}
                              title={String(val ?? "")}
                            >
                              {isNull ? "NULL" : String(val)}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Table Footer Pagination */}
          {filteredResult.rows.length > 0 && (
            <div className="flex flex-wrap items-center justify-between text-xs text-muted-foreground pt-1 select-none">
              <div>
                Showing rows{" "}
                <span className="font-bold text-foreground">
                  {(previewPage - 1) * rowsPerPage + 1}
                </span>{" "}
                to{" "}
                <span className="font-bold text-foreground">
                  {Math.min(filteredResult.rowCount, previewPage * rowsPerPage)}
                </span>{" "}
                of{" "}
                <span className="font-bold text-foreground">
                  {filteredResult.rowCount.toLocaleString()}
                </span>{" "}
                matches
              </div>

              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 w-7 p-0"
                  disabled={previewPage === 1}
                  onClick={() => setPreviewPage(1)}
                  title="First Page"
                >
                  <ChevronsLeft className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 w-7 p-0"
                  disabled={previewPage === 1}
                  onClick={() => setPreviewPage((p) => Math.max(1, p - 1))}
                  title="Previous Page"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>

                <span className="font-bold px-2 text-foreground">
                  Page {previewPage} of {totalPages}
                </span>

                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 w-7 p-0"
                  disabled={previewPage === totalPages}
                  onClick={() => setPreviewPage((p) => Math.min(totalPages, p + 1))}
                  title="Next Page"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 w-7 p-0"
                  disabled={previewPage === totalPages}
                  onClick={() => setPreviewPage(totalPages)}
                  title="Last Page"
                >
                  <ChevronsRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================== */}
      {/* 10TH-GRADE STUDENT GUIDE MODAL DIALOG */}
      {/* ========================================== */}
      <Dialog
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
        title="🎓 Beginner's Guide to Query Builder"
      >
        <div className="space-y-4 text-xs text-foreground/90 font-normal leading-relaxed">
          
          <div className="p-3 bg-primary/10 border border-primary/20 rounded-xl text-primary font-medium">
            <div className="font-bold text-sm mb-1">What is a Query Builder?</div>
            Think of it like Google Search or a filter on an online shopping store (like Amazon). Instead of reading through thousands of spreadsheet rows by hand, you give it rules, and it instantly pulls out only the rows you care about!
          </div>

          <div className="space-y-2">
            <h4 className="font-bold text-foreground text-sm flex items-center gap-1.5">
              <span className="h-5 w-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px]">1</span>
              Searching Across Multiple Spreadsheets
            </h4>
            <p className="text-muted-foreground">
              Have 3, 4, or 5 different files (like Term 1, Term 2, and Term 3 grades, or Sales reports from January to May)? Just check all of them in <strong>Step 1</strong>!
            </p>
            <p className="text-muted-foreground">
              The Query Builder will scan through all of them at the same time. In your results, it will add a handy <code className="bg-accent px-1.5 py-0.5 rounded text-foreground font-semibold">Spreadsheet Source</code> column telling you exactly which file each row came from!
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="font-bold text-foreground text-sm flex items-center gap-1.5">
              <span className="h-5 w-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px]">2</span>
              Understanding "Match ALL (AND)" vs "Match ANY (OR)"
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              <div className="p-2.5 rounded-lg border border-border bg-accent/20">
                <span className="font-bold text-foreground block mb-1">Match ALL Rules (AND)</span>
                <span className="text-muted-foreground">
                  Strict! Every single rule must be true.
                  <br />
                  <em className="text-primary font-semibold">Example:</em> Grade is 10 <strong>AND</strong> City is Chicago. (Only 10th graders in Chicago will show up).
                </span>
              </div>
              <div className="p-2.5 rounded-lg border border-border bg-accent/20">
                <span className="font-bold text-foreground block mb-1">Match ANY Rule (OR)</span>
                <span className="text-muted-foreground">
                  Flexible! At least one rule must be true.
                  <br />
                  <em className="text-primary font-semibold">Example:</em> Plays Football <strong>OR</strong> Plays Basketball. (Shows students in either sport).
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="font-bold text-foreground text-sm flex items-center gap-1.5">
              <span className="h-5 w-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px]">3</span>
              Popular Comparison Rules
            </h4>
            <ul className="space-y-1.5 text-muted-foreground list-disc pl-4">
              <li><strong>Equals (=):</strong> Exact match. Great for categories or status (e.g. <code className="bg-accent px-1 rounded text-foreground">Status = Completed</code>).</li>
              <li><strong>Contains:</strong> Checks if a piece of text is inside. Great for searching names or emails (e.g. <code className="bg-accent px-1 rounded text-foreground">Email contains @gmail.com</code>).</li>
              <li><strong>Greater than (&gt;):</strong> For numbers. Finds values higher than your number (e.g. <code className="bg-accent px-1 rounded text-foreground">Score &gt; 80</code>).</li>
              <li><strong>Is empty:</strong> Finds missing or blank cells in your spreadsheet.</li>
            </ul>
          </div>

          <div className="space-y-2">
            <h4 className="font-bold text-foreground text-sm flex items-center gap-1.5">
              <span className="h-5 w-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px]">4</span>
              What can you do with your results?
            </h4>
            <p className="text-muted-foreground">
              Once the search is done, you can click <strong className="text-foreground">Download Excel</strong> to get an .xlsx file, or click <strong className="text-foreground">Save to Workspace</strong> to turn your filtered results into a brand new dataset that you can edit or graph in Report-IQ!
            </p>
          </div>

          <div className="pt-3 flex justify-end border-t border-border">
            <Button size="sm" onClick={() => setIsGuideOpen(false)}>
              Got it, thanks!
            </Button>
          </div>
        </div>
      </Dialog>

    </div>
  );
}
