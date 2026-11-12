"use client";

import React, { useState, useMemo } from "react";
import { SheetData } from "@/types";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  findDuplicateRecords,
  DuplicateGroupInfo,
  DuplicateRowInfo,
} from "@/utils/dataOperations";
import * as XLSX from "xlsx";
import { toast } from "@/components/ui/toast";
import {
  Copy,
  Trash2,
  Download,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Table,
  Check,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  X,
  FileSpreadsheet,
} from "lucide-react";

interface DuplicateRecordsModalProps {
  isOpen: boolean;
  onClose: () => void;
  sheet: SheetData;
  datasetName: string;
  onRemoveDuplicates: (matchColumns?: string[]) => void;
}

export function DuplicateRecordsModal({
  isOpen,
  onClose,
  sheet,
  datasetName,
  onRemoveDuplicates,
}: DuplicateRecordsModalProps) {
  // Matching column scope mode: "all" or "custom"
  const [matchScope, setMatchScope] = useState<"all" | "custom">("all");
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);

  // View mode: "all_copies" (original + duplicates) or "redundant_only" (extra copies only)
  const [viewMode, setViewMode] = useState<"all_copies" | "redundant_only">("all_copies");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 15;

  // Active match columns list
  const activeMatchColumns = useMemo(() => {
    if (matchScope === "custom" && selectedColumns.length > 0) {
      return selectedColumns;
    }
    return undefined; // All columns
  }, [matchScope, selectedColumns]);

  // Compute duplicate records
  const { groups, allDuplicateRows, redundantRows, totalDuplicates } = useMemo(() => {
    return findDuplicateRecords(sheet, activeMatchColumns);
  }, [sheet, activeMatchColumns]);

  // Rows to display based on viewMode
  const sourceRows = viewMode === "all_copies" ? allDuplicateRows : redundantRows;

  // Filter rows based on search
  const filteredRows = useMemo(() => {
    if (!searchQuery.trim()) return sourceRows;
    const q = searchQuery.toLowerCase();
    return sourceRows.filter((r) =>
      Object.values(r.data).some(
        (v) => v !== null && v !== undefined && String(v).toLowerCase().includes(q)
      )
    );
  }, [sourceRows, searchQuery]);

  // Paginated rows
  const totalPages = Math.ceil(filteredRows.length / rowsPerPage) || 1;
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return filteredRows.slice(start, start + rowsPerPage);
  }, [filteredRows, currentPage]);

  // Toggle column selection for custom matching
  const handleToggleColumn = (col: string) => {
    setSelectedColumns((prev) =>
      prev.includes(col) ? prev.filter((c) => c !== col) : [...prev, col]
    );
    setCurrentPage(1);
  };

  // Select / Deselect All columns
  const handleSelectAllCols = () => {
    if (selectedColumns.length === sheet.headers.length) {
      setSelectedColumns([]);
    } else {
      setSelectedColumns([...sheet.headers]);
    }
    setCurrentPage(1);
  };

  // Export duplicates to Excel
  const handleExportDuplicates = () => {
    try {
      if (allDuplicateRows.length === 0) {
        toast.info("No duplicate records to export.");
        return;
      }

      const exportData = allDuplicateRows.map((r) => ({
        _Row_Index: r.rowIndex,
        _Duplicate_Group: `Group #${r.groupId}`,
        _Occurrence_Type: r.isOriginal ? "Original (Primary)" : `Duplicate Copy #${r.duplicateOrder}`,
        ...r.data,
      }));

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(exportData);
      XLSX.utils.book_append_sheet(wb, ws, "Duplicate_Records");

      const safeName = datasetName.replace(/\.[^/.]+$/, "");
      const fileName = `${safeName}_${sheet.name}_duplicates.xlsx`;
      XLSX.writeFile(wb, fileName);
      toast.success(`Exported duplicate records to ${fileName}`);
    } catch (err: any) {
      toast.error(`Export failed: ${err.message}`);
    }
  };

  // Handle Remove Duplicates
  const handleExecuteRemoval = () => {
    onRemoveDuplicates(activeMatchColumns);
    onClose();
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Duplicate Records Inspector"
      className="max-w-5xl max-h-[90vh]"
    >
      <div className="flex flex-col space-y-4">
        {/* Top Summary Banner */}
        <div className="p-4 rounded-xl bg-accent/40 border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
              <Copy className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-foreground">
                  Duplicate Rows in <span className="text-primary">{sheet.name}</span>
                </h4>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-accent border border-border text-muted-foreground font-mono">
                  {datasetName}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {totalDuplicates > 0 ? (
                  <>
                    Found <strong className="text-amber-500 font-semibold">{totalDuplicates.toLocaleString()}</strong> duplicate
                    copies across <strong className="text-foreground">{groups.length}</strong> distinct group(s) out of{" "}
                    {sheet.rowCount.toLocaleString()} total rows.
                  </>
                ) : (
                  <>Zero duplicate rows detected. All {sheet.rowCount.toLocaleString()} rows are 100% unique.</>
                )}
              </p>
            </div>
          </div>

          {/* Quick Metrics Chips */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="px-3 py-1.5 rounded-lg bg-card border border-border text-center">
              <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Redundant Rows</span>
              <span className="text-xs font-bold text-amber-500 font-mono">{totalDuplicates.toLocaleString()}</span>
            </div>
            <div className="px-3 py-1.5 rounded-lg bg-card border border-border text-center">
              <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Unique Groups</span>
              <span className="text-xs font-bold text-foreground font-mono">{groups.length.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* =========================================================================
            MATCHING SCOPE & CONTROLS TOOLBAR
           ========================================================================= */}
        <div className="space-y-2.5 bg-card border border-border rounded-xl p-3 shrink-0">
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
            {/* Matching Criteria Toggle */}
            <div className="flex items-center gap-2">
              <span className="font-semibold text-muted-foreground text-[11px] flex items-center gap-1">
                <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-400" /> Match By:
              </span>
              <div className="inline-flex rounded-lg border border-border bg-accent/30 p-0.5">
                <button
                  type="button"
                  onClick={() => {
                    setMatchScope("all");
                    setCurrentPage(1);
                  }}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                    matchScope === "all"
                      ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  All Columns (Exact Match)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMatchScope("custom");
                    if (selectedColumns.length === 0 && sheet.headers.length > 0) {
                      setSelectedColumns([sheet.headers[0]]);
                    }
                    setCurrentPage(1);
                  }}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                    matchScope === "custom"
                      ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Specific Key Columns
                </button>
              </div>
            </div>

            {/* View Mode Toggle: All vs Redundant Only */}
            <div className="flex items-center gap-2">
              <span className="font-semibold text-muted-foreground text-[11px]">Display:</span>
              <div className="inline-flex rounded-lg border border-border bg-accent/30 p-0.5">
                <button
                  type="button"
                  onClick={() => {
                    setViewMode("all_copies");
                    setCurrentPage(1);
                  }}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                    viewMode === "all_copies"
                      ? "bg-card border border-border/80 text-foreground font-semibold shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  All Copies ({allDuplicateRows.length})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setViewMode("redundant_only");
                    setCurrentPage(1);
                  }}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                    viewMode === "redundant_only"
                      ? "bg-card border border-border/80 text-foreground font-semibold shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Redundant Only ({redundantRows.length})
                </button>
              </div>
            </div>
          </div>

          {/* Specific Columns Selector (when custom matchScope is active) */}
          {matchScope === "custom" && (
            <div className="pt-2 border-t border-border/60">
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <span className="text-[11px] text-muted-foreground font-medium">
                  Select key column(s) to identify duplicates (rows sharing the same values in these columns will be flagged):
                </span>
                <button
                  type="button"
                  onClick={handleSelectAllCols}
                  className="text-[10px] text-indigo-500 hover:underline font-semibold"
                >
                  {selectedColumns.length === sheet.headers.length ? "Deselect All" : "Select All"}
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                {sheet.headers.map((col) => {
                  const isChecked = selectedColumns.includes(col);
                  return (
                    <button
                      key={col}
                      type="button"
                      onClick={() => handleToggleColumn(col)}
                      className={`px-2 py-0.5 rounded text-[11px] font-medium border transition-all flex items-center gap-1.5 ${
                        isChecked
                          ? "bg-indigo-500/15 border-indigo-500/40 text-indigo-600 dark:text-indigo-400 font-semibold"
                          : "bg-accent/40 border-border text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <span className={`w-2.5 h-2.5 rounded-sm flex items-center justify-center border text-[8px] ${
                        isChecked ? "bg-indigo-600 border-indigo-600 text-white" : "border-muted-foreground"
                      }`}>
                        {isChecked && "✓"}
                      </span>
                      <span>{col}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Search Filter Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search across duplicate records..."
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        {/* =========================================================================
            DUPLICATE RECORDS TABLE
           ========================================================================= */}
        <div className="border border-border rounded-xl overflow-hidden bg-card flex flex-col max-h-[45vh] min-h-[220px]">
          {totalDuplicates === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-muted-foreground space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-foreground">Zero Duplicate Records</h4>
                <p className="text-xs max-w-md mx-auto mt-1">
                  Every row in sheet <strong className="text-foreground">{sheet.name}</strong> is completely distinct
                  based on {matchScope === "all" ? "all columns" : `${selectedColumns.length} selected column(s)`}.
                </p>
              </div>
            </div>
          ) : filteredRows.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
              <p className="text-xs">No duplicate records matched your search query "{searchQuery}".</p>
            </div>
          ) : (
            <div className="flex-1 overflow-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-accent/60 sticky top-0 z-10 border-b border-border backdrop-blur-sm">
                  <tr>
                    <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-r border-border text-center w-16">
                      Row #
                    </th>
                    <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-r border-border w-28 text-center">
                      Occurrence
                    </th>
                    <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-r border-border w-24 text-center">
                      Group
                    </th>
                    {sheet.headers.map((h) => (
                      <th
                        key={h}
                        className="px-3 py-2 text-[11px] font-semibold text-foreground border-r border-border last:border-r-0 whitespace-nowrap"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {paginatedRows.map((r, idx) => {
                    const isOriginal = r.isOriginal;
                    return (
                      <tr
                        key={`${r.groupId}-${r.rowIndex}-${idx}`}
                        className={`transition-colors ${
                          isOriginal
                            ? "bg-emerald-500/5 hover:bg-emerald-500/10"
                            : "bg-amber-500/5 hover:bg-amber-500/10"
                        }`}
                      >
                        {/* Sheet Row Number */}
                        <td className="px-3 py-2 font-mono text-[11px] text-center border-r border-border font-semibold text-muted-foreground">
                          #{r.rowIndex}
                        </td>

                        {/* Occurrence Type Badge */}
                        <td className="px-3 py-2 text-center border-r border-border">
                          {isOriginal ? (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-semibold border border-emerald-500/30">
                              Original
                            </span>
                          ) : (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-600 dark:text-rose-400 font-semibold border border-rose-500/30">
                              Duplicate #{r.duplicateOrder}
                            </span>
                          )}
                        </td>

                        {/* Group ID Badge */}
                        <td className="px-3 py-2 text-center border-r border-border">
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent font-mono text-muted-foreground border border-border/80">
                            Group {r.groupId}
                          </span>
                        </td>

                        {/* Row Cell Values */}
                        {sheet.headers.map((h) => {
                          const val = r.data[h];
                          const isNull = val === null || val === undefined || val === "";
                          return (
                            <td
                              key={h}
                              className="px-3 py-2 border-r border-border last:border-r-0 text-foreground whitespace-nowrap max-w-[220px] truncate"
                            >
                              {isNull ? (
                                <span className="text-[10px] text-muted-foreground/40 italic">null</span>
                              ) : (
                                String(val)
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Table Pagination Bar */}
          {filteredRows.length > 0 && (
            <div className="p-2.5 border-t border-border bg-accent/20 flex items-center justify-between text-xs shrink-0">
              <span className="text-[11px] text-muted-foreground">
                Showing{" "}
                <strong className="text-foreground">
                  {(currentPage - 1) * rowsPerPage + 1}-
                  {Math.min(currentPage * rowsPerPage, filteredRows.length)}
                </strong>{" "}
                of <strong className="text-foreground">{filteredRows.length}</strong> duplicate records
              </span>

              <div className="flex items-center gap-1.5">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage <= 1}
                  className="h-7 px-2 text-xs border-border"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </Button>
                <span className="text-[11px] text-muted-foreground px-1">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                  className="h-7 px-2 text-xs border-border"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* =========================================================================
            BOTTOM ACTIONS BAR
           ========================================================================= */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 pt-2 border-t border-border shrink-0">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportDuplicates}
              disabled={allDuplicateRows.length === 0}
              className="text-xs border-border gap-1.5 text-foreground"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />
              <span>Export Duplicates (.xlsx)</span>
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              className="text-xs border-border text-muted-foreground"
            >
              Close
            </Button>
            {totalDuplicates > 0 && (
              <Button
                size="sm"
                onClick={handleExecuteRemoval}
                className="bg-rose-600 hover:bg-rose-500 text-white text-xs gap-1.5 font-semibold shadow-sm shadow-rose-600/30"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Remove {totalDuplicates.toLocaleString()} Duplicate(s)</span>
              </Button>
            )}
          </div>
        </div>
      </div>
    </Dialog>
  );
}

