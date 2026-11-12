import { SheetData, JoinType, ColumnType, FilterGroup, FilterRule, DatasetStats, NullValueSummary } from "@/types";

// ==========================================
// 1. MERGE / JOIN ALGORITHMS
// ==========================================

export function mergeDatasets(
  sheetA: SheetData,
  sheetB: SheetData,
  joinType: JoinType,
  keyA?: string,
  keyB?: string
): SheetData {
  if (joinType === "append") {
    // Append rows (Union)
    // Merge headers from both sheets
    const headers = Array.from(new Set([...sheetA.headers, ...sheetB.headers]));

    // Combine rows and ensure missing keys are padded with null
    const rows = [...sheetA.rows, ...sheetB.rows].map((row) => {
      const newRow: Record<string, any> = {};
      headers.forEach((h) => {
        newRow[h] = row[h] !== undefined ? row[h] : null;
      });
      return newRow;
    });

    const columnTypes: Record<string, ColumnType> = {};
    headers.forEach((h) => {
      columnTypes[h] = sheetA.columnTypes[h] || sheetB.columnTypes[h] || "string";
    });

    return {
      name: `Append_${sheetA.name}_${sheetB.name}`,
      headers,
      rows,
      rowCount: rows.length,
      columnCount: headers.length,
      columnTypes,
    };
  }

  // Column Joins require join keys
  if (!keyA || !keyB) {
    throw new Error("Join keys must be specified for join operations");
  }

  const keyAStr = String(keyA);
  const keyBStr = String(keyB);

  // Merge headers. If headers overlap (other than the keys), we rename them (e.g. Header_A, Header_B)
  const overlappingHeaders = sheetA.headers.filter(
    (h) => h !== keyAStr && sheetB.headers.includes(h === keyAStr ? keyBStr : h)
  );

  const getHeaderName = (header: string, isSheetB: boolean) => {
    if (header === keyAStr && !isSheetB) return keyAStr;
    if (header === keyBStr && isSheetB) return keyAStr; // Merge keys under the keyA name

    if (overlappingHeaders.includes(header)) {
      return `${header}_${isSheetB ? "B" : "A"}`;
    }
    return header;
  };

  const headers: string[] = [];
  const columnTypes: Record<string, ColumnType> = {};

  // Build merged headers list
  sheetA.headers.forEach((h) => {
    const name = getHeaderName(h, false);
    headers.push(name);
    columnTypes[name] = sheetA.columnTypes[h];
  });

  sheetB.headers.forEach((h) => {
    if (h === keyBStr) return; // Skip keyB as it's merged
    const name = getHeaderName(h, true);
    headers.push(name);
    columnTypes[name] = sheetB.columnTypes[h];
  });

  const mergedRows: Record<string, any>[] = [];

  // Group sheetB rows by key for fast lookup
  const bMap: Record<string, Record<string, any>[]> = {};
  sheetB.rows.forEach((row) => {
    const val = String(row[keyBStr] ?? "");
    if (!bMap[val]) bMap[val] = [];
    bMap[val].push(row);
  });

  // Track matched B rows for Right/Full join
  const matchedBKeys = new Set<string>();

  // Process A rows
  sheetA.rows.forEach((rowA) => {
    const keyValA = String(rowA[keyAStr] ?? "");
    const matchingBRows = bMap[keyValA] || [];

    if (matchingBRows.length > 0) {
      matchedBKeys.add(keyValA);
      matchingBRows.forEach((rowB) => {
        const mergedRow: Record<string, any> = {};

        // Add A values
        sheetA.headers.forEach((h) => {
          mergedRow[getHeaderName(h, false)] = rowA[h];
        });

        // Add B values
        sheetB.headers.forEach((h) => {
          if (h === keyBStr) return;
          mergedRow[getHeaderName(h, true)] = rowB[h];
        });

        mergedRows.push(mergedRow);
      });
    } else {
      // No match in B
      if (joinType === "left" || joinType === "full") {
        const mergedRow: Record<string, any> = {};

        // Add A values
        sheetA.headers.forEach((h) => {
          mergedRow[getHeaderName(h, false)] = rowA[h];
        });

        // Pad B values with null
        sheetB.headers.forEach((h) => {
          if (h === keyBStr) return;
          mergedRow[getHeaderName(h, true)] = null;
        });

        mergedRows.push(mergedRow);
      }
    }
  });

  // Process unmatched B rows for Right/Full join
  if (joinType === "right" || joinType === "full") {
    sheetB.rows.forEach((rowB) => {
      const keyValB = String(rowB[keyBStr] ?? "");

      // If A has not matched this B key
      const keyExistsInA = sheetA.rows.some((rowA) => String(rowA[keyAStr] ?? "") === keyValB);
      if (!keyExistsInA) {
        const mergedRow: Record<string, any> = {};

        // Pad A values with null (except key, which gets B's key value)
        sheetA.headers.forEach((h) => {
          const name = getHeaderName(h, false);
          if (h === keyAStr) {
            mergedRow[name] = rowB[keyBStr];
          } else {
            mergedRow[name] = null;
          }
        });

        // Add B values
        sheetB.headers.forEach((h) => {
          if (h === keyBStr) return;
          mergedRow[getHeaderName(h, true)] = rowB[h];
        });

        mergedRows.push(mergedRow);
      }
    });
  }

  return {
    name: `Join_${joinType.toUpperCase()}_${sheetA.name}_${sheetB.name}`,
    headers,
    rows: mergedRows,
    rowCount: mergedRows.length,
    columnCount: headers.length,
    columnTypes,
  };
}

