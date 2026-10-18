import { MetricObject, ChartSpec } from "@/types/dashboard";
import { SheetData } from "@/types";

/**
 * RFC 6901 JSON Pointer implementation.
 * Safe navigation with ~1 (/) and ~0 (~) unescaping and 0-based array index support.
 * Returns undefined if path is missing or invalid.
 */
export function resolveJsonPointer(doc: any, pointer: string | null | undefined): any {
  if (pointer === null || pointer === undefined || typeof pointer !== "string") {
    return undefined;
  }

  // An empty pointer refers to the entire document
  if (pointer === "" || pointer === "#") {
    return doc;
  }

  // Strip leading hash if present (URI fragment representation)
  let normalized = pointer;
  if (normalized.startsWith("#/")) {
    normalized = normalized.slice(1);
  } else if (normalized.startsWith("#")) {
    normalized = normalized.slice(1);
  }

  // Pointer must begin with /
  if (!normalized.startsWith("/")) {
    normalized = "/" + normalized;
  }

  const segments = normalized
    .slice(1)
    .split("/")
    .map((seg) => seg.replace(/~1/g, "/").replace(/~0/g, "~"));

  let current = doc;

  for (const segment of segments) {
    if (current === null || current === undefined) {
      return undefined;
    }

    if (Array.isArray(current)) {
      // Must be a valid integer index >= 0
      if (!/^(0|[1-9]\d*)$/.test(segment)) {
        return undefined;
      }
      const index = parseInt(segment, 10);
      if (index < 0 || index >= current.length) {
        return undefined;
      }
      current = current[index];
    } else if (typeof current === "object") {
      if (segment in current) {
        current = current[segment];
      } else {
        return undefined;
      }
    } else {
      return undefined;
    }
  }

  return current;
}

/**
 * Currency symbol mapping for known ISO codes and symbols
 */
const CURRENCY_SYMBOLS: Record<string, string> = {
  INR: "₹",
  USD: "$",
  EUR: "€",
  GBP: "£",
  JPY: "¥",
  CAD: "CA$",
  AUD: "A$",
  CNY: "¥",
};

/**
 * Formats a metric value according to metadata rules.
 * - Preserves valid 0
 * - Never substitutes 0 for missing/invalid data (returns "Unavailable")
 * - Never assumes a currency if unspecified
 * - Handles percentScale ("ratio" vs "percentage_points")
 * - Honors decimalPlaces and units
 */
export function formatMetricValue(
  value: any,
  meta?: Partial<MetricObject>
): string {
  // Missing or invalid checks
  if (
    value === null ||
    value === undefined ||
    value === "" ||
    (typeof value === "number" && (isNaN(value) || !isFinite(value)))
  ) {
    return "Unavailable";
  }

  const format = meta?.format || "decimal";
  const currency = meta?.currency;
  const unit = meta?.unit;
  const percentScale = meta?.percentScale;
  const decimalPlaces = meta?.decimalPlaces;

  // If value is boolean
  if (typeof value === "boolean") {
    return value ? "True" : "False";
  }

  // Check if value is numeric or numeric-string
  const numValue = typeof value === "number" ? value : Number(value);
  const isNumeric = !isNaN(numValue) && typeof value !== "boolean";

  if (!isNumeric) {
    // Non-numeric string value
    const str = String(value);
    return unit ? `${str} ${unit}` : str;
  }

  let finalNumber = numValue;

  // Handle percentScale for percentages
  if (format === "percent" || format === "percentage") {
    if (percentScale === "ratio") {
      finalNumber = finalNumber * 100;
    }
    // If percentScale is "percentage_points" or null/unspecified, keep as is
  } else if (percentScale === "ratio" && (unit === "%" || unit === "percent")) {
    finalNumber = finalNumber * 100;
  }

  // Determine decimal places
  let decimals = 2;
  if (typeof decimalPlaces === "number" && decimalPlaces >= 0) {
    decimals = decimalPlaces;
  } else if (format === "integer") {
    decimals = 0;
  } else if (format === "percent" || format === "percentage") {
    decimals = 1;
  }

  // Format number with commas
  const formattedDigits = finalNumber.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  // Handle currency: NEVER assume currency if unspecified
  if (format === "currency") {
    if (currency && typeof currency === "string" && currency.trim() !== "") {
      const trimmed = currency.trim();
      const symbol = CURRENCY_SYMBOLS[trimmed.toUpperCase()] || trimmed;
      const combined = `${symbol} ${formattedDigits}`.trim();
      return unit ? `${combined} ${unit}` : combined;
    } else {
      // Unspecified currency: do not attach any currency symbol
      return unit ? `${formattedDigits} ${unit}` : formattedDigits;
    }
  }

  // Handle percent format
  if (format === "percent" || format === "percentage") {
    return `${formattedDigits}%`;
  }

  // Regular integer/decimal with optional unit
  if (unit && typeof unit === "string" && unit.trim() !== "") {
    if (unit === "%") {
      return `${formattedDigits}%`;
    }
    return `${formattedDigits} ${unit}`;
  }

  return formattedDigits;
}

