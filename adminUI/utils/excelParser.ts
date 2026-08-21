import * as XLSX from "xlsx";
import Papa from "papaparse";
import { Dataset, SheetData, ColumnType } from "@/types";

// Helper to estimate column types based on values
export function detectColumnTypes(headers: string[], rows: Record<string, any>[]): Record<string, ColumnType> {
  const types: Record<string, ColumnType> = {};
  
  headers.forEach((header) => {
    let numericCount = 0;
    let dateCount = 0;
    let booleanCount = 0;
    let nonNullCount = 0;

    rows.forEach((row) => {
      const val = row[header];
      if (val === undefined || val === null || val === "") return;

      nonNullCount++;
      
      // Check number
      if (typeof val === "number" || (!isNaN(Number(val)) && !isNaN(parseFloat(val)))) {
        numericCount++;
      }
      
      // Check boolean
      if (
        typeof val === "boolean" || 
        val === "true" || val === "false" || 
        val === "TRUE" || val === "FALSE"
      ) {
        booleanCount++;
      }
      
      // Check date
      if (val instanceof Date) {
        dateCount++;
      } else if (typeof val === "string") {
        const dateParsed = Date.parse(val);
        // Ensure it's a reasonably formatted date string, not just a number
        if (!isNaN(dateParsed) && isNaN(Number(val)) && val.includes("-") || val.includes("/")) {
          dateCount++;
        }
      }
    });

    if (nonNullCount === 0) {
      types[header] = "string";
    } else if (numericCount === nonNullCount) {
      types[header] = "number";
    } else if (booleanCount === nonNullCount) {
      types[header] = "boolean";
    } else if (dateCount === nonNullCount) {
      types[header] = "date";
    } else {
      types[header] = "string";
    }
  });

  return types;
}

export function parseExcelFile(file: File, arrayBuffer: ArrayBuffer): Promise<Dataset> {
  return new Promise((resolve, reject) => {
    try {
      const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: "array", cellDates: true });
      const sheets: SheetData[] = [];

      workbook.SheetNames.forEach((sheetName) => {
        const worksheet = workbook.Sheets[sheetName];
        
        // Parse rows including empty cells as nulls
        const rawJson: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: null });
        if (rawJson.length === 0) return;

        // Extract header row
        const rawHeaders = rawJson[0];
        const headers = rawHeaders.map((h, i) => (h !== null && h !== undefined ? String(h).trim() : `Column_${i + 1}`));
        
        // Map other rows to objects keyed by header
        const rows: Record<string, any>[] = [];
        for (let i = 1; i < rawJson.length; i++) {
          const rowData = rawJson[i];
          const rowObj: Record<string, any> = {};
          
          headers.forEach((header, colIndex) => {
            const val = rowData[colIndex];
            rowObj[header] = val;
          });
          
          rows.push(rowObj);
        }

        const columnTypes = detectColumnTypes(headers, rows);

        sheets.push({
          name: sheetName,
          headers,
          rows,
          rowCount: rows.length,
          columnCount: headers.length,
          columnTypes,
        });
      });

      if (sheets.length === 0) {
        reject(new Error("No valid sheets found in the Excel file."));
        return;
      }

      resolve({
        id: crypto.randomUUID(),
        name: file.name,
        size: file.size,
        sheets,
        createdAt: new Date().toISOString(),
      });
    } catch (error) {
      reject(error);
    }
  });
}

export function parseCsvFile(file: File, text: string): Promise<Dataset> {
  return new Promise((resolve, reject) => {
    Papa.parse(text, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true,
      complete: (results) => {
        try {
          const headers = results.meta.fields || [];
          const rows = results.data as Record<string, any>[];

          // Clean headers
          const cleanedHeaders = headers.map((h, i) => (h ? h.trim() : `Column_${i + 1}`));

          // Check for header mismatches
          const formattedRows = rows.map((row) => {
            const newRow: Record<string, any> = {};
            cleanedHeaders.forEach((h) => {
              newRow[h] = row[h] === undefined ? null : row[h];
            });
            return newRow;
          });

          const columnTypes = detectColumnTypes(cleanedHeaders, formattedRows);

          const sheet: SheetData = {
            name: "CSV_Data",
            headers: cleanedHeaders,
            rows: formattedRows,
            rowCount: formattedRows.length,
            columnCount: cleanedHeaders.length,
            columnTypes,
          };

          resolve({
            id: crypto.randomUUID(),
            name: file.name,
            size: file.size,
            sheets: [sheet],
            createdAt: new Date().toISOString(),
          });
        } catch (error) {
          reject(error);
        }
      },
      error: (error: any) => {
        reject(error);
      },
    });
  });
}