export interface MultiMergeSource {
  sheet: SheetData;
  name?: string;
  leftKey?: string;
  rightKey?: string;
  joinType?: JoinType;
}

export function mergeMultipleDatasets(
  sources: MultiMergeSource[],
  globalJoinType: JoinType = "left"
): SheetData {
  if (sources.length < 2) {
    throw new Error("At least two sources are required to perform a merge");
  }

  // 1. Append Mode: stack all rows vertically with union of headers
  if (globalJoinType === "append") {
    const allHeaders: string[] = [];
    const headerSet = new Set<string>();
    const columnTypes: Record<string, ColumnType> = {};

    sources.forEach((s) => {
      s.sheet.headers.forEach((h) => {
        if (!headerSet.has(h)) {
          headerSet.add(h);
          allHeaders.push(h);
        }
        if (!columnTypes[h]) {
          columnTypes[h] = s.sheet.columnTypes[h] || "string";
        }
      });
    });

    const allRows: Record<string, any>[] = [];
    sources.forEach((s) => {
      s.sheet.rows.forEach((row) => {
        const newRow: Record<string, any> = {};
        allHeaders.forEach((h) => {
          newRow[h] = row[h] !== undefined ? row[h] : null;
        });
        allRows.push(newRow);
      });
    });

    return {
      name: `Append_${sources.map((s) => s.name || s.sheet.name).join("_")}`,
      headers: allHeaders,
      rows: allRows,
      rowCount: allRows.length,
      columnCount: allHeaders.length,
      columnTypes,
    };
  }

  // 2. Sequential Join Mode
  let currentSheet = sources[0].sheet;

  for (let i = 1; i < sources.length; i++) {
    const src = sources[i];
    const jt = src.joinType || globalJoinType;
    const leftKey = src.leftKey;
    const rightKey = src.rightKey;

    if (!leftKey || !rightKey) {
      throw new Error(`Join keys must be specified for Table ${i + 1} (${src.name || src.sheet.name})`);
    }

    currentSheet = mergeDatasets(currentSheet, src.sheet, jt, leftKey, rightKey);
  }

  return currentSheet;
}

// ==========================================
// 2. SPLIT ALGORITHMS
// ==========================================

