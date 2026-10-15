"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import { useAnalyticsStore } from "@/store/useAnalyticsStore";
import { toast } from "@/components/ui/toast";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cleanRenameColumn, cleanChangeType } from "@/utils/dataOperations";
import { ColumnType, SheetData } from "@/types";
import * as XLSX from "xlsx";
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
  SlidersHorizontal,
  Plus,
  Trash2,
  Edit2,
  Columns,
  Undo2,
  Download,
  FileSpreadsheet,
  FileText,
  MoreVertical,
  Sparkles,
  Check,
  AlertTriangle,
  Hash,
  Type,
  Calendar,
  ToggleLeft,
  X
} from "lucide-react";

interface IndexedRow {
  row: Record<string, any>;
  originalIndex: number;
}

export function DatasetsView() {
  const datasets = useAnalyticsStore((state) => state.datasets);
  const selectedDatasetId = useAnalyticsStore((state) => state.selectedDatasetId);
  const selectedSheetName = useAnalyticsStore((state) => state.selectedSheetName);
  const selectSheet = useAnalyticsStore((state) => state.selectSheet);
  const updateActiveSheetData = useAnalyticsStore((state) => state.updateActiveSheetData);

  // Active dataset & sheet
  const activeDataset = useMemo(() => {
    return datasets.find((d) => d.id === selectedDatasetId) || null;
  }, [datasets, selectedDatasetId]);

  const activeSheet = useMemo(() => {
    if (!activeDataset) return null;
    return (
      activeDataset.sheets.find((s) => s.name === selectedSheetName) ||
      activeDataset.sheets[0] ||
      null
    );
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

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  // In-line Cell Editing State
  const [editingCell, setEditingCell] = useState<{ originalIndex: number; column: string } | null>(null);
  const [editValue, setEditValue] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Undo History Stack
  const [undoStack, setUndoStack] = useState<SheetData[]>([]);

  // Dropdown Panels & Modals
  const [isColumnPanelOpen, setIsColumnPanelOpen] = useState(false);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [activeColumnMenu, setActiveColumnMenu] = useState<string | null>(null);

  // Add Column Modal State
  const [isAddColumnOpen, setIsAddColumnOpen] = useState(false);
  const [newColName, setNewColName] = useState("");
  const [newColType, setNewColType] = useState<ColumnType>("string");
  const [newColDefault, setNewColDefault] = useState("");

  // Rename Column Modal State
  const [isRenameColumnOpen, setIsRenameColumnOpen] = useState(false);
  const [columnToRename, setColumnToRename] = useState("");
  const [renameNewValue, setRenameNewValue] = useState("");

  // Delete Column Modal State
  const [isDeleteColumnConfirmOpen, setIsDeleteColumnConfirmOpen] = useState(false);
  const [columnToDelete, setColumnToDelete] = useState("");

  // Reset page when sheet changes
  useEffect(() => {
    setCurrentPage(1);
    setGlobalSearch("");
    setColumnFilters({});
    setSortConfig({ column: "", direction: null });
    setEditingCell(null);
    setUndoStack([]);
  }, [selectedDatasetId, selectedSheetName]);

  // Auto-focus input when cell editing starts
  useEffect(() => {
    if (editingCell && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingCell]);

  // Click outside listener for dropdowns
  useEffect(() => {
    const handleDocumentClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-column-menu]")) {
        setActiveColumnMenu(null);
      }
      if (!target.closest("[data-export-menu]")) {
        setIsExportMenuOpen(false);
      }
      if (!target.closest("[data-column-panel]")) {
        setIsColumnPanelOpen(false);
      }
    };
    document.addEventListener("mousedown", handleDocumentClick);
    return () => document.removeEventListener("mousedown", handleDocumentClick);
  }, []);

  // Keyboard shortcut: Ctrl+Z / Cmd+Z to undo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z" && !editingCell) {
        e.preventDefault();
        handleUndo();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [undoStack, activeSheet, editingCell]);

  // Headers to display
  const headers = useMemo(() => {
    if (!activeSheet) return [];
    return activeSheet.headers;
  }, [activeSheet]);

  // Filtering & Sorting Process with preservation of original rows index
  const processedRows: IndexedRow[] = useMemo(() => {
    if (!activeSheet) return [];
    let result: IndexedRow[] = activeSheet.rows.map((row, originalIndex) => ({
      row,
      originalIndex,
    }));

    // 1. Global Search
    if (globalSearch) {
      const q = globalSearch.toLowerCase();
      result = result.filter(({ row }) =>
        Object.values(row).some((val) => val !== null && val !== undefined && String(val).toLowerCase().includes(q))
      );
    }

    // 2. Column Filters
    Object.entries(columnFilters).forEach(([col, filterText]) => {
      if (!filterText) return;
      const ft = filterText.toLowerCase();
      result = result.filter(({ row }) => {
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
        let valA = a.row[col];
        let valB = b.row[col];

        if (valA === null || valA === undefined) return 1;
        if (valB === null || valB === undefined) return -1;

        if (type === "number") {
          return dir === "asc" ? Number(valA) - Number(valB) : Number(valB) - Number(valA);
        } else if (type === "date") {
          return dir === "asc"
            ? new Date(valA).getTime() - new Date(valB).getTime()
            : new Date(valB).getTime() - new Date(valA).getTime();
        } else {
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

  // ==========================================
  // UNDO & HISTORY MANAGEMENT
  // ==========================================
  const pushHistory = (currentSheet: SheetData) => {
    setUndoStack((prev) => [...prev.slice(-19), JSON.parse(JSON.stringify(currentSheet))]);
  };

  const handleUndo = () => {
    if (undoStack.length === 0 || !activeSheet) return;
    const previousState = undoStack[undoStack.length - 1];
    setUndoStack((prev) => prev.slice(0, -1));
    updateActiveSheetData(previousState);
    toast.info("Reverted last edit");
  };

  // ==========================================
  // INLINE CELL EDITING
  // ==========================================
  const startEditing = (originalIndex: number, column: string, val: any) => {
    setEditingCell({ originalIndex, column });
    if (val === null || val === undefined) {
      setEditValue("");
    } else if (val instanceof Date) {
      setEditValue(val.toISOString().slice(0, 10));
    } else {
      setEditValue(String(val));
    }
  };

  const saveCellEdit = (originalIndex: number, column: string, rawValue: string) => {
    if (!activeSheet) return;

    const colType = activeSheet.columnTypes[column] || "string";
    const trimmed = rawValue.trim();
    let finalValue: any = rawValue;

    if (trimmed === "") {
      finalValue = colType === "string" ? "" : null;
    } else if (colType === "number") {
      const num = Number(trimmed);
      if (!isNaN(num)) {
        finalValue = num;
      } else {
        toast.error(`"${trimmed}" is not a valid number. Saved as text.`);
        finalValue = trimmed;
      }
    } else if (colType === "boolean") {
      const lower = trimmed.toLowerCase();
      if (lower === "true" || lower === "1" || lower === "yes") {
        finalValue = true;
      } else if (lower === "false" || lower === "0" || lower === "no") {
        finalValue = false;
      } else {
        finalValue = Boolean(trimmed);
      }
    } else if (colType === "date") {
      finalValue = trimmed;
    }

    const previousValue = activeSheet.rows[originalIndex]?.[column];
    if (previousValue === finalValue) {
      setEditingCell(null);
      return;
    }

    pushHistory(activeSheet);

    const updatedRows = [...activeSheet.rows];
    updatedRows[originalIndex] = {
      ...updatedRows[originalIndex],
      [column]: finalValue,
    };

    const updatedSheet: SheetData = {
      ...activeSheet,
      rows: updatedRows,
      rowCount: updatedRows.length,
    };

    updateActiveSheetData(updatedSheet);
    setEditingCell(null);
    toast.success(`Updated cell in "${column}"`);
  };

  const handleCellKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    originalIndex: number,
    col: string,
    paginatedRowIndex: number
  ) => {
    if (e.key === "Enter") {
      e.preventDefault();
      saveCellEdit(originalIndex, col, editValue);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setEditingCell(null);
    } else if (e.key === "Tab") {
      e.preventDefault();
      saveCellEdit(originalIndex, col, editValue);

      const visibleCols = headers.filter((h) => !hiddenColumns.has(h));
      const currentColIdx = visibleCols.indexOf(col);

      if (e.shiftKey) {
        if (currentColIdx > 0) {
          const prevCol = visibleCols[currentColIdx - 1];
          const prevVal = activeSheet?.rows[originalIndex]?.[prevCol];
          startEditing(originalIndex, prevCol, prevVal);
        } else if (paginatedRowIndex > 0) {
          const prevRowItem = paginatedRows[paginatedRowIndex - 1];
          const lastCol = visibleCols[visibleCols.length - 1];
          const prevVal = activeSheet?.rows[prevRowItem.originalIndex]?.[lastCol];
          startEditing(prevRowItem.originalIndex, lastCol, prevVal);
        }
      } else {
        if (currentColIdx < visibleCols.length - 1) {
          const nextCol = visibleCols[currentColIdx + 1];
          const nextVal = activeSheet?.rows[originalIndex]?.[nextCol];
          startEditing(originalIndex, nextCol, nextVal);
        } else if (paginatedRowIndex < paginatedRows.length - 1) {
          const nextRowItem = paginatedRows[paginatedRowIndex + 1];
          const firstCol = visibleCols[0];
          const nextVal = activeSheet?.rows[nextRowItem.originalIndex]?.[firstCol];
          startEditing(nextRowItem.originalIndex, firstCol, nextVal);
        }
      }
    }
  };

  // ==========================================
  // ROW OPERATIONS
  // ==========================================
  const handleAddRow = (position: "top" | "bottom" = "top") => {
    if (!activeSheet) return;
    pushHistory(activeSheet);

    const newRow: Record<string, any> = {};
    activeSheet.headers.forEach((h) => {
      newRow[h] = null;
    });

    const updatedRows = position === "top"
      ? [newRow, ...activeSheet.rows]
      : [...activeSheet.rows, newRow];

    const updatedSheet: SheetData = {
      ...activeSheet,
      rows: updatedRows,
      rowCount: updatedRows.length,
    };

    updateActiveSheetData(updatedSheet);

    if (position === "top") {
      setCurrentPage(1);
      const firstCol = activeSheet.headers.find((h) => !hiddenColumns.has(h)) || activeSheet.headers[0];
      if (firstCol) {
        startEditing(0, firstCol, "");
      }
    }

    toast.success("New row added");
  };

  const handleDeleteRow = (originalIndex: number) => {
    if (!activeSheet) return;
    pushHistory(activeSheet);

    const updatedRows = activeSheet.rows.filter((_, idx) => idx !== originalIndex);
    const updatedSheet: SheetData = {
      ...activeSheet,
      rows: updatedRows,
      rowCount: updatedRows.length,
    };

    updateActiveSheetData(updatedSheet);
    toast.success("Row deleted");
  };

  const handleDuplicateRow = (originalIndex: number) => {
    if (!activeSheet) return;
    pushHistory(activeSheet);

    const targetRow = activeSheet.rows[originalIndex];
    const clonedRow = { ...targetRow };

    const updatedRows = [
      ...activeSheet.rows.slice(0, originalIndex + 1),
      clonedRow,
      ...activeSheet.rows.slice(originalIndex + 1),
    ];

    const updatedSheet: SheetData = {
      ...activeSheet,
      rows: updatedRows,
      rowCount: updatedRows.length,
    };

    updateActiveSheetData(updatedSheet);
    toast.success("Row duplicated");
  };

  // ==========================================
  // COLUMN OPERATIONS
  // ==========================================
  const handleAddColumn = () => {
    if (!activeSheet) return;
    const colName = newColName.trim();
    if (!colName) {
      toast.error("Please enter a column name");
      return;
    }
    if (activeSheet.headers.some((h) => h.toLowerCase() === colName.toLowerCase())) {
      toast.error(`Column "${colName}" already exists`);
      return;
    }

    pushHistory(activeSheet);

    let defaultVal: any = newColDefault;
    if (newColDefault.trim() === "") {
      defaultVal = null;
    } else if (newColType === "number") {
      const num = Number(newColDefault);
      defaultVal = isNaN(num) ? null : num;
    } else if (newColType === "boolean") {
      defaultVal = newColDefault.toLowerCase() === "true" || newColDefault === "1";
    }

    const updatedHeaders = [...activeSheet.headers, colName];
    const updatedTypes = {
      ...activeSheet.columnTypes,
      [colName]: newColType,
    };

    const updatedRows = activeSheet.rows.map((row) => ({
      ...row,
      [colName]: defaultVal,
    }));

    const updatedSheet: SheetData = {
      ...activeSheet,
      headers: updatedHeaders,
      rows: updatedRows,
      columnCount: updatedHeaders.length,
      columnTypes: updatedTypes,
    };

    updateActiveSheetData(updatedSheet);
    setIsAddColumnOpen(false);
    setNewColName("");
    setNewColDefault("");
    toast.success(`Column "${colName}" added`);
  };

  const handleRenameColumn = () => {
    if (!activeSheet || !columnToRename) return;
    const cleanName = renameNewValue.trim();
    if (!cleanName) {
      toast.error("Column name cannot be empty");
      return;
    }
    if (cleanName === columnToRename) {
      setIsRenameColumnOpen(false);
      return;
    }
    if (activeSheet.headers.some((h) => h.toLowerCase() === cleanName.toLowerCase() && h !== columnToRename)) {
      toast.error(`A column named "${cleanName}" already exists`);
      return;
    }

    pushHistory(activeSheet);
    const updated = cleanRenameColumn(activeSheet, columnToRename, cleanName);
    updateActiveSheetData(updated);
    setIsRenameColumnOpen(false);
    setColumnToRename("");
    setRenameNewValue("");
    toast.success(`Column renamed to "${cleanName}"`);
  };

  const handleDeleteColumn = (colName: string) => {
    if (!activeSheet) return;
    if (activeSheet.headers.length <= 1) {
      toast.error("Cannot delete the only column in the sheet");
      return;
    }

    pushHistory(activeSheet);

    const updatedHeaders = activeSheet.headers.filter((h) => h !== colName);
    const updatedTypes = { ...activeSheet.columnTypes };
    delete updatedTypes[colName];

    const updatedRows = activeSheet.rows.map((row) => {
      const nextRow = { ...row };
      delete nextRow[colName];
      return nextRow;
    });

    const updatedSheet: SheetData = {
      ...activeSheet,
      headers: updatedHeaders,
      rows: updatedRows,
      columnCount: updatedHeaders.length,
      columnTypes: updatedTypes,
    };

    updateActiveSheetData(updatedSheet);
    setHiddenColumns((prev) => {
      const next = new Set(prev);
      next.delete(colName);
      return next;
    });
    setIsDeleteColumnConfirmOpen(false);
    setColumnToDelete("");
    toast.success(`Column "${colName}" deleted`);
  };

  const handleChangeColumnType = (colName: string, targetType: ColumnType) => {
    if (!activeSheet) return;
    pushHistory(activeSheet);
    const updated = cleanChangeType(activeSheet, colName, targetType);
    updateActiveSheetData(updated);
    setActiveColumnMenu(null);
    toast.success(`Converted "${colName}" to ${targetType}`);
  };

  // ==========================================
  // QUICK EXPORT
  // ==========================================
  const handleQuickExport = (type: "xlsx" | "csv") => {
    if (!activeSheet) return;
    try {
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(activeSheet.rows);
      XLSX.utils.book_append_sheet(wb, ws, activeSheet.name.substring(0, 30));

      const baseName = (activeDataset?.name || "Dataset").replace(/\.[^/.]+$/, "");
      const fileName = `${baseName}_${activeSheet.name}_edited.${type}`;

      if (type === "xlsx") {
        XLSX.writeFile(wb, fileName);
      } else {
        const csvContent = XLSX.utils.sheet_to_csv(ws);
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", fileName);
        link.click();
      }
      toast.success(`Exported: ${fileName}`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to export spreadsheet");
    }
  };

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

  // Helper to render type badge
  const renderColumnTypeBadge = (type: ColumnType) => {
    switch (type) {
      case "number":
        return (
          <span className="flex items-center gap-0.5 text-[9px] px-1 py-0.5 rounded bg-blue-500/10 text-blue-500 font-mono font-semibold" title="Numeric column">
            <Hash className="h-2.5 w-2.5" />
            <span>NUM</span>
          </span>
        );
      case "boolean":
        return (
          <span className="flex items-center gap-0.5 text-[9px] px-1 py-0.5 rounded bg-purple-500/10 text-purple-500 font-mono font-semibold" title="Boolean column">
            <ToggleLeft className="h-2.5 w-2.5" />
            <span>BOOL</span>
          </span>
        );
      case "date":
        return (
          <span className="flex items-center gap-0.5 text-[9px] px-1 py-0.5 rounded bg-amber-500/10 text-amber-500 font-mono font-semibold" title="Date column">
            <Calendar className="h-2.5 w-2.5" />
            <span>DATE</span>
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-0.5 text-[9px] px-1 py-0.5 rounded bg-emerald-500/10 text-emerald-500 font-mono font-semibold" title="Text column">
            <Type className="h-2.5 w-2.5" />
            <span>TEXT</span>
          </span>
        );
    }
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
        <div className="flex flex-wrap items-center gap-3">
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
                  className={`px-3 py-1 rounded-md text-[10px] font-semibold transition-all shrink-0 ${
                    activeSheet.name === sheet.name
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {sheet.name}
                </button>
              ))}
            </div>
          )}

          {/* Editing Operations Toolbar */}
          <div className="flex items-center gap-1.5 ml-1">
            <Button
              variant="primary"
              size="sm"
              className="h-8 gap-1.5 px-3 text-xs shadow-sm shadow-primary/20"
              onClick={() => handleAddRow("top")}
              title="Add a new empty row to top of sheet"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Row</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 px-3 text-xs"
              onClick={() => {
                setNewColName("");
                setNewColType("string");
                setNewColDefault("");
                setIsAddColumnOpen(true);
              }}
              title="Add a new column to the sheet"
            >
              <Columns className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Add Column</span>
            </Button>

            {/* Undo Button */}
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 px-2.5 text-xs"
              disabled={undoStack.length === 0}
              onClick={handleUndo}
              title="Undo last change (Ctrl+Z)"
            >
              <Undo2 className="h-3.5 w-3.5" />
              <span>Undo</span>
              {undoStack.length > 0 && (
                <span className="ml-0.5 bg-primary/20 text-primary px-1.5 py-0.2 rounded-full text-[10px] font-bold">
                  {undoStack.length}
                </span>
              )}
            </Button>

            {/* Quick Export Dropdown */}
            <div className="relative" data-export-menu>
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 px-2.5 text-xs"
                onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
                title="Download current sheet"
              >
                <Download className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Export</span>
              </Button>
              {isExportMenuOpen && (
                <div className="absolute left-0 mt-1 w-44 bg-card border border-border rounded-lg shadow-xl z-50 p-1 glass-panel-heavy">
                  <button
                    onClick={() => {
                      handleQuickExport("xlsx");
                      setIsExportMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-1.5 text-xs rounded hover:bg-accent flex items-center gap-2 font-medium"
                  >
                    <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-500" />
                    <span>Download Excel</span>
                  </button>
                  <button
                    onClick={() => {
                      handleQuickExport("csv");
                      setIsExportMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-1.5 text-xs rounded hover:bg-accent flex items-center gap-2 font-medium"
                  >
                    <FileText className="h-3.5 w-3.5 text-blue-500" />
                    <span>Download CSV</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Global search, hide cols panel, freeze triggers */}
        <div className="flex items-center gap-2.5">
          {/* Global Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              placeholder="Search table..."
              value={globalSearch}
              onChange={(e) => {
                setGlobalSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-accent/40 border border-border rounded-lg pl-8 pr-3 py-1 h-8 text-xs focus:outline-none focus:ring-2 focus:ring-primary/45 font-medium max-w-[150px] md:max-w-[190px]"
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
          <div className="relative" data-column-panel>
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

      {/* Helper Guidance Strip */}
      <div className="px-4 py-1.5 bg-primary/5 border-b border-border flex items-center justify-between text-[11px] text-muted-foreground">
        <div className="flex items-center gap-2 overflow-hidden">
          <span className="inline-flex items-center gap-1 text-primary font-semibold shrink-0">
            <Sparkles className="h-3 w-3" />
            Editable Grid:
          </span>
          <span className="truncate">
            Double-click any cell to edit inline. Press <kbd className="px-1 py-0.2 bg-accent border border-border rounded text-[10px] font-mono">Enter</kbd> to save, <kbd className="px-1 py-0.2 bg-accent border border-border rounded text-[10px] font-mono">Tab</kbd> to jump between cells, <kbd className="px-1 py-0.2 bg-accent border border-border rounded text-[10px] font-mono">Esc</kbd> to cancel.
          </span>
        </div>
        <div className="hidden lg:flex items-center gap-3 shrink-0 text-muted-foreground/80">
          <span>Shortcuts: <kbd className="px-1 py-0.2 bg-accent border border-border rounded text-[10px] font-mono">Ctrl+Z</kbd> Undo</span>
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

              {/* Row Actions header */}
              <th className="w-20 bg-accent/40 text-center text-[10px] font-bold text-muted-foreground uppercase py-2.5 select-none border-r border-border sticky left-12 z-30 shadow-[1px_0_0_0_rgba(0,0,0,0.05)]">
                Actions
              </th>

              {/* Column headers */}
              {headers.map((col, idx) => {
                if (hiddenColumns.has(col)) return null;

                const isFirst = idx === 0;
                const isSorted = sortConfig.column === col;
                const colType = activeSheet.columnTypes[col] || "string";
                const isMenuOpen = activeColumnMenu === col;

                return (
                  <th
                    key={col}
                    className={`text-xs font-semibold text-foreground/90 border-r border-border relative select-none group min-w-[140px] px-3 py-2 ${
                      isFirst && freezeFirstColumn
                        ? "sticky left-32 bg-accent/55 z-30 shadow-[1px_0_0_0_rgba(0,0,0,0.05)]"
                        : "bg-accent/30"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1.5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        {renderColumnTypeBadge(colType)}
                        <span
                          className="truncate cursor-pointer font-bold hover:text-primary transition-colors"
                          onClick={() => handleSort(col)}
                          title={`${col} (Click to sort)`}
                        >
                          {col}
                        </span>
                      </div>

                      <div className="flex items-center gap-0.5 shrink-0">
                        {/* Sort button */}
                        <button
                          onClick={() => handleSort(col)}
                          className={`p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors ${
                            isSorted ? "text-primary opacity-100 font-bold" : "opacity-0 group-hover:opacity-100"
                          }`}
                          title="Sort Column"
                        >
                          <ArrowUpDown className="h-3 w-3" />
                        </button>

                        {/* Column Context Menu */}
                        <div className="relative" data-column-menu>
                          <button
                            onClick={() => setActiveColumnMenu(isMenuOpen ? null : col)}
                            className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Column options"
                          >
                            <MoreVertical className="h-3 w-3" />
                          </button>

                          {isMenuOpen && (
                            <div className="absolute right-0 mt-1 w-44 bg-card border border-border rounded-lg shadow-2xl z-50 p-1 glass-panel-heavy">
                              <button
                                onClick={() => {
                                  setColumnToRename(col);
                                  setRenameNewValue(col);
                                  setIsRenameColumnOpen(true);
                                  setActiveColumnMenu(null);
                                }}
                                className="w-full text-left px-2.5 py-1.5 text-xs rounded hover:bg-accent flex items-center gap-2 font-medium"
                              >
                                <Edit2 className="h-3.5 w-3.5 text-muted-foreground" />
                                <span>Rename Column</span>
                              </button>

                              <div className="my-1 border-t border-border" />
                              <div className="px-2 py-1 text-[10px] font-bold text-muted-foreground uppercase">
                                Change Type
                              </div>

                              {(["string", "number", "boolean", "date"] as ColumnType[]).map((t) => (
                                <button
                                  key={t}
                                  onClick={() => handleChangeColumnType(col, t)}
                                  className={`w-full text-left px-2.5 py-1 text-xs rounded hover:bg-accent flex items-center justify-between font-medium ${
                                    colType === t ? "text-primary font-semibold" : ""
                                  }`}
                                >
                                  <span className="capitalize">{t}</span>
                                  {colType === t && <Check className="h-3 w-3 text-primary" />}
                                </button>
                              ))}

                              <div className="my-1 border-t border-border" />

                              <button
                                onClick={() => {
                                  toggleColumnVisibility(col);
                                  setActiveColumnMenu(null);
                                }}
                                className="w-full text-left px-2.5 py-1.5 text-xs rounded hover:bg-accent flex items-center gap-2 font-medium"
                              >
                                <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
                                <span>Hide Column</span>
                              </button>

                              <button
                                onClick={() => {
                                  setColumnToDelete(col);
                                  setIsDeleteColumnConfirmOpen(true);
                                  setActiveColumnMenu(null);
                                }}
                                className="w-full text-left px-2.5 py-1.5 text-xs rounded hover:bg-danger/10 text-danger flex items-center gap-2 font-medium"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                <span>Delete Column</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Column Input Filter */}
                    <div className="mt-1.5">
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
                <td colSpan={headers.length + 2} className="py-12 text-center text-xs text-muted-foreground">
                  No matching records found. Try modifying filters or add a new row above.
                </td>
              </tr>
            ) : (
              paginatedRows.map((item, rIdx) => {
                const globalRowIndex = (currentPage - 1) * rowsPerPage + rIdx + 1;
                const isEven = rIdx % 2 === 0;

                return (
                  <tr
                    key={item.originalIndex}
                    className={`transition-colors hover:bg-primary/5 group ${isEven ? "bg-card" : "bg-accent/10"}`}
                  >
                    {/* Index cell */}
                    <td className="w-12 text-center text-[10px] text-muted-foreground font-semibold py-2 select-none border-r border-border bg-card sticky left-0 z-10 shadow-[1px_0_0_0_rgba(0,0,0,0.05)]">
                      {globalRowIndex}
                    </td>

                    {/* Row Actions Cell */}
                    <td className="w-20 text-center py-1.5 px-1 select-none border-r border-border bg-card sticky left-12 z-10 shadow-[1px_0_0_0_rgba(0,0,0,0.05)]">
                      <div className="flex items-center justify-center gap-1 opacity-40 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => {
                            const firstCol = headers.find((h) => !hiddenColumns.has(h)) || headers[0];
                            startEditing(item.originalIndex, firstCol, item.row[firstCol]);
                          }}
                          className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-primary transition-colors"
                          title="Edit Row"
                        >
                          <Edit2 className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => handleDuplicateRow(item.originalIndex)}
                          className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                          title="Duplicate Row"
                        >
                          <Copy className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => handleDeleteRow(item.originalIndex)}
                          className="p-1 rounded hover:bg-danger/10 text-muted-foreground hover:text-danger transition-colors"
                          title="Delete Row"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </td>

                    {/* Data Cells */}
                    {headers.map((col, cIdx) => {
                      if (hiddenColumns.has(col)) return null;

                      const val = item.row[col];
                      const isFirst = cIdx === 0;
                      const isEditing =
                        editingCell?.originalIndex === item.originalIndex && editingCell?.column === col;

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
                          key={col}
                          onDoubleClick={() => startEditing(item.originalIndex, col, val)}
                          title="Double-click to edit cell value"
                          className={`px-3 py-1.5 text-xs truncate border-r border-border cursor-cell transition-all font-medium min-w-[140px] relative ${
                            isNull ? "text-danger/60 italic" : "text-foreground/85"
                          } ${
                            isFirst && freezeFirstColumn
                              ? "sticky left-32 bg-card z-10 shadow-[1px_0_0_0_rgba(0,0,0,0.05)]"
                              : ""
                          }`}
                        >
                          {isEditing ? (
                            <div className="flex items-center -m-1">
                              <input
                                ref={inputRef}
                                type="text"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onBlur={() => saveCellEdit(item.originalIndex, col, editValue)}
                                onKeyDown={(e) => handleCellKeyDown(e, item.originalIndex, col, rIdx)}
                                className="w-full bg-card text-foreground px-2 py-1 text-xs font-medium border-2 border-primary rounded outline-none shadow-md z-30"
                              />
                            </div>
                          ) : (
                            <div className="flex items-center justify-between group/cell">
                              <span className="truncate flex-1">{displayVal}</span>
                              <button
                                onClick={() => handleCopyCell(val)}
                                className="p-0.5 rounded opacity-0 group-hover/cell:opacity-100 hover:bg-accent text-muted-foreground hover:text-foreground transition-opacity ml-1 shrink-0"
                                title="Copy Value"
                              >
                                <Copy className="h-2.5 w-2.5" />
                              </button>
                            </div>
                          )}
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
        <div className="text-muted-foreground font-semibold flex items-center gap-2">
          <span>
            Showing <span className="text-foreground">{Math.min(processedRows.length, (currentPage - 1) * rowsPerPage + 1)}</span> to{" "}
            <span className="text-foreground">{Math.min(processedRows.length, currentPage * rowsPerPage)}</span> of{" "}
            <span className="text-foreground">{processedRows.length.toLocaleString()}</span> entries{" "}
            {processedRows.length !== activeSheet.rowCount && (
              <span className="text-primary">(filtered from {activeSheet.rowCount.toLocaleString()} total)</span>
            )}
          </span>
          <span className="text-muted-foreground/60">•</span>
          <span className="text-muted-foreground font-medium">
            {headers.length} Columns
          </span>
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
              title="First Page"
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(currentPage - 1)}
              title="Previous Page"
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
              title="Next Page"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(totalPages)}
              title="Last Page"
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* ========================================== */}
      {/* ADD COLUMN DIALOG */}
      {/* ========================================== */}
      <Dialog
        isOpen={isAddColumnOpen}
        onClose={() => setIsAddColumnOpen(false)}
        title="Add New Column"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Column Name <span className="text-danger">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Status, Revenue, Notes"
              value={newColName}
              onChange={(e) => setNewColName(e.target.value)}
              className="w-full bg-accent/40 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Data Type
            </label>
            <select
              value={newColType}
              onChange={(e) => setNewColType(e.target.value as ColumnType)}
              className="w-full bg-accent/40 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 font-medium"
            >
              <option value="string">Text (String)</option>
              <option value="number">Numeric (Number)</option>
              <option value="boolean">Boolean (True / False)</option>
              <option value="date">Date</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Default Value (Optional)
            </label>
            <input
              type="text"
              placeholder="Leave empty for NULL values"
              value={newColDefault}
              onChange={(e) => setNewColDefault(e.target.value)}
              className="w-full bg-accent/40 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-border">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAddColumnOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleAddColumn}
            >
              Add Column
            </Button>
          </div>
        </div>
      </Dialog>

      {/* ========================================== */}
      {/* RENAME COLUMN DIALOG */}
      {/* ========================================== */}
      <Dialog
        isOpen={isRenameColumnOpen}
        onClose={() => setIsRenameColumnOpen(false)}
        title={`Rename Column: "${columnToRename}"`}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              New Column Name
            </label>
            <input
              type="text"
              value={renameNewValue}
              onChange={(e) => setRenameNewValue(e.target.value)}
              className="w-full bg-accent/40 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              autoFocus
            />
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-border">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsRenameColumnOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleRenameColumn}
            >
              Rename
            </Button>
          </div>
        </div>
      </Dialog>

      {/* ========================================== */}
      {/* DELETE COLUMN CONFIRMATION DIALOG */}
      {/* ========================================== */}
      <Dialog
        isOpen={isDeleteColumnConfirmOpen}
        onClose={() => setIsDeleteColumnConfirmOpen(false)}
        title="Delete Column"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-3 bg-danger/10 border border-danger/20 rounded-lg text-xs text-danger">
            <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold mb-1">Permanently remove column?</div>
              <p className="leading-relaxed">
                Are you sure you want to delete <span className="font-bold">"{columnToDelete}"</span>? All data in this column across all rows will be removed from this sheet. You can use Undo to recover it.
              </p>
            </div>
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-border">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsDeleteColumnConfirmOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => handleDeleteColumn(columnToDelete)}
            >
              Delete Column
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
