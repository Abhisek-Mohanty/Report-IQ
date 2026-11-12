"use client";

import React, { useState, useMemo, useRef } from "react";
import { useAnalyticsStore } from "@/store/useAnalyticsStore";
import { Dataset, SheetData, ColumnType } from "@/types";
import { detectColumnTypes } from "@/utils/excelParser";
import { formatBytes } from "@/lib/utils";
import { toast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import * as XLSX from "xlsx";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileJson,
  Download,
  Database,
  Sparkles,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Table,
  Code2,
  Copy,
  Check,
  RefreshCw,
  FileSpreadsheet,
  ArrowRight,
  Search,
  SlidersHorizontal,
  Eye,
  Trash2,
  FileDown,
  Info,
  ExternalLink,
  ChevronLeft,
  ChevronRight
} from "lucide-react";

// ============================================================================
// Sample JSON Presets for 1-Click Testing
// ============================================================================

const SAMPLE_PRESETS: Record<string, { label: string; description: string; data: any }> = {
  ecommerce: {
    label: "E-Commerce Orders",
    description: "Orders with nested customer objects, categories, quantities, and totals",
    data: [
      {
        order_id: "ORD-7801",
        customer: { name: "Sarah Connor", tier: "Platinum", email: "s.connor@cyber.io" },
        product: "Quantum Core Processor i9",
        category: "Electronics",
        quantity: 2,
        unit_price: 499.99,
        total_amount: 999.98,
        status: "Delivered",
        order_date: "2026-03-12",
      },
      {
        order_id: "ORD-7802",
        customer: { name: "James Holden", tier: "Gold", email: "j.holden@roci.net" },
        product: "Ergonomic Mechanical Keyboard",
        category: "Peripherals",
        quantity: 1,
        unit_price: 149.5,
        total_amount: 149.5,
        status: "Shipped",
        order_date: "2026-03-14",
      },
      {
        order_id: "ORD-7803",
        customer: { name: "Naomi Nagata", tier: "Platinum", email: "n.nagata@belters.org" },
        product: "Ultra-Wide 4K Gaming Monitor 34\"",
        category: "Electronics",
        quantity: 1,
        unit_price: 799.0,
        total_amount: 799.0,
        status: "Processing",
        order_date: "2026-03-15",
      },
      {
        order_id: "ORD-7804",
        customer: { name: "Amos Burton", tier: "Silver", email: "a.burton@baltimore.com" },
        product: "Heavy-Duty Cable Organizer Kit",
        category: "Accessories",
        quantity: 5,
        unit_price: 24.99,
        total_amount: 124.95,
        status: "Delivered",
        order_date: "2026-03-16",
      },
      {
        order_id: "ORD-7805",
        customer: { name: "Chrisjen Avasarala", tier: "Diamond", email: "c.avasarala@un.gov" },
        product: "Noise-Cancelling Studio Headset",
        category: "Audio",
        quantity: 3,
        unit_price: 329.0,
        total_amount: 987.0,
        status: "Pending Payment",
        order_date: "2026-03-17",
      },
    ],
  },
  financial: {
    label: "Financial Transactions",
    description: "Banking ledger records with counterparties, currency amounts, and audit flags",
    data: [
      {
        transaction_id: "TXN-9021",
        date: "2026-03-01",
        account_number: "ACC-54890",
        counterparty: "Apex Global Ventures",
        transaction_type: "Credit",
        amount_inr: 2500000,
        fee: 1500,
        status: "Settled",
        reconciled: true,
      },
      {
        transaction_id: "TXN-9022",
        date: "2026-03-03",
        account_number: "ACC-12409",
        counterparty: "Starlight Cloud Hosting",
        transaction_type: "Debit",
        amount_inr: 48500,
        fee: 250,
        status: "Settled",
        reconciled: true,
      },
      {
        transaction_id: "TXN-9023",
        date: "2026-03-05",
        account_number: "ACC-77312",
        counterparty: "Vanguard Micro-Finance",
        transaction_type: "Credit",
        amount_inr: 1200000,
        fee: 900,
        status: "Under Review",
        reconciled: false,
      },
      {
        transaction_id: "TXN-9024",
        date: "2026-03-08",
        account_number: "ACC-99104",
        counterparty: "Helix Health Benefits",
        transaction_type: "Debit",
        amount_inr: 315000,
        fee: 500,
        status: "Settled",
        reconciled: true,
      },
    ],
  },
  multisheet: {
    label: "Multi-Sheet (Customers & Invoices)",
    description: "Nested root object with two arrays converted into separate Excel tabs",
    data: {
      Customers: [
        { customer_id: "CUST-01", name: "Global Logistics Corp", country: "USA", credit_limit: 500000 },
        { customer_id: "CUST-02", name: "NeoTech Solutions Ltd", country: "India", credit_limit: 750000 },
        { customer_id: "CUST-03", name: "Nordic Clean Energy AB", country: "Sweden", credit_limit: 1200000 },
      ],
      Invoices: [
        { inv_id: "INV-2026-01", customer_id: "CUST-01", amount: 142000, status: "Paid", due_date: "2026-04-15" },
        { inv_id: "INV-2026-02", customer_id: "CUST-02", amount: 89500, status: "Pending", due_date: "2026-04-20" },
        { inv_id: "INV-2026-03", customer_id: "CUST-03", amount: 310000, status: "Paid", due_date: "2026-04-30" },
      ],
    },
  },
};