export function splitDatasetByCount(sheet: SheetData, size: number): SheetData[] {
  const splits: SheetData[] = [];
  const totalRows = sheet.rows.length;
  let part = 1;

  for (let i = 0; i < totalRows; i += size) {
    const chunk = sheet.rows.slice(i, i + size);
    splits.push({
      name: `${sheet.name}_Split_Part_${part}`,
      headers: [...sheet.headers],
      rows: chunk,
      rowCount: chunk.length,
      columnCount: sheet.columnCount,
      columnTypes: { ...sheet.columnTypes },
    });
    part++;
  }

  return splits;
}

export function splitDatasetByPercentage(sheet: SheetData, percentage: number): SheetData[] {
  const border = Math.round((sheet.rows.length * percentage) / 100);
  const part1 = sheet.rows.slice(0, border);
  const part2 = sheet.rows.slice(border);

  return [
    {
      name: `${sheet.name}_Split_${percentage}pct`,
      headers: [...sheet.headers],
      rows: part1,
      rowCount: part1.length,
      columnCount: sheet.columnCount,
      columnTypes: { ...sheet.columnTypes },
    },
    {
      name: `${sheet.name}_Split_${100 - percentage}pct`,
      headers: [...sheet.headers],
      rows: part2,
      rowCount: part2.length,
      columnCount: sheet.columnCount,
      columnTypes: { ...sheet.columnTypes },
    },
  ];
}

export function splitDatasetByColumnValue(sheet: SheetData, column: string): SheetData[] {
  const groups: Record<string, Record<string, any>[]> = {};

  sheet.rows.forEach((row) => {
    const val = String(row[column] ?? "NULL");
    if (!groups[val]) groups[val] = [];
    groups[val].push(row);
  });

  return Object.entries(groups).map(([value, rows]) => {
    // Sanitize filename/sheetname
    const safeValue = value.replace(/[\/\\\?\*\[\]\:\s]+/g, "_").substring(0, 30);
    return {
      name: `${sheet.name}_By_${column}_${safeValue}`,
      headers: [...sheet.headers],
      rows,
      rowCount: rows.length,
      columnCount: sheet.columnCount,
      columnTypes: { ...sheet.columnTypes },
    };
  });
}

// ==========================================
// 3. STATISTICAL PROFILING & NULL ANALYSIS
// ==========================================

export function analyzeDataset(sheet: SheetData): DatasetStats {
  const totalRows = sheet.rows.length;
  const totalCols = sheet.headers.length;

  if (totalRows === 0) {
    return {
      totalRows: 0,
      totalCols,
      duplicateRows: 0,
      emptyRows: 0,
      completenessScore: 0,
      nullSummaries: [],
    };
  }

  // Find duplicate rows
  const rowStrings = new Set<string>();
  let duplicateCount = 0;
  let emptyRowsCount = 0;

  sheet.rows.forEach((row) => {
    // Check if row is completely empty
    const isEmpty = Object.values(row).every((v) => v === null || v === undefined || v === "");
    if (isEmpty) {
      emptyRowsCount++;
    }

    const str = JSON.stringify(row);
    if (rowStrings.has(str)) {
      duplicateCount++;
    } else {
      rowStrings.add(str);
    }
  });

  // Calculate completeness
  let totalCells = totalRows * totalCols;
  let missingCells = 0;
  const nullSummaries: NullValueSummary[] = [];

  sheet.headers.forEach((header) => {
    let missingCount = 0;

    sheet.rows.forEach((row) => {
      const v = row[header];
      if (v === null || v === undefined || v === "") {
        missingCount++;
      }
    });

    missingCells += missingCount;

    nullSummaries.push({
      columnName: header,
      missingCount,
      missingPercentage: parseFloat(((missingCount / totalRows) * 100).toFixed(2)),
      type: sheet.columnTypes[header] || "string",
    });
  });

  const completenessScore = parseFloat((((totalCells - missingCells) / totalCells) * 100).toFixed(2));

  return {
    totalRows,
    totalCols,
    duplicateRows: duplicateCount,
    emptyRows: emptyRowsCount,
    completenessScore,
    nullSummaries,
  };
}

// ==========================================
// 4. CLEANING ACTIONS
// ==========================================

