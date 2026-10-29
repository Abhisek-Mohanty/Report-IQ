import React, { useState, useMemo, useEffect } from "react";
import { useAnalyticsStore } from "@/store/useAnalyticsStore";
import { analyzeDataset, exampleRows } from "@/utils/dataOperations";
import { toast } from "@/components/ui/toast";
import api from "@/lib/axios";
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
  Columns,
  Plus,
  Search,
  CheckSquare,
  Square,
  ExternalLink,
  Lock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import * as XLSX from "xlsx";
import { AiScenario } from "@/types";
import { CustomRelationshipModal } from "./CustomRelationshipModal";
import { DetailedInsightsModal } from "./DetailedInsightsModal";
import { prepareDetailedAnalysisPayload } from "@/utils/scenarioAnalyzer";
import { AnalysisDashboardView } from "./AnalysisDashboardView";
import { AnalysisDashboardData } from "@/types/dashboard";
import { SAMPLE_ANALYSIS_DASHBOARD } from "@/utils/sampleReportData";
import { EXAMPLE_LOAN_PORTFOLIO_PAYLOAD } from "@/utils/jsonPointerResolver";

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

  // Detailed statistics for each column (for High Quality Profile view & payload preparation)
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

  // View state for High Quality mode: "relationships" vs "pivot" vs "profile" vs "dashboard"
  const [activeTabMode, setActiveTabMode] = useState<"profile" | "pivot" | "relationships" | "dashboard">("relationships");

  // Sheet-specific report store: key is `${activeDataset?.id || 'none'}:${activeSheet?.name || 'none'}`
  const currentSheetKey = useMemo(() => {
    return `${activeDataset?.id || "none"}:${activeSheet?.name || "none"}`;
  }, [activeDataset, activeSheet]);

  const [reportsBySheet, setReportsBySheet] = useState<
    Record<
      string,
      {
        report: AnalysisDashboardData;
        payload: any;
        createdAt: number;
      }
    >
  >({});
  const [dashboardLoading, setDashboardLoading] = useState<boolean>(false);
  const [dashboardError, setDashboardError] = useState<string | null>(null);

  const currentReportEntry = reportsBySheet[currentSheetKey] || null;

  const handleLoadSampleDashboard = () => {
    setReportsBySheet((prev) => ({
      ...prev,
      [currentSheetKey]: {
        report: SAMPLE_ANALYSIS_DASHBOARD,
        payload: EXAMPLE_LOAN_PORTFOLIO_PAYLOAD,
        createdAt: Date.now(),
      },
    }));
    setDashboardError(null);
    setActiveTabMode("dashboard");
    toast.success("Loaded Loan Portfolio Executive BI Dashboard!");
  };

  // Pivot Table configuration state
  const [rowField, setRowField] = useState<string>("");
  const [colField, setColField] = useState<string>("none");
  const [valField, setValField] = useState<string>("");
  const [aggFunc, setAggFunc] = useState<AggFunction>("sum");

  // AI Scenarios & Relationships state
  const [scenarios, setScenarios] = useState<AiScenario[]>([]);

  // Keep active tab on "relationships" while dependent tabs remain locked
  useEffect(() => {
    if (scenarios.length === 0 && activeTabMode !== "relationships") {
      setActiveTabMode("relationships");
    }
  }, [scenarios.length, activeTabMode]);
  const [datasetSummary, setDatasetSummary] = useState<string>("");
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [selectedScenarioIds, setSelectedScenarioIds] = useState<Set<string>>(new Set());

  // Filters for Scenarios View
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [columnFilter, setColumnFilter] = useState<string | null>(null);
  const [searchScenarioQuery, setSearchScenarioQuery] = useState<string>("");

  // Modals state
  const [isCustomModalOpen, setIsCustomModalOpen] = useState<boolean>(false);
  const [isDetailedModalOpen, setIsDetailedModalOpen] = useState<boolean>(false);
  const [scenarioForDetailModal, setScenarioForDetailModal] = useState<AiScenario[]>([]);

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

  // Toggle scenario selection
  const handleToggleScenarioSelect = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedScenarioIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Select all or clear selection
  const handleSelectAllScenarios = (ids: string[]) => {
    if (selectedScenarioIds.size === ids.length && ids.length > 0) {
      setSelectedScenarioIds(new Set());
    } else {
      setSelectedScenarioIds(new Set(ids));
    }
  };

  // Launch single scenario detailed inspection
  const handleInspectSingleScenario = (scenario: AiScenario) => {
    getDetailedAIAnalysis([scenario]);
  };

  // Launch multiple selected scenarios detailed inspection
  const handleInspectSelectedScenarios = () => {
    const selected = scenarios.filter((s) => selectedScenarioIds.has(s.id));
    if (selected.length === 0) {
      toast.error("Please select at least one relationship scenario.");
      return;
    }
    getDetailedAIAnalysis(selected);
  };

  async function getDetailedAIAnalysis(selectedScenariosList?: AiScenario[]) {
    if (!activeSheet) {
      toast.error("No active sheet selected.");
      return;
    }

    const targetScenarios =
      selectedScenariosList && selectedScenariosList.length > 0
        ? selectedScenariosList
        : scenarios.filter((s) => selectedScenarioIds.has(s.id));

    if (targetScenarios.length === 0) {
      toast.error("Please select at least one relationship scenario.");
      return;
    }

    try {
      setIsAnalyzing(true);
      setDashboardLoading(true);
      setDashboardError(null);
      setActiveTabMode("dashboard");

      const datasetName = activeDataset?.id
        ? activeDataset?.id
        : "New-Dataset";

      const analysisPayload = prepareDetailedAnalysisPayload(
        datasetName,
        activeSheet,
        targetScenarios
      );

      const payload = {
        ...analysisPayload,
        summary: columnProfiles,
      };

      console.log("Detailed AI Analysis Payload:", payload);

      const response = await api.post("/aiInsights/detailedAnalysis", payload);
      const resData = response.data?.data || response.data;
      console.log("Detailed AI Analysis Response:", resData);

      setReportsBySheet((prev) => ({
        ...prev,
        [currentSheetKey]: {
          report: resData,
          payload,
          createdAt: Date.now(),
        },
      }));

      toast.success(`Detailed AI insights prepared for ${targetScenarios.length} scenarios!`);
      return resData;
    } catch (error: any) {
      console.error("Error fetching AI insights:", error);
      const msg =
        error?.response?.data?.detail ||
        error?.response?.data?.message ||
        "Could not reach AI backend. You can preview the sample executive dashboard.";
      setDashboardError(msg);
      toast.error(msg);
    } finally {
      setIsAnalyzing(false);
      setDashboardLoading(false);
    }
  }

  // Transfer scenario dimensions into the Pivot Table Studio
  const handleOpenInPivot = (scenario: AiScenario) => {
    const col1 = scenario.columns[0] || activeSheet?.headers[0] || "";
    const col2 = scenario.columns[1] || "";
    if (col1) setRowField(col1);
    if (col2) {
      setValField(col2);
      setColField("none");
      setAggFunc(activeSheet?.columnTypes[col2] === "number" ? "sum" : "count");
    } else {
      setColField("none");
    }
    setActiveTabMode("pivot");
    toast.success(`Configured Pivot Matrix for "${scenario.title}"`);
  };

  // Add custom user-defined scenario
  const handleAddCustomScenario = (newScenario: AiScenario) => {
    setScenarios((prev) => [newScenario, ...prev]);
    setSelectedScenarioIds((prev) => new Set([...prev, newScenario.id]));
    setActiveTabMode("relationships");
  };

  // Load sample scenarios (convenience for demo / offline testing)
  const loadSampleScenarios = () => {
    const sampleSummary = "The dataset contains 549 rows and 32 columns detailing loan applications, including financial amounts, status, branch information, processing dates, and co-lender details.";
    const sampleScenarios: AiScenario[] = [
      {
        id: "s1",
        title: "Service Amount by Loan Type",
        category: "category",
        columns: ["LoanType", "Service Amount"],
        analysisType: "group_comparison",
        method: "groupby-aggregate",
        suggestedChart: "bar",
        businessQuestion: "How do service amounts vary across different loan types?",
        whyItMatters: "Helps identify which loan products drive the highest capital volume.",
        confidence: "high",
        confidenceReason: "Both LoanType and Service Amount columns are present with valid data types."
      },
      {
        id: "s2",
        title: "Loan Status Distribution",
        category: "category",
        columns: ["Status"],
        analysisType: "distribution",
        method: "groupby-aggregate",
        suggestedChart: "pie",
        businessQuestion: "What is the breakdown of loan applications by their current status?",
        whyItMatters: "Provides visibility into the overall approval, rejection, and cancellation rates.",
        confidence: "high",
        confidenceReason: "Status column is fully populated with distinct categorical values across rows."
      },
      {
        id: "s3",
        title: "Interest Rate by Co-Lender",
        category: "category",
        columns: ["Co-Lender Name", "IRR"],
        analysisType: "group_comparison",
        method: "groupby-aggregate",
        suggestedChart: "bar",
        businessQuestion: "How do interest rates (IRR) differ among various co-lenders?",
        whyItMatters: "Enables comparison of pricing and yields across different lending partners.",
        confidence: "high",
        confidenceReason: "Co-Lender Name and numeric IRR columns are both available."
      },
      {
        id: "s4",
        title: "Service Amount Outliers",
        category: "anomaly",
        columns: ["Service Amount"],
        analysisType: "outlier_detection",
        method: "IQR",
        suggestedChart: "box",
        businessQuestion: "Are there any unusually high or low service amounts in the applications?",
        whyItMatters: "Identifies extreme loan requests that may require special risk review.",
        confidence: "high",
        confidenceReason: "Service Amount is a continuous numeric measure with sufficient data points."
      },
      {
        id: "s5",
        title: "Applications Over Time",
        category: "trend",
        columns: ["Submit Date"],
        analysisType: "time_series",
        method: "time-aggregation",
        suggestedChart: "line",
        businessQuestion: "How do loan application volumes trend over submission dates?",
        whyItMatters: "Reveals peak application periods and submission activity patterns over time.",
        confidence: "medium",
        confidenceReason: "Submit Date is stored as string formatting and requires parsing into datetime."
      },
      {
        id: "s6",
        title: "Duplicate Application Check",
        category: "anomaly",
        columns: ["Application Number"],
        analysisType: "duplicate_check",
        method: "duplicate-check",
        suggestedChart: "bar",
        businessQuestion: "Are there any duplicate application numbers in the dataset?",
        whyItMatters: "Ensures data integrity and prevents double-counting of applications.",
        confidence: "high",
        confidenceReason: "Application Number serves as a unique identifier column."
      },
      {
        id: "s7",
        title: "Service Amount by Branch",
        category: "category",
        columns: ["Branch", "Service Amount"],
        analysisType: "group_comparison",
        method: "groupby-aggregate",
        suggestedChart: "bar",
        businessQuestion: "Which branches process the highest total service amounts?",
        whyItMatters: "Highlights top-performing branch locations by business volume.",
        confidence: "high",
        confidenceReason: "Branch category and Service Amount numeric measure are both present."
      }
    ];

    setDatasetSummary(sampleSummary);
    setScenarios(sampleScenarios);
    setSelectedScenarioIds(new Set(["s1", "s2"]));
    setActiveTabMode("relationships");
    toast.success("Loaded 7 loan application relationship scenarios!");
  };

  // Fetch AI Scenarios from API
  async function fetchPosts() {
    if (!activeSheet || !activeDataset) {
      toast.error("No active sheet selected.");
      return;
    }

    try {
      setIsAnalyzing(true);
      const payload = {
        ...activeSheet,
        id:activeDataset.id,
        rows: exampleRows(activeSheet && activeSheet.rows ? activeSheet.rows : [])
      };
      const response = await api.post("/aiInsights/trendAnalysis", payload);
      const resData = response.data?.data || response.data;

      const summary = resData?.datasetSummary || "Dataset column relationship analysis generated successfully.";
      const incomingScenarios: AiScenario[] = Array.isArray(resData?.scenarios) ? resData.scenarios : [];

      setDatasetSummary(summary);
      setScenarios(incomingScenarios);

      if (incomingScenarios.length > 0) {
        setSelectedScenarioIds(new Set([incomingScenarios[0].id]));
      }

      setActiveTabMode("relationships");
      toast.success(`AI Pattern Engine discovered ${incomingScenarios.length} relationships!`);
    } catch (error: any) {
      console.error('Error fetching AI insights:', error);
      console.log(error);
      
      toast.error(error?.message || "Could not reach AI backend. Loading sample scenarios...");
    } finally {
      setIsAnalyzing(false);
    }
  }

  // Unique columns participating in any scenario
  const connectedColumns = useMemo(() => {
    const colCounts: Record<string, number> = {};
    scenarios.forEach((sc) => {
      sc.columns.forEach((col) => {
        colCounts[col] = (colCounts[col] || 0) + 1;
      });
    });
    return Object.entries(colCounts).sort((a, b) => b[1] - a[1]);
  }, [scenarios]);

  // Filtered scenarios for showcase
  const filteredScenarios = useMemo(() => {
    return scenarios.filter((sc) => {
      if (categoryFilter !== "all") {
        if (categoryFilter === "custom" && !sc.isCustom) return false;
        if (categoryFilter !== "custom" && sc.category !== categoryFilter) return false;
      }
      if (columnFilter && !sc.columns.includes(columnFilter)) {
        return false;
      }
      if (searchScenarioQuery.trim()) {
        const q = searchScenarioQuery.toLowerCase();
        const matchesTitle = sc.title.toLowerCase().includes(q);
        const matchesQuestion = sc.businessQuestion.toLowerCase().includes(q);
        const matchesCol = sc.columns.some((c) => c.toLowerCase().includes(q));
        if (!matchesTitle && !matchesQuestion && !matchesCol) return false;
      }
      return true;
    });
  }, [scenarios, categoryFilter, columnFilter, searchScenarioQuery]);


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
              {/* <div className="shrink-0 flex items-center gap-3">
                <Button
                  size="lg"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-lg shadow-emerald-600/20 gap-2 text-sm px-6 h-12"
                  onClick={fetchPosts}
                  disabled={isAnalyzing}
                >
                  {isAnalyzing ? (
                    <RefreshCw className="h-5 w-5 animate-spin" />
                  ) : (
                    <Sparkles className="h-5 w-5 text-amber-300" />
                  )}
                  <span>{isAnalyzing ? "Analyzing Relationships..." : "Summarize with Pivot Tables & AI"}</span>
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </div> */}

            </div>

            {/* Sub-tab navigation */}
            <div className="flex items-center gap-2 mt-6 pt-4 border-t border-emerald-500/20 overflow-x-auto">
              <button
                onClick={() => setActiveTabMode("relationships")}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${activeTabMode === "relationships"
                  ? "bg-violet-600 text-white shadow-sm shadow-violet-600/20"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  }`}
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>AI Column Relationships</span>
                {scenarios.length > 0 && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${activeTabMode === "relationships" ? "bg-white/20 text-white" : "bg-violet-500/20 text-violet-500"
                    }`}>
                    {scenarios.length}
                  </span>
                )}
              </button>
              <button
                disabled={scenarios.length === 0}
                onClick={() => scenarios.length > 0 && setActiveTabMode("dashboard")}
                title={scenarios.length === 0 ? "Discover AI Column Relationships to unlock Executive Dashboard" : undefined}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                  scenarios.length === 0
                    ? "opacity-45 cursor-not-allowed text-muted-foreground hover:bg-transparent select-none"
                    : activeTabMode === "dashboard"
                    ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/20"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                }`}
              >
                <BarChart3 className={`h-3.5 w-3.5 ${scenarios.length === 0 ? "text-muted-foreground" : "text-indigo-400"}`} />
                <span>Executive Dashboard</span>
                {scenarios.length === 0 ? (
                  <Lock className="h-3 w-3 text-muted-foreground/60" />
                ) : currentReportEntry ? (
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                ) : null}
              </button>
              <button
                disabled={scenarios.length === 0}
                onClick={() => scenarios.length > 0 && setActiveTabMode("pivot")}
                title={scenarios.length === 0 ? "Discover AI Column Relationships to unlock Pivot Table Matrix" : undefined}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                  scenarios.length === 0
                    ? "opacity-45 cursor-not-allowed text-muted-foreground hover:bg-transparent select-none"
                    : activeTabMode === "pivot"
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                }`}
              >
                <Grid3X3 className="h-3.5 w-3.5" />
                <span>Pivot Table Summary Matrix</span>
                {scenarios.length === 0 && <Lock className="h-3 w-3 text-muted-foreground/60" />}
              </button>
              <button
                disabled={scenarios.length === 0}
                onClick={() => scenarios.length > 0 && setActiveTabMode("profile")}
                title={scenarios.length === 0 ? "Discover AI Column Relationships to unlock Data Health Profiler" : undefined}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                  scenarios.length === 0
                    ? "opacity-45 cursor-not-allowed text-muted-foreground hover:bg-transparent select-none"
                    : activeTabMode === "profile"
                    ? "bg-primary text-white shadow-sm"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                }`}
              >
                <Activity className="h-3.5 w-3.5" />
                <span>Data Health & Column Profiler</span>
                {scenarios.length === 0 && <Lock className="h-3 w-3 text-muted-foreground/60" />}
              </button>

              <div className="ml-auto flex items-center gap-2">
                {/* <button
                  onClick={handleLoadSampleDashboard}
                  className="text-xs px-2.5 py-1 rounded-md border border-slate-700 bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-700 flex items-center gap-1.5 transition-colors shrink-0"
                  title="Load the sample Loan Portfolio Executive BI Dashboard"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Sample Dashboard</span>
                </button> */}
              </div>
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
                                className={`px-2 py-0.5 rounded-full text-[10px] font-mono uppercase border ${col.type === "number"
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
                                  <span>Unique: <strong className="text-foreground">{col.stats.uniqueCount?.toLocaleString() ?? "N/A"}</strong></span>
                                  <span>
                                    Mode: <strong className="text-foreground">"{col.stats.topVal ? col.stats.topVal.substring(0, 15) : "None"}"</strong> ({col.stats.topValPercent ?? 0}%)
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

          {/* VIEW MODE 3: AI COLUMN RELATIONSHIPS & SCENARIOS SHOWCASE */}
          {activeTabMode === "relationships" && (
            <div className="flex flex-col gap-6">

              {/* No scenarios loaded yet state */}
              {scenarios.length === 0 ? (
                <div className="bg-card border border-border rounded-2xl p-10 text-center space-y-5 shadow-sm max-w-2xl mx-auto my-6">
                  <div className="h-16 w-16 rounded-2xl bg-violet-500/20 text-violet-500 border border-violet-500/30 flex items-center justify-center mx-auto shadow-sm">
                    <Sparkles className="h-8 w-8 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="font-display font-extrabold text-xl text-foreground">
                      AI Column Relationships & Pattern Discovery
                    </h3>
                    <p className="text-xs text-muted-foreground mt-2 max-w-md mx-auto leading-relaxed">
                      Scan your spreadsheet with ReportIQ's Pattern Engine to uncover statistical relationships, cross-column correlations, segment volumes, chronological trends, and anomaly bounds.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                    <Button
                      size="lg"
                      onClick={fetchPosts}
                      disabled={isAnalyzing}
                      className="bg-violet-600 hover:bg-violet-700 text-white font-bold gap-2 shadow-lg shadow-violet-600/20 text-xs px-6 h-11"
                    >
                      {isAnalyzing ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <Sparkles className="h-4 w-4 text-amber-300" />
                      )}
                      <span>{isAnalyzing ? "Scanning Relationships..." : "Discover Relationships with AI"}</span>
                    </Button>

                    {/* <Button
                      variant="outline"
                      size="lg"
                      onClick={loadSampleScenarios}
                      className="gap-2 text-xs font-semibold h-11 text-foreground"
                    >
                      <Database className="h-4 w-4 text-emerald-500" />
                      <span>Load Sample Lending Scenarios</span>
                    </Button> */}

                    <Button
                      variant="outline"
                      size="lg"
                      onClick={() => setIsCustomModalOpen(true)}
                      className="gap-2 text-xs font-semibold h-11 text-foreground"
                    >
                      {/* <Plus className="h-4 w-4 text-primary" /> */}
                      <Database className="h-4 w-4 text-emerald-500" />
                      <span>+ Custom Relationship</span>
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Dataset Summary Banner */}
                  <div className="rounded-2xl border border-violet-500/30 bg-gradient-to-br from-violet-500/10 via-violet-500/5 to-transparent p-6 shadow-md relative overflow-hidden">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                      <div className="flex items-start gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-violet-500/20 border border-violet-500/30 text-violet-500 flex items-center justify-center shrink-0 shadow-sm">
                          <Sparkles className="h-6 w-6" />
                        </div>
                        <div>
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-violet-500/20 border border-violet-500/30 text-[10px] font-bold text-violet-500 uppercase tracking-wider mb-1.5">
                            <CheckCircle2 className="h-3 w-3" />
                            <span>ReportIQ Pattern Engine • Multi-Column Discovery</span>
                          </div>
                          <h3 className="font-display font-bold text-lg text-foreground">
                            {datasetSummary || `Identified ${scenarios.length} high-value relationships across ${activeSheet.headers.length} attributes.`}
                          </h3>
                          <p className="text-xs text-muted-foreground mt-1 max-w-2xl leading-relaxed">
                            Select one or multiple relationship scenarios below to compute empirical statistics, generate visual charts, and produce tailored AI insights. You can also construct custom cross-column relationships.
                          </p>
                        </div>
                      </div>

                      {/* Summary Metrics & Actions */}
                      <div className="shrink-0 flex items-center gap-3">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={fetchPosts}
                          disabled={isAnalyzing}
                          className="gap-1.5 text-xs text-foreground"
                        >
                          <RefreshCw className={`h-3.5 w-3.5 ${isAnalyzing ? "animate-spin" : ""}`} />
                          <span>Re-Scan Dataset</span>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setIsCustomModalOpen(true)}
                          className="gap-1.5 text-xs text-primary border-primary/30 hover:bg-primary/10"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          <span>+ Custom Relation</span>
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Connected Columns Interactive Filter Bar */}
                  {connectedColumns.length > 0 && (
                    <div className="bg-card border border-border rounded-xl p-4 shadow-sm space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                          <Layers className="h-3.5 w-3.5 text-primary" />
                          <span>Filter by Connected Column:</span>
                        </span>
                        {columnFilter && (
                          <button
                            onClick={() => setColumnFilter(null)}
                            className="text-[11px] text-primary hover:underline font-semibold"
                          >
                            Clear Column Filter
                          </button>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          onClick={() => setColumnFilter(null)}
                          className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${columnFilter === null
                            ? "bg-primary text-white shadow-sm"
                            : "bg-accent/60 text-foreground hover:bg-accent"
                            }`}
                        >
                          All Columns ({scenarios.length})
                        </button>
                        {connectedColumns.map(([colName, count]) => {
                          const isActive = columnFilter === colName;
                          return (
                            <button
                              key={colName}
                              onClick={() => setColumnFilter(isActive ? null : colName)}
                              className={`px-3 py-1 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 ${isActive
                                ? "bg-violet-600 text-white shadow-sm"
                                : "bg-accent/60 text-foreground hover:bg-accent"
                                }`}
                            >
                              <span>{colName}</span>
                              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${isActive ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
                                }`}>
                                {count}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Controls & Filter Bar */}
                  <div className="bg-card border border-border rounded-xl p-4 shadow-sm space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      {/* Category Filter Pills */}
                      <div className="flex flex-wrap items-center gap-1.5">
                        {[
                          { id: "all", label: "All Relationships", count: scenarios.length },
                          { id: "category", label: "Category Comparisons", count: scenarios.filter((s) => s.category === "category").length },
                          { id: "trend", label: "Trends & Timeseries", count: scenarios.filter((s) => s.category === "trend").length },
                          { id: "anomaly", label: "Anomalies & Outliers", count: scenarios.filter((s) => s.category === "anomaly").length },
                          { id: "relationship", label: "Correlations", count: scenarios.filter((s) => s.category === "relationship").length },
                          { id: "custom", label: "Custom Relations", count: scenarios.filter((s) => s.isCustom).length },
                        ].map((cat) => {
                          const isActive = categoryFilter === cat.id;
                          return (
                            <button
                              key={cat.id}
                              onClick={() => setCategoryFilter(cat.id)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${isActive
                                ? "bg-primary text-white shadow-sm"
                                : "text-muted-foreground hover:bg-accent hover:text-foreground"
                                }`}
                            >
                              <span>{cat.label}</span>
                              <span className="opacity-70 font-mono text-[10px]">({cat.count})</span>
                            </button>
                          );
                        })}
                      </div>

                      {/* Text Search Input */}
                      <div className="relative w-full sm:w-64">
                        <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                        <input
                          type="text"
                          placeholder="Search relationship or question..."
                          value={searchScenarioQuery}
                          onChange={(e) => setSearchScenarioQuery(e.target.value)}
                          className="w-full bg-accent/40 text-foreground border border-border rounded-lg pl-8 pr-3 py-1.5 text-xs focus:ring-2 focus:ring-primary/40 focus:outline-none font-medium"
                        />
                      </div>
                    </div>

                    {/* Action & Selection Bar */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-border">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => handleSelectAllScenarios(filteredScenarios.map((s) => s.id))}
                          className="text-xs font-semibold text-primary hover:underline flex items-center gap-1.5"
                        >
                          {selectedScenarioIds.size === filteredScenarios.length && filteredScenarios.length > 0 ? (
                            <>
                              <CheckSquare className="h-3.5 w-3.5" />
                              <span>Deselect All</span>
                            </>
                          ) : (
                            <>
                              <Square className="h-3.5 w-3.5" />
                              <span>Select All ({filteredScenarios.length})</span>
                            </>
                          )}
                        </button>

                        <span className="text-xs text-muted-foreground font-medium">
                          Selected: <strong className="text-foreground">{selectedScenarioIds.size}</strong> of {filteredScenarios.length} relationships
                        </span>
                      </div>

                      {/* Prominent Action Button: Generate Detailed AI Insights */}
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          onClick={handleInspectSelectedScenarios}
                          disabled={selectedScenarioIds.size === 0}
                          className="bg-gradient-to-r from-violet-600 to-primary hover:from-violet-700 hover:to-primary/90 text-white font-bold gap-2 text-xs shadow-md shadow-violet-600/20 px-5 h-9"
                        >
                          <Sparkles className="h-4 w-4 text-amber-300" />
                          <span>
                            {selectedScenarioIds.size > 0
                              ? `Get Detailed AI Insights (${selectedScenarioIds.size} Selected)`
                              : "Select Relations for Detailed Insights"}
                          </span>
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Relationship Scenarios Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredScenarios.map((sc) => {
                      const isSelected = selectedScenarioIds.has(sc.id);

                      // Category style
                      let catColor = "bg-purple-500/10 text-purple-500 border-purple-500/20";
                      if (sc.category === "anomaly") catColor = "bg-rose-500/10 text-rose-500 border-rose-500/20";
                      else if (sc.category === "trend") catColor = "bg-sky-500/10 text-sky-500 border-sky-500/20";
                      else if (sc.category === "relationship") catColor = "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";

                      return (
                        <div
                          key={sc.id}
                          onClick={() => handleToggleScenarioSelect(sc.id)}
                          className={`rounded-xl border p-5 transition-all duration-200 cursor-pointer flex flex-col justify-between relative group ${isSelected
                            ? "bg-card border-violet-500/80 ring-2 ring-violet-500/20 shadow-md"
                            : "bg-card border-border hover:border-violet-500/40 hover:shadow-sm"
                            }`}
                        >
                          {/* Top Row: Checkbox, Category, Confidence */}
                          <div>
                            <div className="flex items-center justify-between gap-2 mb-3">
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={(e) => handleToggleScenarioSelect(sc.id, e)}
                                  className={`h-5 w-5 rounded flex items-center justify-center transition-colors border ${isSelected
                                    ? "bg-violet-600 border-violet-600 text-white"
                                    : "border-border bg-accent/40 hover:border-primary text-transparent"
                                    }`}
                                >
                                  <Check className="h-3.5 w-3.5 stroke-[3]" />
                                </button>
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${catColor}`}>
                                  {sc.category}
                                </span>
                                {sc.isCustom && (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-500 border border-amber-500/20">
                                    Custom
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-mono">
                                <span className={`h-2 w-2 rounded-full ${sc.confidence === "high" ? "bg-emerald-500" : sc.confidence === "medium" ? "bg-amber-500" : "bg-slate-400"
                                  }`} />
                                <span className="capitalize">{sc.confidence}</span>
                              </div>
                            </div>

                            {/* Title */}
                            <h4 className="font-display font-bold text-base text-foreground leading-snug group-hover:text-primary transition-colors">
                              {sc.title}
                            </h4>

                            {/* Connected Columns Badges */}
                            <div className="flex flex-wrap items-center gap-1.5 my-3">
                              {sc.columns.map((c, i) => (
                                <React.Fragment key={c}>
                                  <span className="px-2 py-0.5 rounded bg-accent/70 border border-border text-[11px] font-semibold text-foreground font-mono">
                                    {c}
                                  </span>
                                  {i < sc.columns.length - 1 && (
                                    <span className="text-[10px] text-muted-foreground font-bold">↔</span>
                                  )}
                                </React.Fragment>
                              ))}
                            </div>

                            {/* Method & Suggested Chart */}
                            <div className="flex items-center gap-2 text-[11px] text-muted-foreground mb-3">
                              <span className="px-2 py-0.5 rounded bg-accent/50 text-[10px] font-mono">
                                {sc.method}
                              </span>
                              <span>•</span>
                              <span className="capitalize text-[10px]">
                                {sc.suggestedChart} chart
                              </span>
                            </div>

                            {/* Business Question Quote Callout */}
                            <div className="bg-accent/30 border-l-2 border-primary/60 rounded-r-lg p-2.5 my-2">
                              <p className="text-xs text-foreground font-semibold italic">
                                "{sc.businessQuestion}"
                              </p>
                            </div>

                            {/* Why It Matters */}
                            <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2 mt-2">
                              {sc.whyItMatters}
                            </p>
                          </div>

                          {/* Card Footer Actions */}
                          <div className="pt-4 mt-4 border-t border-border flex items-center justify-between gap-2">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleInspectSingleScenario(sc);
                              }}
                              className="text-xs font-bold text-violet-500 hover:text-violet-600 flex items-center gap-1 transition-colors"
                            >
                              <span>Detailed Insights</span>
                              <ChevronRight className="h-3.5 w-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenInPivot(sc);
                              }}
                              className="text-[11px] font-semibold text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                            >
                              <Grid3X3 className="h-3 w-3" />
                              <span>Pivot Matrix</span>
                            </button>
                          </div>

                        </div>
                      );
                    })}
                  </div>

                  {filteredScenarios.length === 0 && (
                    <div className="p-8 text-center text-xs text-muted-foreground bg-card border border-border rounded-xl">
                      No relationship scenarios match the selected filters. Try choosing "All Relationships" or clear your search query.
                    </div>
                  )}
                </>
              )}

            </div>
          )}

          {/* VIEW MODE 4: FULL-PAGE SCHEMA-DRIVEN EXECUTIVE DASHBOARD */}
          {activeTabMode === "dashboard" && (
            <AnalysisDashboardView
              report={currentReportEntry?.report || null}
              payload={currentReportEntry?.payload || EXAMPLE_LOAN_PORTFOLIO_PAYLOAD}
              activeSheet={activeSheet}
              activeDatasetName={activeDataset?.name || "Dataset"}
              isLoading={dashboardLoading}
              error={dashboardError}
              onBack={() => setActiveTabMode("relationships")}
              onLoadSample={handleLoadSampleDashboard}
            />
          )}

        </div>
      )}

      {/* Custom Relationship Builder Modal */}
      {activeSheet && (
        <CustomRelationshipModal
          isOpen={isCustomModalOpen}
          onClose={() => setIsCustomModalOpen(false)}
          activeSheet={activeSheet}
          onAddCustomScenario={handleAddCustomScenario}
        />
      )}

      {/* Detailed AI Insights Modal */}
      {activeSheet && scenarioForDetailModal.length > 0 && (
        <DetailedInsightsModal
          isOpen={isDetailedModalOpen}
          onClose={() => {
            setIsDetailedModalOpen(false);
            setScenarioForDetailModal([]);
          }}
          selectedScenarios={scenarioForDetailModal}
          activeSheet={activeSheet}
          onOpenInPivot={handleOpenInPivot}
        />
      )}

    </div>
  );
}