// ============================================================================
// Helper: Flatten Nested Objects
// ============================================================================

function flattenObject(
  obj: Record<string, any>,
  prefix = "",
  res: Record<string, any> = {}
): Record<string, any> {
  if (!obj || typeof obj !== "object") return res;

  for (const key of Object.keys(obj)) {
    const val = obj[key];
    const newKey = prefix ? `${prefix}.${key}` : key;

    if (val !== null && typeof val === "object" && !Array.isArray(val) && !(val instanceof Date)) {
      flattenObject(val, newKey, res);
    } else if (Array.isArray(val)) {
      if (val.length === 0) {
        res[newKey] = "";
      } else if (val.every((item) => typeof item !== "object")) {
        res[newKey] = val.join(", ");
      } else {
        res[newKey] = JSON.stringify(val);
      }
    } else {
      res[newKey] = val;
    }
  }
  return res;
}

interface ParsedSheetResult {
  sheetName: string;
  headers: string[];
  rows: Record<string, any>[];
  rowCount: number;
}

export function JsonConverterView() {
  const addDataset = useAnalyticsStore((state) => state.addDataset);
  const selectDataset = useAnalyticsStore((state) => state.selectDataset);
  const selectSheet = useAnalyticsStore((state) => state.selectSheet);
  const setActiveTab = useAnalyticsStore((state) => state.setActiveTab);

  // JSON Input State
  const [jsonText, setJsonText] = useState<string>(() =>
    JSON.stringify(SAMPLE_PRESETS.ecommerce.data, null, 2)
  );
  const [datasetName, setDatasetName] = useState<string>("Converted_JSON_Data");
  const [sheetName, setSheetName] = useState<string>("Sheet1");
  const [flattenNested, setFlattenNested] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);
  const [activePreviewTab, setActivePreviewTab] = useState<string>("");
  const [searchPreview, setSearchPreview] = useState<string>("");
  const [previewPage, setPreviewPage] = useState<number>(1);
  const rowsPerPage = 12;

  // File upload input ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Conversion Success Dialog State
  const [successDialog, setSuccessDialog] = useState<{
    isOpen: boolean;
    datasetName: string;
    datasetId: string;
    sheetsCount: number;
    rowsCount: number;
  }>({
    isOpen: false,
    datasetName: "",
    datasetId: "",
    sheetsCount: 0,
    rowsCount: 0,
  });

  // ============================================================================
  // JSON Parsing & Extraction Pipeline
  // ============================================================================

  const { parsedSheets, parseError, rawParsedData } = useMemo(() => {
    const trimmed = jsonText.trim();
    if (!trimmed) {
      return { parsedSheets: [], parseError: null, rawParsedData: null };
    }

    try {
      const parsed = JSON.parse(trimmed);
      const sheetsResult: ParsedSheetResult[] = [];

      // Case 1: Root is an Array
      if (Array.isArray(parsed)) {
        if (parsed.length === 0) {
          return {
            parsedSheets: [],
            parseError: "The provided JSON array is empty ([]).",
            rawParsedData: parsed,
          };
        }

        // Process rows
        const processedRows: Record<string, any>[] = [];
        const headerSet = new Set<string>();

        parsed.forEach((item, idx) => {
          if (item !== null && typeof item === "object" && !Array.isArray(item)) {
            const row = flattenNested ? flattenObject(item) : { ...item };
            Object.keys(row).forEach((k) => headerSet.add(k));
            processedRows.push(row);
          } else {
            // Primitive item in array
            headerSet.add("value");
            processedRows.push({ value: item });
          }
        });

        const headers = Array.from(headerSet);
        const normalizedRows = processedRows.map((r) => {
          const cleanRow: Record<string, any> = {};
          headers.forEach((h) => {
            cleanRow[h] = r[h] !== undefined ? r[h] : null;
          });
          return cleanRow;
        });

        sheetsResult.push({
          sheetName: sheetName.trim() || "Sheet1",
          headers,
          rows: normalizedRows,
          rowCount: normalizedRows.length,
        });
      }
      // Case 2: Root is an Object
      else if (parsed !== null && typeof parsed === "object") {
        // Check for array properties inside root object (multi-sheet or wrapped array)
        const arrayKeys = Object.keys(parsed).filter((k) => Array.isArray(parsed[k]));

        if (arrayKeys.length > 0) {
          // Each array property becomes a separate Sheet!
          arrayKeys.forEach((key) => {
            const arr = parsed[key];
            if (!Array.isArray(arr) || arr.length === 0) return;

            const processedRows: Record<string, any>[] = [];
            const headerSet = new Set<string>();

            arr.forEach((item) => {
              if (item !== null && typeof item === "object" && !Array.isArray(item)) {
                const row = flattenNested ? flattenObject(item) : { ...item };
                Object.keys(row).forEach((k) => headerSet.add(k));
                processedRows.push(row);
              } else {
                headerSet.add("value");
                processedRows.push({ value: item });
              }
            });

            const headers = Array.from(headerSet);
            const normalizedRows = processedRows.map((r) => {
              const cleanRow: Record<string, any> = {};
              headers.forEach((h) => {
                cleanRow[h] = r[h] !== undefined ? r[h] : null;
              });
              return cleanRow;
            });

            sheetsResult.push({
              sheetName: key.substring(0, 31),
              headers,
              rows: normalizedRows,
              rowCount: normalizedRows.length,
            });
          });
        }

        // If no array properties found, treat single object as 1-row dataset
        if (sheetsResult.length === 0) {
          const row = flattenNested ? flattenObject(parsed) : { ...parsed };
          const headers = Object.keys(row);
          sheetsResult.push({
            sheetName: sheetName.trim() || "Sheet1",
            headers,
            rows: [row],
            rowCount: 1,
          });
        }
      } else {
        return {
          parsedSheets: [],
          parseError: "Root JSON must be an array of objects or a valid JSON object.",
          rawParsedData: parsed,
        };
      }

      return {
        parsedSheets: sheetsResult,
        parseError: null,
        rawParsedData: parsed,
      };
    } catch (err: any) {
      return {
        parsedSheets: [],
        parseError: err.message || "Invalid JSON syntax.",
        rawParsedData: null,
      };
    }
  }, [jsonText, sheetName, flattenNested]);

  // Current active sheet for table preview
  const currentSheet = useMemo(() => {
    if (parsedSheets.length === 0) return null;
    const found = parsedSheets.find((s) => s.sheetName === activePreviewTab);
    return found || parsedSheets[0];
  }, [parsedSheets, activePreviewTab]);

  // Filtered preview rows based on search
  const filteredPreviewRows = useMemo(() => {
    if (!currentSheet) return [];
    if (!searchPreview.trim()) return currentSheet.rows;

    const q = searchPreview.toLowerCase();
    return currentSheet.rows.filter((row) =>
      Object.values(row).some((val) =>
        val !== null && val !== undefined && String(val).toLowerCase().includes(q)
      )
    );
  }, [currentSheet, searchPreview]);

  // Total summary metrics
  const totalRowsCount = useMemo(() => {
    return parsedSheets.reduce((sum, s) => sum + s.rowCount, 0);
  }, [parsedSheets]);

  const totalColsCount = useMemo(() => {
    return parsedSheets.reduce((sum, s) => sum + s.headers.length, 0);
  }, [parsedSheets]);

  // Inferred column types for current sheet
  const currentColumnTypes = useMemo(() => {
    if (!currentSheet) return {};
    return detectColumnTypes(currentSheet.headers, currentSheet.rows);
  }, [currentSheet]);

  // ============================================================================
  // Action: Prettify / Format JSON
  // ============================================================================

  const handlePrettify = () => {
    try {
      const parsed = JSON.parse(jsonText);
      setJsonText(JSON.stringify(parsed, null, 2));
      toast.success("JSON formatted cleanly!");
    } catch (err: any) {
      toast.error(`Cannot format: ${err.message}`);
    }
  };

  const handleMinify = () => {
    try {
      const parsed = JSON.parse(jsonText);
      setJsonText(JSON.stringify(parsed));
      toast.success("JSON minified!");
    } catch (err: any) {
      toast.error(`Cannot minify: ${err.message}`);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonText);
    setCopied(true);
    toast.success("JSON copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClear = () => {
    setJsonText("");
    toast.info("JSON input cleared.");
  };

  const handleLoadPreset = (key: string) => {
    const preset = SAMPLE_PRESETS[key];
    if (preset) {
      setJsonText(JSON.stringify(preset.data, null, 2));
      setDatasetName(preset.label.replace(/\s+/g, "_"));
      toast.success(`Loaded "${preset.label}" preset!`);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        JSON.parse(text); // validate
        setJsonText(text);
        const nameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
        setDatasetName(nameWithoutExt);
        toast.success(`Loaded JSON file "${file.name}"!`);
      } catch (err: any) {
        toast.error(`Failed to parse file: ${err.message}`);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  // ============================================================================
  // Action: Convert to Excel Workbook (.xlsx)
  // ============================================================================

  const generateExcelWorkbook = () => {
    if (parsedSheets.length === 0) {
      throw new Error("No valid sheets or records found to convert.");
    }

    const wb = XLSX.utils.book_new();

    parsedSheets.forEach((s) => {
      const ws = XLSX.utils.json_to_sheet(s.rows, { header: s.headers });

      // Auto-fit column widths based on maximum string lengths
      const colWidths = s.headers.map((h) => {
        let maxLen = h.length;
        s.rows.slice(0, 100).forEach((r) => {
          const valStr = r[h] !== null && r[h] !== undefined ? String(r[h]) : "";
          if (valStr.length > maxLen) maxLen = valStr.length;
        });
        return { wch: Math.min(45, Math.max(10, maxLen + 2)) };
      });
      ws["!cols"] = colWidths;

      const safeSheetName = s.sheetName.substring(0, 31) || "Sheet1";
      XLSX.utils.book_append_sheet(wb, ws, safeSheetName);
    });

    return wb;
  };

  // Action 1: Convert & Download .xlsx File directly
  const handleDownloadExcel = () => {
    try {
      const wb = generateExcelWorkbook();
      const safeName = datasetName.trim() || "Converted_JSON_Data";
      const finalFileName = safeName.endsWith(".xlsx") ? safeName : `${safeName}.xlsx`;

      XLSX.writeFile(wb, finalFileName);
      toast.success(`Downloaded Excel file: ${finalFileName}`);
    } catch (err: any) {
      toast.error(`Conversion error: ${err.message}`);
    }
  };

  // Action 2: Convert to Excel and Make Dataset in Workspace
  const handleConvertAndMakeDataset = () => {
    try {
      if (parsedSheets.length === 0) {
        toast.error("Please provide valid JSON data before converting.");
        return;
      }

      const wb = generateExcelWorkbook();
      const wbOut = XLSX.write(wb, { bookType: "xlsx", type: "array" });
      const byteSize = wbOut.byteLength || 2048;

      const safeName = datasetName.trim() || "Converted_JSON_Data";
      const finalFileName = safeName.endsWith(".xlsx") ? safeName : `${safeName}.xlsx`;
      const newDatasetId = crypto.randomUUID();

      const datasetSheets: SheetData[] = parsedSheets.map((s) => ({
        name: s.sheetName,
        headers: s.headers,
        rows: s.rows,
        rowCount: s.rowCount,
        columnCount: s.headers.length,
        columnTypes: detectColumnTypes(s.headers, s.rows),
      }));

      const newDataset: Dataset = {
        id: newDatasetId,
        name: finalFileName,
        size: byteSize,
        sheets: datasetSheets,
        createdAt: new Date().toISOString(),
      };

      addDataset(newDataset);
      selectDataset(newDataset.id);
      selectSheet(datasetSheets[0]?.name || null);

      setSuccessDialog({
        isOpen: true,
        datasetName: finalFileName,
        datasetId: newDatasetId,
        sheetsCount: datasetSheets.length,
        rowsCount: totalRowsCount,
      });

      toast.success(`Dataset "${finalFileName}" created and active in your workspace!`);
    } catch (err: any) {
      toast.error(`Failed to create dataset: ${err.message}`);
    }
  };

  // Pagination helpers
  const totalPages = Math.ceil(filteredPreviewRows.length / rowsPerPage) || 1;
  const paginatedRows = useMemo(() => {
    const start = (previewPage - 1) * rowsPerPage;
    return filteredPreviewRows.slice(start, start + rowsPerPage);
  }, [filteredPreviewRows, previewPage]);

  return (
    <div className="flex-1 flex flex-col min-h-0 w-full overflow-hidden space-y-4">
      {/* =========================================================================
          PAGE HEADER
         ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 uppercase tracking-wider font-mono">
              Data Converter
            </span>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-indigo-400" />
              100% In-Browser &bull; Zero Server Storage
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-foreground tracking-tight flex items-center gap-2">
            <FileJson className="w-6 h-6 text-emerald-500" />
            <span>JSON to Excel Converter</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Paste raw JSON, load API payloads, or upload a .json file to convert it into a multi-sheet Excel (.xlsx) workbook and make it an active dataset.
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex items-center gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".json,application/json"
            className="hidden"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            className="text-xs gap-1.5 border-border bg-card hover:bg-accent text-foreground shadow-sm"
          >
            <UploadCloud className="w-3.5 h-3.5 text-indigo-400" />
            <span>Upload JSON File</span>
          </Button>
          <Button
            size="sm"
            onClick={handleDownloadExcel}
            disabled={parsedSheets.length === 0}
            variant="outline"
            className="text-xs gap-1.5 border-border bg-card hover:bg-accent text-foreground shadow-sm"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />
            <span>Download .xlsx</span>
          </Button>
          <Button
            size="sm"
            onClick={handleConvertAndMakeDataset}
            disabled={parsedSheets.length === 0}
            className="text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold shadow-sm shadow-emerald-600/30"
          >
            <Database className="w-3.5 h-3.5" />
            <span>Convert & Make Dataset</span>
          </Button>
        </div>
      </div>

      {/* =========================================================================
          MAIN WORKSPACE GRID: Split Editor & Preview
         ========================================================================= */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-0 overflow-hidden">
        {/* -----------------------------------------------------------------------
            LEFT PANEL: JSON Editor & Configuration (5 cols on lg)
           ----------------------------------------------------------------------- */}
        <div className="lg:col-span-5 flex flex-col min-h-0 bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
          {/* Editor Header Bar */}
          <div className="p-3 border-b border-border bg-accent/30 flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2">
              <Code2 className="w-4 h-4 text-emerald-500" />
              <span className="text-xs font-bold text-foreground">JSON Input Editor</span>
              {parseError ? (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-500 border border-rose-500/20 font-medium flex items-center gap-1">
                  <AlertTriangle className="w-2.5 h-2.5" /> Syntax Error
                </span>
              ) : parsedSheets.length > 0 ? (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-medium flex items-center gap-1">
                  <CheckCircle2 className="w-2.5 h-2.5" /> Valid JSON ({totalRowsCount} rows)
                </span>
              ) : null}
            </div>

            {/* Editor Action Tools */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handlePrettify}
                title="Format / Prettify JSON"
                className="px-2 py-1 rounded text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              >
                Prettify
              </button>
              <button
                type="button"
                onClick={handleMinify}
                title="Minify JSON"
                className="px-2 py-1 rounded text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              >
                Minify
              </button>
              <button
                type="button"
                onClick={handleCopy}
                title="Copy JSON"
                className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
              <button
                type="button"
                onClick={handleClear}
                title="Clear Editor"
                className="p-1 rounded text-muted-foreground hover:text-rose-500 hover:bg-accent transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Sample Presets Quick Bar */}
          <div className="px-3 py-2 border-b border-border bg-background/50 flex items-center gap-1.5 overflow-x-auto text-xs shrink-0">
            <span className="text-[11px] text-muted-foreground whitespace-nowrap font-medium flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-500" /> Samples:
            </span>
            {Object.entries(SAMPLE_PRESETS).map(([key, preset]) => (
              <button
                key={key}
                type="button"
                onClick={() => handleLoadPreset(key)}
                className="px-2 py-0.5 rounded-md bg-accent/60 hover:bg-accent border border-border text-[11px] text-foreground/80 hover:text-foreground whitespace-nowrap transition-all"
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* Editor Textarea */}
          <div className="flex-1 min-h-0 relative bg-background">
            <textarea
              value={jsonText}
              onChange={(e) => {
                setJsonText(e.target.value);
                setPreviewPage(1);
              }}
              placeholder={`Paste your JSON payload here...\n\nExample:\n[\n  { "id": 1, "name": "Alice", "role": "Engineer", "salary": 95000 },\n  { "id": 2, "name": "Bob", "role": "Product", "salary": 85000 }\n]`}
              className="w-full h-full p-3 font-mono text-xs bg-transparent text-foreground placeholder:text-muted-foreground/40 resize-none focus:outline-none leading-relaxed overflow-y-auto selection:bg-indigo-500/20"
              spellCheck={false}
            />
          </div>

          {/* Syntax Error Warning (if any) */}
          {parseError && (
            <div className="p-3 bg-rose-500/10 border-t border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-start gap-2 shrink-0">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold">JSON Parse Warning: </span>
                <span className="font-mono text-[11px]">{parseError}</span>
              </div>
            </div>
          )}

          {/* Conversion Configuration Settings Footer */}
          <div className="p-3.5 border-t border-border bg-accent/20 space-y-3 shrink-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
                  Dataset / File Name:
                </label>
                <input
                  type="text"
                  value={datasetName}
                  onChange={(e) => setDatasetName(e.target.value)}
                  placeholder="e.g. Sales_Q1_Data"
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
                  Default Sheet Name:
                </label>
                <input
                  type="text"
                  value={sheetName}
                  onChange={(e) => setSheetName(e.target.value)}
                  placeholder="e.g. Sheet1"
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* Options Checkboxes */}
            <div className="flex flex-wrap items-center gap-4 pt-1 text-xs">
              <label className="flex items-center gap-2 cursor-pointer text-foreground/90 select-none">
                <input
                  type="checkbox"
                  checked={flattenNested}
                  onChange={(e) => setFlattenNested(e.target.checked)}
                  className="rounded border-border text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5 cursor-pointer"
                />
                <span className="text-[11px]">
                  Flatten nested objects (<code className="text-[10px] text-indigo-400">user.name</code>)
                </span>
              </label>

              <span className="text-muted-foreground text-[10px] ml-auto">
                {jsonText.length.toLocaleString()} characters &bull; {formatBytes(jsonText.length)}
              </span>
            </div>

            {/* Big Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              <Button
                onClick={handleConvertAndMakeDataset}
                disabled={parsedSheets.length === 0}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs gap-2 shadow-sm shadow-emerald-600/30"
              >
                <Database className="w-4 h-4" />
                <span>Make it a DataSet</span>
              </Button>
              <Button
                variant="outline"
                onClick={handleDownloadExcel}
                disabled={parsedSheets.length === 0}
                className="w-full border-border bg-card hover:bg-accent text-foreground text-xs gap-2 font-medium"
              >
                <Download className="w-4 h-4 text-emerald-500" />
                <span>Convert to Excel (.xlsx)</span>
              </Button>
            </div>
          </div>
        </div>

        {/* -----------------------------------------------------------------------
            RIGHT PANEL: Live Tabular & Schema Preview (7 cols on lg)
           ----------------------------------------------------------------------- */}
        <div className="lg:col-span-7 flex flex-col min-h-0 bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
          {/* Preview Header & Metrics */}
          <div className="p-3.5 border-b border-border bg-accent/30 flex flex-wrap items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <Table className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-foreground flex items-center gap-2">
                  <span>Excel Sheet Preview</span>
                  {parsedSheets.length > 1 && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-indigo-500/15 text-indigo-400 border border-indigo-500/20">
                      {parsedSheets.length} Sheets
                    </span>
                  )}
                </h3>
                <p className="text-[11px] text-muted-foreground">
                  Live tabular preview of columns and rows generated from the parsed JSON.
                </p>
              </div>
            </div>

            {/* Quick KPI stats */}
            {parsedSheets.length > 0 && (
              <div className="flex items-center gap-2 text-xs">
                <div className="px-2.5 py-1 rounded-lg bg-card border border-border text-[11px]">
                  <span className="text-muted-foreground">Rows: </span>
                  <span className="font-bold text-foreground">{totalRowsCount.toLocaleString()}</span>
                </div>
                <div className="px-2.5 py-1 rounded-lg bg-card border border-border text-[11px]">
                  <span className="text-muted-foreground">Columns: </span>
                  <span className="font-bold text-foreground">
                    {currentSheet?.headers.length || totalColsCount}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Multi-Sheet Selector Tabs (if JSON generated >1 sheet) */}
          {parsedSheets.length > 1 && (
            <div className="px-3 pt-2 border-b border-border bg-accent/10 flex items-center gap-1 overflow-x-auto shrink-0">
              {parsedSheets.map((s) => {
                const isActive = (currentSheet?.sheetName || parsedSheets[0].sheetName) === s.sheetName;
                return (
                  <button
                    key={s.sheetName}
                    type="button"
                    onClick={() => {
                      setActivePreviewTab(s.sheetName);
                      setPreviewPage(1);
                    }}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-t-lg border-t border-x transition-all flex items-center gap-2 ${
                      isActive
                        ? "bg-card border-border text-emerald-600 dark:text-emerald-400 border-b-2 border-b-emerald-500 shadow-sm"
                        : "border-transparent text-muted-foreground hover:text-foreground hover:bg-accent/50"
                    }`}
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>{s.sheetName}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-accent text-muted-foreground">
                      {s.rowCount}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Search & Column Types Pill Bar */}
          {currentSheet && (
            <div className="p-2.5 border-b border-border bg-background/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shrink-0">
              {/* Search Filter */}
              <div className="relative flex-1 max-w-xs">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={searchPreview}
                  onChange={(e) => {
                    setSearchPreview(e.target.value);
                    setPreviewPage(1);
                  }}
                  placeholder="Filter rows in preview..."
                  className="w-full pl-8 pr-2.5 py-1 text-xs rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              {/* Column Schema Badge Count */}
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground overflow-x-auto">
                <span className="font-semibold text-foreground/80">Inferred Types:</span>
                {Object.entries(
                  Object.values(currentColumnTypes).reduce((acc, t) => {
                    acc[t] = (acc[t] || 0) + 1;
                    return acc;
                  }, {} as Record<string, number>)
                ).map(([type, count]) => (
                  <span
                    key={type}
                    className="px-1.5 py-0.5 rounded bg-accent text-[10px] font-mono capitalize border border-border/60"
                  >
                    {type}: {count}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Table Container */}
          <div className="flex-1 min-h-0 overflow-auto bg-background">
            {parsedSheets.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center p-8 text-center text-muted-foreground space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-accent flex items-center justify-center text-muted-foreground">
                  <FileJson className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-foreground">No JSON Loaded Yet</h4>
                  <p className="text-xs max-w-sm mx-auto mt-1">
                    Paste raw JSON on the left panel or click any sample preset above to see the live converted Excel table preview.
                  </p>
                </div>
                <div className="flex items-center gap-2 pt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleLoadPreset("ecommerce")}
                    className="text-xs border-border gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    Load E-Commerce Sample
                  </Button>
                </div>
              </div>
            ) : currentSheet && currentSheet.rows.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
                <p className="text-xs">No matching records found for "{searchPreview}".</p>
              </div>
            ) : currentSheet ? (
              <div className="min-w-full inline-block align-middle">
                <table className="min-w-full text-left text-xs border-collapse">
                  <thead className="bg-accent/40 sticky top-0 z-10 border-b border-border backdrop-blur-sm">
                    <tr>
                      <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground w-12 border-r border-border text-center">
                        #
                      </th>
                      {currentSheet.headers.map((header) => {
                        const type = currentColumnTypes[header] || "string";
                        return (
                          <th
                            key={header}
                            className="px-3 py-2 text-[11px] font-semibold text-foreground border-r border-border last:border-r-0 whitespace-nowrap"
                          >
                            <div className="flex items-center gap-1.5">
                              <span className="truncate">{header}</span>
                              <span
                                className={`text-[9px] px-1 py-0.2 rounded font-mono font-normal ${
                                  type === "number"
                                    ? "bg-blue-500/15 text-blue-500"
                                    : type === "date"
                                    ? "bg-emerald-500/15 text-emerald-500"
                                    : type === "boolean"
                                    ? "bg-purple-500/15 text-purple-500"
                                    : "bg-accent text-muted-foreground"
                                }`}
                              >
                                {type}
                              </span>
                            </div>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {paginatedRows.map((row, rowIdx) => {
                      const absoluteIndex = (previewPage - 1) * rowsPerPage + rowIdx + 1;
                      return (
                        <tr
                          key={rowIdx}
                          className="hover:bg-accent/30 transition-colors group"
                        >
                          <td className="px-3 py-2 text-[10px] font-mono text-muted-foreground text-center border-r border-border bg-accent/10">
                            {absoluteIndex}
                          </td>
                          {currentSheet.headers.map((header) => {
                            const val = row[header];
                            const isNull = val === null || val === undefined || val === "";
                            const type = currentColumnTypes[header];

                            return (
                              <td
                                key={header}
                                className={`px-3 py-2 border-r border-border last:border-r-0 text-foreground whitespace-nowrap max-w-[240px] truncate font-sans ${
                                  type === "number" ? "font-mono" : ""
                                }`}
                              >
                                {isNull ? (
                                  <span className="text-[10px] text-muted-foreground/40 italic">null</span>
                                ) : typeof val === "boolean" ? (
                                  <span
                                    className={`text-[10px] px-1.5 py-0.2 rounded font-mono font-semibold ${
                                      val ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"
                                    }`}
                                  >
                                    {val ? "TRUE" : "FALSE"}
                                  </span>
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
            ) : null}
          </div>

          {/* Table Pagination Footer */}
          {currentSheet && filteredPreviewRows.length > 0 && (
            <div className="p-2.5 border-t border-border bg-accent/20 flex items-center justify-between gap-2 shrink-0 text-xs">
              <span className="text-[11px] text-muted-foreground">
                Showing{" "}
                <span className="font-semibold text-foreground">
                  {(previewPage - 1) * rowsPerPage + 1}-
                  {Math.min(previewPage * rowsPerPage, filteredPreviewRows.length)}
                </span>{" "}
                of <span className="font-semibold text-foreground">{filteredPreviewRows.length}</span> rows
              </span>

              <div className="flex items-center gap-1.5">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setPreviewPage((p) => Math.max(1, p - 1))}
                  disabled={previewPage <= 1}
                  className="h-7 px-2 text-xs border-border"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </Button>
                <span className="text-[11px] text-muted-foreground px-1">
                  Page {previewPage} of {totalPages}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setPreviewPage((p) => Math.min(totalPages, p + 1))}
                  disabled={previewPage >= totalPages}
                  className="h-7 px-2 text-xs border-border"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* =========================================================================
          SUCCESS DIALOG: Dataset Created Confirmation & Navigation
         ========================================================================= */}
      <Dialog
        isOpen={successDialog.isOpen}
        onClose={() => setSuccessDialog((prev) => ({ ...prev, isOpen: false }))}
        title="Dataset Created Successfully!"
      >
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-start gap-3">
            <CheckCircle2 className="w-6 h-6 text-emerald-500 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-bold text-foreground">
                "{successDialog.datasetName}" is now active in Report-IQ!
              </h4>
              <p className="text-xs text-muted-foreground mt-1">
                Converted from JSON into {successDialog.sheetsCount} worksheet(s) containing{" "}
                <strong className="text-foreground">{successDialog.rowsCount.toLocaleString()}</strong> rows.
                You can now analyze, clean, query, or visualize it across all tools.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <Button
              onClick={() => {
                setSuccessDialog((prev) => ({ ...prev, isOpen: false }));
                setActiveTab("datasets");
              }}
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs gap-1.5"
            >
              <Database className="w-3.5 h-3.5" />
              <span>View in Datasets</span>
            </Button>
            <Button
              onClick={() => {
                setSuccessDialog((prev) => ({ ...prev, isOpen: false }));
                setActiveTab("dashboard");
              }}
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs gap-1.5"
            >
              <ArrowRight className="w-3.5 h-3.5" />
              <span>Open Dashboard</span>
            </Button>
            <Button
              variant="outline"
              onClick={handleDownloadExcel}
              className="border-border text-xs gap-1.5"
            >
              <Download className="w-3.5 h-3.5 text-emerald-500" />
              <span>Download .xlsx</span>
            </Button>
          </div>

          <div className="flex justify-end pt-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSuccessDialog((prev) => ({ ...prev, isOpen: false }))}
              className="text-xs border-border text-muted-foreground"
            >
              Keep Editing JSON
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}