export function replaceNullValues(
  sheet: SheetData,
  column: string,
  strategy: "mean" | "median" | "mode" | "custom",
  customVal?: string
): SheetData {
  const rows = [...sheet.rows];
  const type = sheet.columnTypes[column];

  // Extract non-null values
  const nonNulls = rows
    .map((r) => r[column])
    .filter((v) => v !== null && v !== undefined && v !== "");

  let replacement: any = null;

  if (strategy === "custom") {
    if (type === "number") {
      replacement = customVal ? Number(customVal) : 0;
    } else if (type === "boolean") {
      replacement = customVal === "true" || customVal === "1";
    } else {
      replacement = customVal ?? "";
    }
  } else if (type === "number" && nonNulls.length > 0) {
    const nums = nonNulls.map(Number).filter((n) => !isNaN(n));
    if (nums.length > 0) {
      if (strategy === "mean") {
        replacement = nums.reduce((a, b) => a + b, 0) / nums.length;
      } else if (strategy === "median") {
        const sorted = [...nums].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        replacement = sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
      } else if (strategy === "mode") {
        const counts: Record<number, number> = {};
        let maxCount = 0;
        let modeVal = nums[0];
        nums.forEach((n) => {
          counts[n] = (counts[n] || 0) + 1;
          if (counts[n] > maxCount) {
            maxCount = counts[n];
            modeVal = n;
          }
        });
        replacement = modeVal;
      }
    }
  } else if (nonNulls.length > 0) {
    // Mode for strings
    const counts: Record<string, number> = {};
    let maxCount = 0;
    let modeVal = String(nonNulls[0]);
    nonNulls.forEach((val) => {
      const s = String(val);
      counts[s] = (counts[s] || 0) + 1;
      if (counts[s] > maxCount) {
        maxCount = counts[s];
        modeVal = s;
      }
    });
    replacement = modeVal;
  }

  // Replace
  const updatedRows = rows.map((row) => {
    const v = row[column];
    if (v === null || v === undefined || v === "") {
      return { ...row, [column]: replacement };
    }
    return row;
  });

  return {
    ...sheet,
    rows: updatedRows,
  };
}

export function cleanTextColumn(
  sheet: SheetData,
  column: string,
  operation: "trim" | "uppercase" | "lowercase" | "titlecase"
): SheetData {
  const updatedRows = sheet.rows.map((row) => {
    const val = row[column];
    if (typeof val !== "string") return row;

    let newVal = val;
    if (operation === "trim") {
      newVal = val.trim();
    } else if (operation === "uppercase") {
      newVal = val.toUpperCase();
    } else if (operation === "lowercase") {
      newVal = val.toLowerCase();
    } else if (operation === "titlecase") {
      newVal = val.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase());
    }

    return { ...row, [column]: newVal };
  });

  return {
    ...sheet,
    rows: updatedRows,
  };
}

export function cleanFindReplace(
  sheet: SheetData,
  column: string,
  findStr: string,
  replaceStr: string
): SheetData {
  const updatedRows = sheet.rows.map((row) => {
    const val = row[column];
    if (val === null || val === undefined) return row;

    const valStr = String(val);
    if (valStr.includes(findStr)) {
      const nextStr = valStr.replaceAll(findStr, replaceStr);
      // Try to preserve type if it is a number
      const nextNum = Number(nextStr);
      const isNum = !isNaN(nextNum) && nextStr.trim() !== "";
      return { ...row, [column]: isNum ? nextNum : nextStr };
    }

    return row;
  });

  return {
    ...sheet,
    rows: updatedRows,
  };
}

export interface DuplicateRowInfo {
  rowIndex: number; // 1-based index
  zeroBasedIndex: number;
  data: Record<string, any>;
  isOriginal: boolean;
  groupId: number;
  duplicateOrder: number;
}

export interface DuplicateGroupInfo {
  groupId: number;
  matchKey: string;
  count: number;
  originalRowIndex: number;
  rows: DuplicateRowInfo[];
}