/**
 * Resolves template strings containing {{/pointer/path}} against a payload.
 * Missing/unresolved values become "Unavailable".
 * Internal pointer paths or unresolved {{...}} tags are never exposed.
 */
export function resolveTemplate(template: string, payload: any): string {
  if (!template || typeof template !== "string") {
    return "";
  }

  return template.replace(/\{\{([^}]+)\}\}/g, (_match, rawPath) => {
    const trimmedPath = rawPath.trim();
    const resolved = resolveJsonPointer(payload, trimmedPath);

    if (resolved === undefined || resolved === null) {
      return "Unavailable";
    }

    if (typeof resolved === "number") {
      // Auto-format numbers with commas if large
      return resolved.toLocaleString("en-US");
    }

    return String(resolved);
  });
}

export interface ChartValidationResult {
  isValid: boolean;
  reason?: string;
  details?: string;
  isUnsupportedType?: boolean;
}

/**
 * Validates chart requirements:
 * - Box plots need quartiles (q1, q3, median, min, max) and whiskers
 * - Histograms need bins
 * - Pareto charts need cumulative shares
 * - Dimension and measure exist in referenced data
 */
export function validateChartSpec(
  chart: ChartSpec,
  resolvedData: any
): ChartValidationResult {
  if (!resolvedData) {
    return {
      isValid: false,
      reason: `No data found at referenced pointer "${chart.dataRef}".`,
      details: "The data pointer could not be resolved against the calculation payload.",
    };
  }

  const type = (chart.type || "").toLowerCase();

  // 1. Box plot validation
  if (type === "box" || type === "boxplot") {
    // If resolvedData is not an array, check if it's an object with quartiles
    if (Array.isArray(resolvedData)) {
      if (resolvedData.length === 0) {
        return {
          isValid: false,
          reason: "Box plot dataset is empty.",
          details: "Expected distribution records with quartiles and whisker extremes.",
        };
      }
      const first = resolvedData[0];
      const hasQuartiles =
        ("q1" in first && "q3" in first) ||
        ("lowerWhisker" in first && "upperWhisker" in first) ||
        ("min" in first && "max" in first && "median" in first);

      if (!hasQuartiles) {
        return {
          isValid: false,
          reason: "Box plot visualization requires quartiles and whiskers.",
          details: `The referenced dataset contains aggregate records without quartile distribution bounds (Q1, Median, Q3, Min, Max). Available fields: ${Object.keys(first).join(", ")}.`,
        };
      }
    } else if (typeof resolvedData === "object") {
      const hasQuartiles =
        ("q1" in resolvedData && "q3" in resolvedData) ||
        ("lowerBound" in resolvedData && "upperBound" in resolvedData);
      if (!hasQuartiles) {
        return {
          isValid: false,
          reason: "Box plot requires quartile distribution metrics.",
          details: `The referenced target is a summary object without quartile/whisker fields. Available fields: ${Object.keys(resolvedData).join(", ")}.`,
        };
      }
    }
    return { isValid: true };
  }

  // 2. Histogram validation
  if (type === "histogram") {
    if (!Array.isArray(resolvedData) || resolvedData.length === 0) {
      return {
        isValid: false,
        reason: "Histogram requires binned range intervals.",
        details: "Referenced data does not contain binned intervals or frequency buckets.",
      };
    }
    const first = resolvedData[0];
    const hasBins =
      "bin" in first ||
      "range" in first ||
      ("binStart" in first && "binEnd" in first) ||
      "bucket" in first;
    if (!hasBins) {
      return {
        isValid: false,
        reason: "Histogram requires bin ranges or bucket intervals.",
        details: `Available fields: ${Object.keys(first).join(", ")}.`,
      };
    }
    return { isValid: true };
  }

  // 3. Pareto chart validation
  if (type === "pareto") {
    if (!Array.isArray(resolvedData) || resolvedData.length === 0) {
      return {
        isValid: false,
        reason: "Pareto chart requires cumulative shares.",
        details: "Referenced data is empty or missing cumulative distribution metrics.",
      };
    }
    const first = resolvedData[0];
    const hasCumulative =
      "cumulative" in first ||
      "cumulativeShare" in first ||
      "cumulativePercentage" in first ||
      "cumPercent" in first;
    if (!hasCumulative) {
      return {
        isValid: false,
        reason: "Pareto chart requires cumulative share metrics.",
        details: `Referenced records lack cumulative share fields. Available fields: ${Object.keys(first).join(", ")}.`,
      };
    }
    return { isValid: true };
  }

  // 4. Standard series charts (pie, donut, bar, column, line, area, horizontal_bar)
  if (Array.isArray(resolvedData)) {
    if (resolvedData.length === 0) {
      return {
        isValid: false,
        reason: "Referenced dataset is empty.",
        details: "The data series contains 0 items.",
      };
    }

    const first = resolvedData[0];
    if (typeof first !== "object" || first === null) {
      return {
        isValid: false,
        reason: "Unsupported data format.",
        details: "Items in the series are primitives rather than structured objects.",
      };
    }

    // Check dimension and measure presence if specified
    const dim = chart.dimension;
    const meas = chart.measure;
    const keys = Object.keys(first);

    const hasDim = !dim || dim in first || keys.length > 0;
    const hasMeas = !meas || meas in first || typeof first[keys[1] || keys[0]] === "number";

    if (!hasDim || !hasMeas) {
      return {
        isValid: false,
        reason: `Specified dimension "${dim}" or measure "${meas}" not found.`,
        details: `Available keys in data: ${keys.join(", ")}.`,
      };
    }

    return { isValid: true };
  }

  // Unsupported data shape
  return {
    isValid: false,
    reason: "Referenced data structure is not a supported chart series.",
    details: `Expected array of records, but received ${typeof resolvedData}.`,
  };
}

