import React, { useState, useMemo } from "react";
import { useAnalyticsStore } from "@/store/useAnalyticsStore";
import { toast } from "@/components/ui/toast";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUpDown,
  EyeOff,
  Eye,
  Pin,
  PinOff,
  Copy,
  Table,
  SlidersHorizontal
} from "lucide-react";
import { Button } from "@/components/ui/button";

export function DatasetsView() {
  const datasets = useAnalyticsStore((state) => state.datasets);
  const selectedDatasetId = useAnalyticsStore((state) => state.selectedDatasetId);
  const selectedSheetName = useAnalyticsStore((state) => state.selectedSheetName);
  const selectSheet = useAnalyticsStore((state) => state.selectSheet);

  // Active dataset & sheet
  const activeDataset = useMemo(() => {
    return datasets.find((d) => d.id === selectedDatasetId) || null;
  }, [datasets, selectedDatasetId]);

  const activeSheet = useMemo(() => {
    if (!activeDataset || !selectedSheetName) return null;
    return activeDataset.sheets.find((s) => s.name === selectedSheetName) || activeDataset.sheets[0] || null;
  }, [activeDataset, selectedSheetName]);

  // UI Grid State
  const [globalSearch, setGlobalSearch] = useState("");
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
  const [sortConfig, setSortConfig] = useState<{ column: string; direction: "asc" | "desc" | null }>({
    column: "",
    direction: null,
  });
  const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(new Set());
  const [freezeFirstColumn, setFreezeFirstColumn] = useState(false);
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  const [isColumnPanelOpen, setIsColumnPanelOpen] = useState(false);

  // Reset page when sheet changes
  React.useEffect(() => {
    setCurrentPage(1);
    setGlobalSearch("");
    setColumnFilters({});
    setSortConfig({ column: "", direction: null });
  }, [selectedDatasetId, selectedSheetName]);

  // Headers to display
  const headers = useMemo(() => {
    if (!activeSheet) return [];
    return activeSheet.headers;
  }, [activeSheet]);

  // Filtering & Sorting Process
  const processedRows = useMemo(() => {
    if (!activeSheet) return [];
    let result = [...activeSheet.rows];

    // 1. Global Search
    if (globalSearch) {
      const q = globalSearch.toLowerCase();
      result = result.filter((row) =>
        Object.values(row).some((val) => val !== null && val !== undefined && String(val).toLowerCase().includes(q))
      );
    }

    // 2. Column Filters
    Object.entries(columnFilters).forEach(([col, filterText]) => {
      if (!filterText) return;
      const ft = filterText.toLowerCase();
      result = result.filter((row) => {
        const val = row[col];
        return val !== null && val !== undefined && String(val).toLowerCase().includes(ft);
      });
    });

    // 3. Sorting
    if (sortConfig.column && sortConfig.direction) {
      const col = sortConfig.column;
      const dir = sortConfig.direction;
      const type = activeSheet.columnTypes[col];

      result.sort((a, b) => {
        let valA = a[col];
        let valB = b[col];

        if (valA === null || valA === undefined) return 1;
        if (valB === null || valB === undefined) return -1;

        if (type === "number") {
          return dir === "asc" ? Number(valA) - Number(valB) : Number(valB) - Number(valA);
        } else if (type === "date") {
          return dir === "asc"
            ? new Date(valA).getTime() - new Date(valB).getTime()
            : new Date(valB).getTime() - new Date(valA).getTime();
        } else {
          // String
          return dir === "asc"
            ? String(valA).localeCompare(String(valB))
            : String(valB).localeCompare(String(valA));
        }
      });
    }

    return result;
  }, [activeSheet, globalSearch, columnFilters, sortConfig]);

  // Paginated Rows
  const paginatedRows = useMemo(() => {
    const startIndex = (currentPage - 1) * rowsPerPage;
    return processedRows.slice(startIndex, startIndex + rowsPerPage);
  }, [processedRows, currentPage, rowsPerPage]);

  const totalPages = Math.max(1, Math.ceil(processedRows.length / rowsPerPage));

  // Sort toggle handler
  const handleSort = (columnName: string) => {
    setSortConfig((prev) => {
      if (prev.column === columnName) {
        if (prev.direction === "asc") return { column: columnName, direction: "desc" };
        return { column: "", direction: null };
      }
      return { column: columnName, direction: "asc" };
    });
  };

  // Toggle column visibility
  const toggleColumnVisibility = (col: string) => {
    setHiddenColumns((prev) => {
      const next = new Set(prev);
      if (next.has(col)) {
        next.delete(col);
      } else {
        next.add(col);
      }
      return next;
    });
  };

  // Copy cell content to clipboard
  const handleCopyCell = (val: any) => {
    if (val === null || val === undefined) return;
    navigator.clipboard.writeText(String(val));
    toast.success("Cell copied to clipboard");
  };

  // Handle column header filtering
  const handleColumnFilterChange = (colName: string, text: string) => {
    setColumnFilters((prev) => ({
      ...prev,
      [colName]: text,
    }));
    setCurrentPage(1);
  };

  if (!activeDataset || !activeSheet) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-muted-foreground bg-card border border-border rounded-2xl">
        <Table className="h-12 w-12 opacity-30 mb-3" />
        <h3 className="font-display font-semibold text-lg text-foreground mb-1">No Active Datasets</h3>
        <p className="text-xs max-w-sm mb-4">Please upload a spreadsheet file in the Upload tab before viewing the data grid.</p>
        <Button size="sm" onClick={() => useAnalyticsStore.getState().setActiveTab("upload")}>
          Go to Upload Tab
        </Button>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-card border border-border rounded-2xl shadow-sm overflow-hidden">

      {/* Top Grid Toolbar */}
      <div className="p-4 border-b border-border bg-accent/15 flex flex-wrap gap-4 items-center justify-between">

        {/* Dataset/Sheet Selector & Sheet Tabs */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1 bg-accent border border-border rounded-lg text-xs font-semibold text-foreground">
            <Table className="h-3.5 w-3.5 text-primary" />
            <span>{activeDataset.name}</span>
          </div>

          {/* Sheet tabs if multiple */}
          {activeDataset.sheets.length > 1 && (
            <div className="flex bg-accent/60 border border-border p-0.5 rounded-lg overflow-x-auto gap-0.5 max-w-[280px]">
              {activeDataset.sheets.map((sheet) => (
                <button
                  key={sheet.name}
                  onClick={() => selectSheet(sheet.name)}
                  className={`px-3 py-1 rounded-md text-[10px] font-semibold transition-all shrink-0 ${activeSheet.name === sheet.name
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                    }`}
                >
                  {sheet.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Global search, hide cols panel, freeze triggers */}
        <div className="flex items-center gap-3">
          {/* Global Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              placeholder="Search table..."
              value={globalSearch}
              onChange={(e) => { setGlobalSearch(e.target.value); setCurrentPage(1); }}
              className="bg-accent/40 border border-border rounded-lg pl-8 pr-3 py-1 h-8 text-xs focus:outline-none focus:ring-2 focus:ring-primary/45 font-medium max-w-[160px] md:max-w-[200px]"
            />
          </div>

          {/* Freeze toggle */}
          <Button
            variant={freezeFirstColumn ? "primary" : "outline"}
            size="sm"
            className="h-8 gap-1.5 px-2.5 text-xs"
            onClick={() => setFreezeFirstColumn(!freezeFirstColumn)}
          >
            {freezeFirstColumn ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
            <span className="hidden sm:inline">{freezeFirstColumn ? "Unfreeze First" : "Freeze First"}</span>
          </Button>

          {/* Column Toggle Manager */}
          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 px-2.5 text-xs"
              onClick={() => setIsColumnPanelOpen(!isColumnPanelOpen)}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Columns</span>
            </Button>

            {isColumnPanelOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-card border border-border rounded-lg shadow-xl z-50 p-2 glass-panel-heavy max-h-60 overflow-y-auto">
                <h4 className="text-[10px] font-bold text-muted-foreground uppercase px-2 mb-1">Display Columns</h4>
                {headers.map((col) => {
                  const isVisible = !hiddenColumns.has(col);
                  return (
                    <button
                      key={col}
                      onClick={() => toggleColumnVisibility(col)}
                      className="w-full text-left px-2 py-1.5 rounded hover:bg-accent text-xs font-medium flex items-center justify-between"
                    >
                      <span className="truncate mr-2">{col}</span>
                      {isVisible ? <Eye className="h-3.5 w-3.5 text-primary" /> : <EyeOff className="h-3.5 w-3.5 text-muted-foreground/60" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Grid View */}
      <div className="flex-1 overflow-auto relative">
        <table className="min-w-full w-max text-left border-collapse select-text">

          {/* Table Headers */}
          <thead className="bg-accent/40 sticky top-0 z-20 border-b border-border shadow-[0_1px_0_0_rgba(0,0,0,0.05)]">
            <tr>
              {/* Row index header */}
              <th className="w-12 bg-accent/40 text-center text-[10px] font-bold text-muted-foreground uppercase py-2.5 select-none border-r border-border sticky left-0 z-30 shadow-[1px_0_0_0_rgba(0,0,0,0.05)]">
                #
              </th>

              {/* Column headers */}
              {headers.map((col, idx) => {
                if (hiddenColumns.has(col)) return null;

                const isFirst = idx === 0;
                const isSorted = sortConfig.column === col;
                const direction = sortConfig.direction;

                return (
                  <th
                    key={col}
                    className={`text-xs font-semibold text-foreground/90 border-r border-border relative select-none group min-w-[120px] ${isFirst && freezeFirstColumn
                      ? "sticky left-12 bg-accent/55 z-30 shadow-[1px_0_0_0_rgba(0,0,0,0.05)]"
                      : "bg-accent/30"
                      }`}
                  >
                    <div className="flex items-center justify-between gap-1.5">
                      <span
                        className="truncate cursor-pointer flex-1"
                        onClick={() => handleSort(col)}
                        title={col}
                      >
                        {col}
                      </span>
                      <button
                        onClick={() => handleSort(col)}
                        className={`p-0.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground shrink-0 transition-colors ${isSorted ? "text-primary opacity-100" : "opacity-0 group-hover:opacity-100"
                          }`}
                      >
                        <ArrowUpDown className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {/* Column Input Filter */}
                    <div className="mt-1">
                      <input
                        type="text"
                        placeholder={`Filter...`}
                        value={columnFilters[col] || ""}
                        onChange={(e) => handleColumnFilterChange(col, e.target.value)}
                        className="w-full bg-card border border-border rounded px-1.5 py-0.5 text-[10px] focus:outline-none focus:ring-1 focus:ring-primary/45 font-medium"
                      />
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>

          {/* Table Body */}
          <tbody className="divide-y divide-border">
            {paginatedRows.length === 0 ? (
              <tr>
                <td colSpan={headers.length + 1} className="py-12 text-center text-xs text-muted-foreground">
                  No matching records found. Try modifying filters.
                </td>
              </tr>
            ) : (
              paginatedRows.map((row, rIdx) => {
                const globalRowIndex = (currentPage - 1) * rowsPerPage + rIdx + 1;
                const isEven = rIdx % 2 === 0;

                return (
                  <tr
                    key={rIdx}
                    className={`transition-colors hover:bg-primary/5 ${isEven ? "bg-card" : "bg-accent/10"
                      }`}
                  >
                    {/* Index cell */}
                    <td className="w-12 text-center text-[10px] text-muted-foreground font-semibold py-2 select-none border-r border-border bg-card sticky left-0 z-10 shadow-[1px_0_0_0_rgba(0,0,0,0.05)]">
                      {globalRowIndex}
                    </td>

                    {/* Row cells */}
                    {headers.map((col, cIdx) => {
                      if (hiddenColumns.has(col)) return null;

                      const val = row[col];
                      const isFirst = cIdx === 0;

                      // Formatting cell content
                      let displayVal = "";
                      if (val === null || val === undefined) {
                        displayVal = "NULL";
                      } else if (val instanceof Date) {
                        displayVal = val.toLocaleDateString();
                      } else if (typeof val === "boolean") {
                        displayVal = val ? "TRUE" : "FALSE";
                      } else if (typeof val === "object") {
                        displayVal = JSON.stringify(val);
                      } else {
                        displayVal = String(val);
                      }

                      const isNull = val === null || val === undefined;

                      return (
                        <td
                          key={cIdx}
                          onDoubleClick={() => handleCopyCell(val)}
                          title="Double-click to copy cell value"
                          className={`px-3 py-2 text-xs truncate border-r border-border cursor-cell transition-all font-medium min-w-[30px] ${isNull ? "text-danger/60 italic" : "text-foreground/80"
                            } ${isFirst && freezeFirstColumn
                              ? "sticky left-12 bg-card z-10 shadow-[1px_0_0_0_rgba(0,0,0,0.05)]"
                              : ""
                            }`}
                        >
                          {displayVal}
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

      {/* Grid Footer Pagination Controls */}
      <div className="p-4 border-t border-border bg-accent/15 flex flex-wrap gap-4 items-center justify-between text-xs select-none">

        {/* Summary counts */}
        <div className="text-muted-foreground font-semibold">
          Showing <span className="text-foreground">{Math.min(processedRows.length, (currentPage - 1) * rowsPerPage + 1)}</span> to{" "}
          <span className="text-foreground">{Math.min(processedRows.length, currentPage * rowsPerPage)}</span> of{" "}
          <span className="text-foreground">{processedRows.length.toLocaleString()}</span> entries{" "}
          {processedRows.length !== activeSheet.rowCount && (
            <span className="text-primary">(filtered from {activeSheet.rowCount.toLocaleString()} total)</span>
          )}
        </div>

        <div className="flex items-center gap-6">
          {/* Rows per page selector */}
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground font-semibold">Rows per page:</span>
            <select
              value={rowsPerPage}
              onChange={(e) => {
                setRowsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="bg-accent border border-border rounded px-2 py-1 text-xs focus:outline-none font-semibold text-foreground"
            >
              {[10, 25, 50, 100].map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>

          {/* Navigation indicators */}
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(1)}
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(currentPage - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <span className="font-semibold text-muted-foreground px-2">
              Page <span className="text-foreground">{currentPage}</span> of <span className="text-foreground">{totalPages}</span>
            </span>

            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(currentPage + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(totalPages)}
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
