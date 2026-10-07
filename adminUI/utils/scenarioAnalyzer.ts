import { SheetData, AiScenario, DetailedInsightResult } from "@/types";

/**
 * Calculates in-depth statistical analytics, Recharts data series,
 * and executive narrative recommendations for any AI scenario or custom relationship.
 */
export function analyzeScenario(sheet: SheetData, scenario: AiScenario): DetailedInsightResult {
  const rows = sheet.rows || [];
  const colA = scenario.columns[0] || sheet.headers[0];
  const colB = scenario.columns[1] || null;

  const typeA = sheet.columnTypes[colA] || "string";
  const typeB = colB ? sheet.columnTypes[colB] || "string" : null;

  const normAnalysisType = scenario.analysisType?.toLowerCase() || "group_comparison";
  const normMethod = scenario.method?.toLowerCase() || "groupby-aggregate";

  // 1. OUTLIER DETECTION (IQR Method)
  if (normAnalysisType.includes("outlier") || normMethod.includes("iqr") || normMethod.includes("z-score")) {
    const targetCol = (typeA === "number" ? colA : colB && typeB === "number" ? colB : colA);
    const numericVals: { val: number; row: Record<string, any> }[] = [];

    rows.forEach((r) => {
      const raw = r[targetCol];
      if (raw !== null && raw !== undefined && raw !== "") {
        const num = Number(raw);
        if (!isNaN(num)) {
          numericVals.push({ val: num, row: r });
        }
      }
    });

    numericVals.sort((a, b) => a.val - b.val);
    const n = numericVals.length;

    if (n === 0) {
      return fallbackEmptyInsight(scenario, "No valid numeric data points found to compute outlier bounds.");
    }

    const q1Idx = Math.floor(n * 0.25);
    const q3Idx = Math.floor(n * 0.75);
    const medIdx = Math.floor(n * 0.5);

    const q1 = numericVals[q1Idx].val;
    const q3 = numericVals[q3Idx].val;
    const median = numericVals[medIdx].val;
    const iqr = q3 - q1;
    const lowerBound = q1 - 1.5 * iqr;
    const upperBound = q3 + 1.5 * iqr;

    const outliers = numericVals.filter((item) => item.val < lowerBound || item.val > upperBound);
    const outlierRows = outliers.map((o) => o.row).slice(0, 20);

    // Build distribution histogram buckets
    const minVal = numericVals[0].val;
    const maxVal = numericVals[n - 1].val;
    const bucketCount = 7;
    const bucketSize = (maxVal - minVal) / bucketCount || 1;
    const buckets: { range: string; count: number; isOutlierZone: boolean }[] = [];

    for (let i = 0; i < bucketCount; i++) {
      const bStart = minVal + i * bucketSize;
      const bEnd = minVal + (i + 1) * bucketSize;
      const inBucket = numericVals.filter(
        (v) => (i === bucketCount - 1 ? v.val >= bStart && v.val <= bEnd : v.val >= bStart && v.val < bEnd)
      ).length;

      const isOutlier = bEnd > upperBound || bStart < lowerBound;
      buckets.push({
        range: `${formatNumber(bStart)} - ${formatNumber(bEnd)}`,
        count: inBucket,
        isOutlierZone: isOutlier,
      });
    }

    const outlierPct = ((outliers.length / n) * 100).toFixed(1);

    return {
      scenarioId: scenario.id,
      scenarioTitle: scenario.title,
      category: scenario.category,
      analysisType: scenario.analysisType,
      columns: scenario.columns,
      chartType: "bar",
      chartData: buckets,
      chartXKey: "range",
      chartYKey: "count",
      businessQuestion: scenario.businessQuestion,
      whyItMatters: scenario.whyItMatters,
      summary: `Detected ${outliers.length} anomalous records (${outlierPct}% of population) exceeding statistical threshold bounds [${formatNumber(lowerBound)} to ${formatNumber(upperBound)}].`,
      keyMetrics: [
        { label: "Anomalies Found", value: outliers.length, badge: outliers.length > 0 ? "warning" : "success" },
        { label: "Outlier Ratio", value: `${outlierPct}%` },
        { label: "IQR Spread", value: formatNumber(iqr) },
        { label: "Median Value", value: formatNumber(median) },
        { label: "Upper Threshold", value: formatNumber(upperBound) },
        { label: "Max Outlier", value: outliers.length > 0 ? formatNumber(outliers[outliers.length - 1].val) : "None" },
      ],
      narrativeParagraphs: [
        `Statistical Interquartile Range (IQR) analysis evaluated ${n.toLocaleString()} data points for "${targetCol}". The normal expected distribution lies between ${formatNumber(lowerBound)} and ${formatNumber(upperBound)}.`,
        outliers.length > 0
          ? `A total of ${outliers.length} records trigger outlier flags. The most extreme value observed is ${formatNumber(outliers[outliers.length - 1].val)}, which deviates significantly from the median of ${formatNumber(median)}.`
          : `No statistically significant outliers were identified. The distribution demonstrates strong conformity with regular statistical norms.`,
      ],
      actionableRecommendations: [
        outliers.length > 0
          ? `Review high-value outlier records individually to confirm whether they represent high-yield priority opportunities or potential operational data-entry errors.`
          : `Maintain standard monitoring thresholds as current variance is well contained within expected parameters.`,
        `Consider stratifying "${targetCol}" into tiered categories (e.g., Standard vs. High-Volume) to prevent skewed portfolio averages.`,
      ],
      outlierRows,
      statsTable: [
        { label: "25th Percentile (Q1)", value: formatNumber(q1) },
        { label: "50th Percentile (Median)", value: formatNumber(median) },
        { label: "75th Percentile (Q3)", value: formatNumber(q3) },
        { label: "Interquartile Range (IQR)", value: formatNumber(iqr) },
        { label: "Lower Cutoff Limit", value: formatNumber(lowerBound) },
        { label: "Upper Cutoff Limit", value: formatNumber(upperBound) },
      ],
    };
  }

  // 2. DUPLICATE RECORD DETECTION
  if (normAnalysisType.includes("duplicate") || normMethod.includes("duplicate")) {
    const keyCol = colA;
    const valueMap: Record<string, { count: number; rows: Record<string, any>[] }> = {};

    rows.forEach((r) => {
      const val = r[keyCol] !== null && r[keyCol] !== undefined ? String(r[keyCol]).trim() : "(Blank)";
      if (!valueMap[val]) {
        valueMap[val] = { count: 0, rows: [] };
      }
      valueMap[val].count += 1;
      if (valueMap[val].rows.length < 5) {
        valueMap[val].rows.push(r);
      }
    });

    const duplicates = Object.entries(valueMap)
      .filter(([_, v]) => v.count > 1)
      .sort((a, b) => b[1].count - a[1].count);

    const dupRowsCount = duplicates.reduce((acc, curr) => acc + curr[1].count, 0);
    const dupRate = rows.length > 0 ? ((dupRowsCount / rows.length) * 100).toFixed(1) : "0";

    const chartData = duplicates.slice(0, 10).map(([k, v]) => ({
      name: k.length > 20 ? k.substring(0, 18) + "..." : k,
      count: v.count,
    }));

    return {
      scenarioId: scenario.id,
      scenarioTitle: scenario.title,
      category: scenario.category,
      analysisType: scenario.analysisType,
      columns: scenario.columns,
      chartType: "bar",
      chartData: chartData.length > 0 ? chartData : [{ name: "No Duplicates", count: 0 }],
      chartXKey: "name",
      chartYKey: "count",
      businessQuestion: scenario.businessQuestion,
      whyItMatters: scenario.whyItMatters,
      summary: duplicates.length > 0
        ? `Identified ${duplicates.length} duplicate identifier keys representing ${dupRowsCount} duplicate records (${dupRate}% of sheet).`
        : `Verified 100% record uniqueness across all ${rows.length} rows for identifier "${keyCol}".`,
      keyMetrics: [
        { label: "Duplicate Keys", value: duplicates.length, badge: duplicates.length > 0 ? "danger" : "success" },
        { label: "Affected Rows", value: dupRowsCount },
        { label: "Integrity Score", value: `${(100 - parseFloat(dupRate)).toFixed(1)}%` },
        { label: "Max Repeats", value: duplicates.length > 0 ? duplicates[0][1].count : 1 },
      ],
      narrativeParagraphs: [
        `Data integrity verification inspected column "${keyCol}" across ${rows.length.toLocaleString()} total rows.`,
        duplicates.length > 0
          ? `Found ${duplicates.length} distinct keys that occur more than once, accounting for ${dupRowsCount} records. Top repeated key is "${duplicates[0][0]}" appearing ${duplicates[0][1].count} times.`
          : `Integrity check passed completely. Every row features a globally distinct key in "${keyCol}".`,
      ],
      actionableRecommendations: [
        duplicates.length > 0
          ? `Execute automated de-duplication in Data Cleaning Studio to prevent double-counting of volumes or metric distortion.`
          : `Column "${keyCol}" is reliable as a primary key for joins or relational data models.`,
      ],
      outlierRows: duplicates.flatMap((d) => d[1].rows).slice(0, 20),
    };
  }

  // 3. TIME SERIES / TREND ANALYSIS
  if (normAnalysisType.includes("time") || normAnalysisType.includes("trend") || normMethod.includes("time")) {
    const dateCol = colA;
    const metricCol = colB && typeB === "number" ? colB : null;

    const timelineMap: Record<string, { count: number; sum: number }> = {};

    rows.forEach((r) => {
      const rawDate = r[dateCol];
      if (!rawDate) return;

      let dateKey = String(rawDate).trim();
      const parsed = Date.parse(dateKey);
      if (!isNaN(parsed)) {
        const d = new Date(parsed);
        dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      } else {
        dateKey = dateKey.substring(0, 10);
      }

      if (!timelineMap[dateKey]) {
        timelineMap[dateKey] = { count: 0, sum: 0 };
      }

      timelineMap[dateKey].count += 1;
      if (metricCol) {
        const num = Number(r[metricCol]);
        if (!isNaN(num)) {
          timelineMap[dateKey].sum += num;
        }
      }
    });

    const sortedPeriods = Object.keys(timelineMap).sort();
    const chartData = sortedPeriods.map((period) => ({
      date: period,
      volume: metricCol ? Math.round(timelineMap[period].sum) : timelineMap[period].count,
      count: timelineMap[period].count,
    }));

    if (chartData.length === 0) {
      return fallbackEmptyInsight(scenario, "No valid timestamps parsed for chronological trend analysis.");
    }

    const maxPeriod = [...chartData].sort((a, b) => b.volume - a.volume)[0];
    const minPeriod = [...chartData].sort((a, b) => a.volume - b.volume)[0];
    const totalVolume = chartData.reduce((acc, curr) => acc + curr.volume, 0);

    return {
      scenarioId: scenario.id,
      scenarioTitle: scenario.title,
      category: scenario.category,
      analysisType: scenario.analysisType,
      columns: scenario.columns,
      chartType: "line",
      chartData,
      chartXKey: "date",
      chartYKey: "volume",
      businessQuestion: scenario.businessQuestion,
      whyItMatters: scenario.whyItMatters,
      summary: `Chronological volume tracked across ${chartData.length} distinct time periods, reaching peak activity during ${maxPeriod.date}.`,
      keyMetrics: [
        { label: "Active Periods", value: chartData.length },
        { label: "Peak Period", value: maxPeriod.date, badge: "primary" },
        { label: "Peak Volume", value: formatNumber(maxPeriod.volume) },
        { label: "Lowest Period", value: minPeriod.date },
        { label: "Average per Period", value: formatNumber(Math.round(totalVolume / chartData.length)) },
      ],
      narrativeParagraphs: [
        `Time series evaluation partitioned ${rows.length.toLocaleString()} records across ${chartData.length} chronological milestones.`,
        `Peak transaction volume was logged in ${maxPeriod.date} with ${formatNumber(maxPeriod.volume)} ${metricCol ? `total ${metricCol}` : "records"}, compared to the baseline minimum of ${formatNumber(minPeriod.volume)} in ${minPeriod.date}.`,
      ],
      actionableRecommendations: [
        `Align operational resources and staffing around peak period patterns observed in ${maxPeriod.date}.`,
        `Examine drivers behind low-volume periods to implement corrective promotional or customer engagement campaigns.`,
      ],
    };
  }

  // 4. DISTRIBUTION / FREQUENCY (Single Categorical Dimension)
  if (normAnalysisType.includes("distribution") || !colB) {
    const targetCol = colA;
    const freqMap: Record<string, number> = {};

    rows.forEach((r) => {
      const val = r[targetCol] !== null && r[targetCol] !== undefined && r[targetCol] !== "" ? String(r[targetCol]) : "(Blank)";
      freqMap[val] = (freqMap[val] || 0) + 1;
    });

    const totalValid = Object.values(freqMap).reduce((a, b) => a + b, 0);
    const sortedEntries = Object.entries(freqMap).sort((a, b) => b[1] - a[1]);

    const topCategories = sortedEntries.slice(0, 10).map(([k, v]) => ({
      name: k,
      value: v,
      percentage: totalValid > 0 ? parseFloat(((v / totalValid) * 100).toFixed(1)) : 0,
    }));

    const mode = topCategories[0] || { name: "N/A", value: 0, percentage: 0 };

    return {
      scenarioId: scenario.id,
      scenarioTitle: scenario.title,
      category: scenario.category,
      analysisType: scenario.analysisType,
      columns: scenario.columns,
      chartType: scenario.suggestedChart === "pie" ? "pie" : "bar",
      chartData: topCategories,
      chartXKey: "name",
      chartYKey: "value",
      businessQuestion: scenario.businessQuestion,
      whyItMatters: scenario.whyItMatters,
      summary: `Distribution covers ${sortedEntries.length} unique segments. Dominant segment is "${mode.name}" representing ${mode.percentage}% of all records.`,
      keyMetrics: [
        { label: "Distinct Categories", value: sortedEntries.length },
        { label: "Top Segment", value: mode.name, badge: "primary" },
        { label: "Top Segment Share", value: `${mode.percentage}%` },
        { label: "Top Segment Count", value: mode.value.toLocaleString() },
      ],
      narrativeParagraphs: [
        `Categorical frequency analysis for "${targetCol}" evaluated ${totalValid.toLocaleString()} records across ${sortedEntries.length} unique categories.`,
        `The largest category is "${mode.name}" with ${mode.value.toLocaleString()} occurrences (${mode.percentage}% share). The top 3 categories collectively constitute ${topCategories.slice(0, 3).reduce((acc, c) => acc + c.percentage, 0).toFixed(1)}% of total observations.`,
      ],
      actionableRecommendations: [
        `Focus core product strategies on the dominant "${mode.name}" group while optimizing secondary offerings for long-tail segments.`,
      ],
    };
  }

  // 5. GROUP COMPARISON / RELATIONAL BREAKDOWN (Dimension vs. Metric)
  const groupCol = typeA === "string" || typeA === "boolean" || typeA === "date" ? colA : (colB || colA);
  const metricCol = groupCol === colA ? (colB || colA) : colA;
  const isMetricNumeric = sheet.columnTypes[metricCol] === "number";

  const groupBuckets: Record<string, { count: number; sum: number; values: number[] }> = {};

  rows.forEach((r) => {
    const gVal = r[groupCol] !== null && r[groupCol] !== undefined && r[groupCol] !== "" ? String(r[groupCol]) : "(Blank)";
    if (!groupBuckets[gVal]) {
      groupBuckets[gVal] = { count: 0, sum: 0, values: [] };
    }

    groupBuckets[gVal].count += 1;

    if (isMetricNumeric) {
      const num = Number(r[metricCol]);
      if (!isNaN(num)) {
        groupBuckets[gVal].sum += num;
        groupBuckets[gVal].values.push(num);
      }
    }
  });

  const grandTotal = Object.values(groupBuckets).reduce((acc, curr) => acc + (isMetricNumeric ? curr.sum : curr.count), 0);

  const sortedGroups = Object.entries(groupBuckets)
    .sort((a, b) => (isMetricNumeric ? b[1].sum - a[1].sum : b[1].count - a[1].count))
    .slice(0, 12);

  const chartData = sortedGroups.map(([gName, data]) => {
    const avg = data.values.length > 0 ? data.sum / data.values.length : 0;
    const metricVal = isMetricNumeric ? Math.round(data.sum) : data.count;
    const share = grandTotal > 0 ? ((metricVal / grandTotal) * 100).toFixed(1) : "0";

    return {
      name: gName.length > 18 ? gName.substring(0, 16) + "..." : gName,
      fullName: gName,
      value: metricVal,
      count: data.count,
      avg: Math.round(avg),
      share: parseFloat(share),
    };
  });

  const topGroup = chartData[0] || { name: "N/A", value: 0, share: 0, count: 0, avg: 0 };
  const bottomGroup = chartData[chartData.length - 1] || topGroup;

  return {
    scenarioId: scenario.id,
    scenarioTitle: scenario.title,
    category: scenario.category,
    analysisType: scenario.analysisType,
    columns: scenario.columns,
    chartType: scenario.suggestedChart === "pie" ? "pie" : "bar",
    chartData,
    chartXKey: "name",
    chartYKey: "value",
    businessQuestion: scenario.businessQuestion,
    whyItMatters: scenario.whyItMatters,
    summary: `Cross-analysis of "${metricCol}" by "${groupCol}" demonstrates that "${topGroup.fullName || topGroup.name}" leads with ${formatNumber(topGroup.value)} (${topGroup.share}% market share).`,
    keyMetrics: [
      { label: `Total ${metricCol}`, value: formatNumber(grandTotal), badge: "primary" },
      { label: "Top Contributor", value: topGroup.fullName || topGroup.name },
      { label: "Top Group Share", value: `${topGroup.share}%` },
      { label: "Average per Category", value: formatNumber(Math.round(grandTotal / (sortedGroups.length || 1))) },
      { label: "Lowest Segment", value: bottomGroup.fullName || bottomGroup.name },
    ],
    narrativeParagraphs: [
      `Comparative breakdown evaluated "${metricCol}" across ${Object.keys(groupBuckets).length} distinct categories in "${groupCol}".`,
      `"${topGroup.fullName || topGroup.name}" ranks #1 with a combined volume of ${formatNumber(topGroup.value)} (${topGroup.share}% of total), averaging ${formatNumber(topGroup.avg)} per record. In contrast, "${bottomGroup.fullName || bottomGroup.name}" accounts for only ${bottomGroup.share}% of aggregate volume.`,
      `The concentration ratio indicates significant variation between leading and trailing segments, presenting opportunities for targeted optimization.`,
    ],
    actionableRecommendations: [
      `Prioritize underwriting, marketing, and relationship management for top-performing "${topGroup.fullName || topGroup.name}" which generates the lion's share of volume.`,
      `Investigate performance bottlenecks in lagging segment "${bottomGroup.fullName || bottomGroup.name}" to identify opportunities for expansion or risk mitigation.`,
    ],
  };
}