export interface ColumnDiagnostics {
  columnName: string;
  detectedType: "numeric" | "text" | "datetime" | "boolean";
  totalRows: number;
  validCount: number;
  missingCount: number;
  completenessPercent: number;
  // Numeric specific
  min?: number;
  max?: number;
  avg?: number;
  median?: number;
  histogram?: { range: string; count: number; min: number; max: number }[];
  // Categorical specific
  uniqueCount?: number;
  topCategories?: { category: string; count: number; percentage: number }[];
  // Datetime specific
  earliestDate?: string;
  latestDate?: string;
  dateDistribution?: { interval: string; count: number }[];
  // Boolean specific
  trueCount?: number;
  falseCount?: number;
}

/**
 * Computes live, type-appropriate statistics and distribution views
 * for a column in the active sheet.
 */
export function computeColumnDiagnostics(
  sheet: SheetData,
  columnName: string
): ColumnDiagnostics | null {
  if (!sheet || !sheet.rows || !columnName) {
    return null;
  }

  const rows = sheet.rows;
  const totalRows = rows.length;
  const rawType = sheet.columnTypes[columnName] || "string";

  // Scan column values
  const nonNullValues: any[] = [];
  let missingCount = 0;

  for (const r of rows) {
    const val = r[columnName];
    if (val === null || val === undefined || val === "" || String(val).trim().toUpperCase() === "NA") {
      missingCount++;
    } else {
      nonNullValues.push(val);
    }
  }

  const validCount = nonNullValues.length;
  const completenessPercent = totalRows > 0 ? (validCount / totalRows) * 100 : 0;

  // Infer boolean
  const isBooleanCandidate =
    rawType === "boolean" ||
    (validCount > 0 &&
      nonNullValues.every((v) => {
        const s = String(v).trim().toLowerCase();
        return s === "true" || s === "false" || s === "0" || s === "1" || s === "yes" || s === "no";
      }));

  if (isBooleanCandidate) {
    let trueCount = 0;
    let falseCount = 0;
    for (const v of nonNullValues) {
      const s = String(v).trim().toLowerCase();
      if (s === "true" || s === "1" || s === "yes") {
        trueCount++;
      } else {
        falseCount++;
      }
    }

    return {
      columnName,
      detectedType: "boolean",
      totalRows,
      validCount,
      missingCount,
      completenessPercent: Math.round(completenessPercent * 10) / 10,
      trueCount,
      falseCount,
    };
  }

  // Infer datetime
  const isDateCandidate =
    (rawType as string) === "date" ||
    (rawType as string) === "datetime" ||
    columnName.toLowerCase().includes("date") ||
    columnName.toLowerCase().includes("time");

  if (isDateCandidate && validCount > 0) {
    const parsedDates: { date: Date; raw: string }[] = [];
    for (const v of nonNullValues) {
      const d = new Date(v);
      if (!isNaN(d.getTime())) {
        parsedDates.push({ date: d, raw: String(v) });
      }
    }

    if (parsedDates.length > 0) {
      parsedDates.sort((a, b) => a.date.getTime() - b.date.getTime());
      const earliest = parsedDates[0].date.toLocaleDateString("en-US");
      const latest = parsedDates[parsedDates.length - 1].date.toLocaleDateString("en-US");

      // Group by Year-Month
      const monthBuckets: Record<string, number> = {};
      for (const p of parsedDates) {
        const key = `${p.date.getFullYear()}-${String(p.date.getMonth() + 1).padStart(2, "0")}`;
        monthBuckets[key] = (monthBuckets[key] || 0) + 1;
      }

      const dateDistribution = Object.entries(monthBuckets)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .slice(0, 15)
        .map(([interval, count]) => ({ interval, count }));

      return {
        columnName,
        detectedType: "datetime",
        totalRows,
        validCount: parsedDates.length,
        missingCount: totalRows - parsedDates.length,
        completenessPercent: Math.round((parsedDates.length / totalRows) * 1000) / 10,
        earliestDate: earliest,
        latestDate: latest,
        dateDistribution,
      };
    }
  }

  // Infer numeric
  if (rawType === "number") {
    const numbers: number[] = [];
    for (const v of nonNullValues) {
      const num = Number(v);
      if (!isNaN(num) && isFinite(num)) {
        numbers.push(num);
      }
    }

    if (numbers.length > 0) {
      numbers.sort((a, b) => a - b);
      const min = numbers[0];
      const max = numbers[numbers.length - 1];
      const sum = numbers.reduce((a, b) => a + b, 0);
      const avg = sum / numbers.length;
      const mid = Math.floor(numbers.length / 2);
      const median =
        numbers.length % 2 !== 0
          ? numbers[mid]
          : (numbers[mid - 1] + numbers[mid]) / 2;

      // Build 7 histogram bins
      const binCount = Math.min(8, Math.max(4, new Set(numbers).size));
      const binSize = (max - min) / binCount || 1;
      const histogram: { range: string; count: number; min: number; max: number }[] = [];

      for (let i = 0; i < binCount; i++) {
        const bStart = min + i * binSize;
        const bEnd = min + (i + 1) * binSize;
        const count = numbers.filter((n) =>
          i === binCount - 1 ? n >= bStart && n <= bEnd : n >= bStart && n < bEnd
        ).length;

        histogram.push({
          range: `${Math.round(bStart).toLocaleString()} - ${Math.round(bEnd).toLocaleString()}`,
          count,
          min: bStart,
          max: bEnd,
        });
      }

      return {
        columnName,
        detectedType: "numeric",
        totalRows,
        validCount: numbers.length,
        missingCount: totalRows - numbers.length,
        completenessPercent: Math.round((numbers.length / totalRows) * 1000) / 10,
        min: Math.round(min * 100) / 100,
        max: Math.round(max * 100) / 100,
        avg: Math.round(avg * 100) / 100,
        median: Math.round(median * 100) / 100,
        histogram,
      };
    }
  }

  // Categorical / Text
  const freqMap: Record<string, number> = {};
  for (const v of nonNullValues) {
    const s = String(v).trim();
    freqMap[s] = (freqMap[s] || 0) + 1;
  }

  const sortedCategories = Object.entries(freqMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([category, count]) => ({
      category,
      count,
      percentage: validCount > 0 ? Math.round((count / validCount) * 1000) / 10 : 0,
    }));

  return {
    columnName,
    detectedType: "text",
    totalRows,
    validCount,
    missingCount,
    completenessPercent: Math.round(completenessPercent * 10) / 10,
    uniqueCount: Object.keys(freqMap).length,
    topCategories: sortedCategories,
  };
}