export interface DuplicateRecordsResult {
  groups: DuplicateGroupInfo[];
  allDuplicateRows: DuplicateRowInfo[];
  redundantRows: DuplicateRowInfo[];
  totalDuplicates: number;
}

export function findDuplicateRecords(
  sheet: SheetData,
  matchColumns?: string[]
): DuplicateRecordsResult {
  const map = new Map<string, { zeroBasedIndex: number; data: Record<string, any> }[]>();

  sheet.rows.forEach((row, idx) => {
    const key = matchColumns && matchColumns.length > 0
      ? matchColumns.map((col) => String(row[col] ?? "")).join(" |:::| ")
      : JSON.stringify(row);

    const existing = map.get(key) || [];
    existing.push({ zeroBasedIndex: idx, data: row });
    map.set(key, existing);
  });

  const groups: DuplicateGroupInfo[] = [];
  const allDuplicateRows: DuplicateRowInfo[] = [];
  const redundantRows: DuplicateRowInfo[] = [];
  let groupIdCounter = 1;

  for (const [key, entries] of map.entries()) {
    if (entries.length > 1) {
      const groupRows: DuplicateRowInfo[] = entries.map((entry, order) => ({
        rowIndex: entry.zeroBasedIndex + 1,
        zeroBasedIndex: entry.zeroBasedIndex,
        data: entry.data,
        isOriginal: order === 0,
        groupId: groupIdCounter,
        duplicateOrder: order,
      }));

      groups.push({
        groupId: groupIdCounter,
        matchKey: key,
        count: entries.length,
        originalRowIndex: entries[0].zeroBasedIndex + 1,
        rows: groupRows,
      });

      groupRows.forEach((r) => {
        allDuplicateRows.push(r);
        if (!r.isOriginal) {
          redundantRows.push(r);
        }
      });

      groupIdCounter++;
    }
  }

  return {
    groups,
    allDuplicateRows,
    redundantRows,
    totalDuplicates: redundantRows.length,
  };
}

export function cleanRemoveDuplicates(sheet: SheetData, matchColumns?: string[]): SheetData {
  const seen = new Set<string>();
  const updatedRows: Record<string, any>[] = [];

  sheet.rows.forEach((row) => {
    const str = matchColumns && matchColumns.length > 0
      ? matchColumns.map((col) => String(row[col] ?? "")).join(" |:::| ")
      : JSON.stringify(row);
    if (!seen.has(str)) {
      seen.add(str);
      updatedRows.push(row);
    }
  });

  return {
    ...sheet,
    rows: updatedRows,
    rowCount: updatedRows.length,
  };
}

export function cleanRemoveEmptyRows(sheet: SheetData): SheetData {
  const updatedRows = sheet.rows.filter((row) => {
    const isEmpty = Object.values(row).some(
      (value) => value === null || value === undefined || (typeof value === "string" && value.trim() === "")
    );
    return !isEmpty;
  });

  return {
    ...sheet,
    rows: updatedRows,
    rowCount: updatedRows.length,
  };
}

export function cleanRemoveEmptyColumns(sheet: SheetData): SheetData {
  const colsToRemove: string[] = [];

  sheet.headers.forEach((h) => {
    const allEmpty = sheet.rows.every((row) => {
      const v = row[h];
      return v === null || v === undefined || v === "";
    });
    if (allEmpty) colsToRemove.push(h);
  });

  if (colsToRemove.length === 0) return sheet;

  const headers = sheet.headers.filter((h) => !colsToRemove.includes(h));
  const columnTypes = { ...sheet.columnTypes };
  colsToRemove.forEach((c) => delete columnTypes[c]);

  const rows = sheet.rows.map((row) => {
    const newRow = { ...row };
    colsToRemove.forEach((c) => delete newRow[c]);
    return newRow;
  });

  return {
    ...sheet,
    headers,
    rows,
    columnCount: headers.length,
    columnTypes,
  };
}