function fallbackEmptyInsight(scenario: AiScenario, message: string): DetailedInsightResult {
  return {
    scenarioId: scenario.id,
    scenarioTitle: scenario.title,
    category: scenario.category,
    analysisType: scenario.analysisType,
    columns: scenario.columns,
    chartType: "bar",
    chartData: [],
    businessQuestion: scenario.businessQuestion,
    whyItMatters: scenario.whyItMatters,
    summary: message,
    keyMetrics: [
      { label: "Status", value: "Insufficient Data", badge: "warning" },
    ],
    narrativeParagraphs: [
      message,
      "Ensure the required columns contain populated, appropriately formatted values.",
    ],
    actionableRecommendations: [
      "Review column mapping and clean missing or invalid values in the Data Cleaning Studio.",
    ],
  };
}

function formatNumber(num: number): string {
  if (isNaN(num)) return "0";
  if (Math.abs(num) >= 1_000_000_000) {
    return (num / 1_000_000_000).toFixed(2) + "B";
  }
  if (Math.abs(num) >= 1_000_000) {
    return (num / 1_000_000).toFixed(2) + "M";
  }
  if (Math.abs(num) >= 1_000) {
    return (num / 1_000).toFixed(1) + "K";
  }
  return Number.isInteger(num) ? num.toLocaleString() : num.toFixed(2);
}