/**
 * Built-in mock calculation payload that pairs with the user prompt's Loan Portfolio Example JSON.
 * Resolves 100% of pointers (/dataset/rowCount, /analysisResults/0/groups/0/count, etc.) with exact values.
 */
export const EXAMPLE_LOAN_PORTFOLIO_PAYLOAD = {
  dataset: {
    name: "Loan Portfolio Executive BI",
    rowCount: 549,
    columnCount: 32,
  },
  selectedScenarios: [
    {
      id: "s2",
      title: "Loan Applications by Status",
      category: "category",
      analysisType: "distribution",
      method: "frequency-count",
      suggestedChart: "pie",
      columns: ["Status"],
      businessQuestion: "What is the distribution of loan application statuses?",
    },
    {
      id: "s3",
      title: "IRR Distribution by Co-Lender",
      category: "category",
      analysisType: "group_comparison",
      method: "groupby-aggregate",
      suggestedChart: "bar",
      columns: ["Co-Lender Name", "IRR"],
      businessQuestion: "How does IRR vary across co-lending partners?",
    },
    {
      id: "s5",
      title: "Application Volume Over Time",
      category: "time",
      analysisType: "trend",
      method: "timeseries-aggregate",
      suggestedChart: "line",
      columns: ["Login Date"],
      businessQuestion: "What is the trend of application submissions over time?",
    },
    {
      id: "s6",
      title: "Service Amount Outliers",
      category: "outlier",
      analysisType: "outlier_detection",
      method: "iqr",
      suggestedChart: "bar",
      columns: ["Service Amount"],
      businessQuestion: "Are there anomalous high-value service charges?",
    },
  ],
  analysisResults: [
    // 0: Status
    {
      scenarioId: "s2",
      overall: {
        rowCount: 549,
        uniqueStatuses: 5,
      },
      groups: [
        { Status: "REJECTED", count: 215, percentage: 39.16 },
        { Status: "APPROVED", count: 180, percentage: 32.79 },
        { Status: "IN_REVIEW", count: 85, percentage: 15.48 },
        { Status: "DOCUMENT_PENDING", count: 42, percentage: 7.65 },
        { Status: "DISBURSED", count: 27, percentage: 4.92 },
      ],
      highest: {
        group: "REJECTED",
        value: 215,
      },
    },
    // 1: Co-Lender IRR
    {
      scenarioId: "s3",
      overall: {
        rowCount: 549,
        totalIRR: 8250,
        averageIRR: 15,
        medianIRR: 15,
      },
      groups: [
        { "Co-Lender Name": "TechFino Capital Pvt. Ltd.", count: 280, sum: 4200, average: 15 },
        { "Co-Lender Name": "Godrej Finance Limited", count: 170, sum: 2550, average: 15 },
        { "Co-Lender Name": "UGRO Capital Limited", count: 99, sum: 1500, average: 15 },
      ],
      highest: {
        group: "TechFino Capital Pvt. Ltd.",
        value: 4200,
      },
      lowest: {
        group: "UGRO Capital Limited",
        value: 1500,
      },
    },
    // 2: Login Date
    {
      scenarioId: "s5",
      overall: {
        rowCount: 549,
        uniqueLoginDates: 542,
      },
      groups: [
        { "Login Date": "2024-01-05", count: 42 },
        { "Login Date": "2024-01-12", count: 58 },
        { "Login Date": "2024-01-19", count: 64 },
        { "Login Date": "2024-01-26", count: 71 },
        { "Login Date": "2024-02-02", count: 83 },
        { "Login Date": "2024-02-09", count: 79 },
        { "Login Date": "2024-02-16", count: 91 },
        { "Login Date": "2024-02-23", count: 61 },
      ],
    },
    // 3: Service Amount
    {
      scenarioId: "s6",
      overall: {
        rowCount: 549,
        totalServiceAmount: 54900000,
        averageServiceAmount: 100000,
        medianServiceAmount: 85000,
      },
      groups: [
        { tier: "Standard (0 - 50k)", count: 180, sum: 5400000, average: 30000 },
        { tier: "Moderate (50k - 100k)", count: 220, sum: 16500000, average: 75000 },
        { tier: "Premium (100k - 200k)", count: 110, sum: 15400000, average: 140000 },
        { tier: "Outlier (> 200k)", count: 39, sum: 17600000, average: 451282 },
      ],
    },
  ],
  summary: [
    { header: "Application ID", completeness: "100.0", stats: { uniqueCount: 549 } },
    { header: "Borrower Name", completeness: "100.0", stats: { uniqueCount: 540 } },
    { header: "Loan Amount", completeness: "99.8", stats: { min: 50000, max: 2500000, mean: 450000, median: 350000 } },
    { header: "Interest Rate", completeness: "100.0", stats: { min: 10.5, max: 24.0, mean: 15.2, median: 14.5 } },
    { header: "Tenure Months", completeness: "100.0", stats: { min: 12, max: 84, mean: 36, median: 36 } },
    { header: "Branch", completeness: "100.0", stats: { uniqueCount: 18 } },
    { header: "Status", completeness: "100.0", stats: { uniqueCount: 5 } },
    { header: "Co-Lender Name", completeness: "98.5", stats: { uniqueCount: 3 } },
    { header: "Login Date", completeness: "98.7", stats: { uniqueCount: 542 } },
    { header: "Disbursal Date", completeness: "48.2", stats: { uniqueCount: 260 } },
    { header: "Credit Score", completeness: "94.0", stats: { min: 450, max: 880, mean: 710, median: 725 } },
    { header: "Service Amount", completeness: "100.0", stats: { min: 1500, max: 650000, mean: 100000, median: 85000 } },
    { header: "SoftApproval Status", completeness: "91.4", stats: { nonNullCount: 502, uniqueCount: 3 } },
    { header: "Processing Fee", completeness: "98.2", stats: { min: 1000, max: 25000, mean: 7500, median: 6000 } },
    { header: "Customer Segment", completeness: "100.0", stats: { uniqueCount: 4 } },
    { header: "Employment Type", completeness: "100.0", stats: { uniqueCount: 3 } },
    { header: "Monthly Income", completeness: "95.5", stats: { min: 18000, max: 500000, mean: 65000, median: 50000 } },
    { header: "FOIR", completeness: "88.0", stats: { min: 15.0, max: 75.0, mean: 42.5, median: 40.0 } },
    { header: "LTV", completeness: "86.4", stats: { min: 40.0, max: 95.0, mean: 72.0, median: 75.0 } },
    { header: "Property Value", completeness: "72.0", stats: { min: 500000, max: 10000000, mean: 2200000, median: 1800000 } },
    { header: "Sanction Date", completeness: "62.0", stats: { uniqueCount: 310 } },
    { header: "Verification Status", completeness: "99.0", stats: { uniqueCount: 4 } },
    { header: "Risk Category", completeness: "100.0", stats: { uniqueCount: 3 } },
    { header: "Channel", completeness: "100.0", stats: { uniqueCount: 4 } },
    { header: "Product Code", completeness: "100.0", stats: { uniqueCount: 6 } },
    { header: "Sub Status", completeness: "84.0", stats: { uniqueCount: 12 } },
    { header: "Underwriter Note", completeness: "45.0", stats: { uniqueCount: 210 } },
    { header: "Auto Reject Date", completeness: "17.7", stats: { nonNullCount: 97, uniqueCount: 92 } },
    { header: "Override Reason", completeness: "12.0", stats: { uniqueCount: 45 } },
    { header: "Revoke Date", completeness: "5.8", stats: { nonNullCount: 32, uniqueCount: 30 } },
    { header: "TAT (HH:MM:SS)", completeness: "22.6", stats: { nonNullCount: 124, uniqueCount: 115 } },
    { header: "BSA Completed Date", completeness: "0.0", stats: { nonNullCount: 0, uniqueCount: 0 } },
  ],
};