export function cleanRenameColumn(sheet: SheetData, oldName: string, newName: string): SheetData {
  const name = newName.trim();
  if (!name || name === oldName || sheet.headers.includes(name)) return sheet;

  const headers = sheet.headers.map((h) => (h === oldName ? name : h));

  const columnTypes = { ...sheet.columnTypes };
  columnTypes[name] = columnTypes[oldName];
  delete columnTypes[oldName];

  const rows = sheet.rows.map((row) => {
    const newRow: Record<string, any> = {};
    sheet.headers.forEach((h) => {
      if (h === oldName) {
        newRow[name] = row[oldName];
      } else {
        newRow[h] = row[h];
      }
    });
    return newRow;
  });

  return {
    ...sheet,
    headers,
    rows,
    columnTypes,
  };
}

export function cleanChangeType(sheet: SheetData, column: string, targetType: ColumnType): SheetData {
  const columnTypes = { ...sheet.columnTypes, [column]: targetType };

  const rows = sheet.rows.map((row) => {
    const val = row[column];
    if (val === null || val === undefined || val === "") {
      return row;
    }

    let nextVal: any = val;
    if (targetType === "number") {
      nextVal = Number(val);
      if (isNaN(nextVal)) nextVal = null;
    } else if (targetType === "string") {
      nextVal = String(val);
    } else if (targetType === "boolean") {
      nextVal = val === "true" || val === "1" || val === true || val === 1;
    } else if (targetType === "date") {
      const parsed = Date.parse(val);
      nextVal = isNaN(parsed) ? null : new Date(parsed);
    }

    return { ...row, [column]: nextVal };
  });

  return {
    ...sheet,
    rows,
    columnTypes,
  };
}

// ==========================================
// 5. QUERY BUILDER PROCESSOR
// ==========================================

export function evaluateRule(row: Record<string, any>, rule: FilterRule): boolean {
  const val = row[rule.column];
  const target = rule.value.toLowerCase().trim();

  if (rule.operator === "is_empty") {
    return val === null || val === undefined || String(val).trim() === "";
  }
  if (rule.operator === "is_not_empty") {
    return val !== null && val !== undefined && String(val).trim() !== "";
  }

  if (val === null || val === undefined) return false;

  const cellValStr = String(val).toLowerCase();

  switch (rule.operator) {
    case "equals":
      return cellValStr === target;
    case "not_equals":
      return cellValStr !== target;
    case "contains":
      return cellValStr.includes(target);
    case "not_contains":
      return !cellValStr.includes(target);
    case "starts_with":
      return cellValStr.startsWith(target);
    case "ends_with":
      return cellValStr.endsWith(target);
    case "greater_than":
      return Number(val) > Number(rule.value);
    case "greater_than_or_equals":
      return Number(val) >= Number(rule.value);
    case "less_than":
      return Number(val) < Number(rule.value);
    case "less_than_or_equals":
      return Number(val) <= Number(rule.value);
    default:
      return true;
  }
}

export function evaluateGroup(row: Record<string, any>, group: FilterGroup): boolean {
  if (group.rules.length === 0) return true;

  if (group.conjunction === "AND") {
    return group.rules.every((rule) => {
      if ("rules" in rule) {
        return evaluateGroup(row, rule);
      }
      return evaluateRule(row, rule);
    });
  } else {
    return group.rules.some((rule) => {
      if ("rules" in rule) {
        return evaluateGroup(row, rule);
      }
      return evaluateRule(row, rule);
    });
  }
}

export function filterDataset(sheet: SheetData, group: FilterGroup): SheetData {
  const rows = sheet.rows.filter((row) => evaluateGroup(row, group));

  return {
    ...sheet,
    rows,
    rowCount: rows.length,
  };
}


export function exampleRows(arr: any) {
  const length = arr.length;

  // If less than 5, return all data
  if (length < 5) {
    return arr;
  }

  // If greater than 100, take 10 random items
  if (length > 100) {
    return getRandomItems(arr, 10);
  }

  return getRandomItems(arr, 5);

  function getRandomItems(arr: any[], count: number) {
    const shuffled = [...arr].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  }

}
