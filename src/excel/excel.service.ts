import { Injectable, Logger } from "@nestjs/common";
import ExcelJS from "exceljs";
import { PrismaService } from "../prisma/prisma.service.js";
import { StorageService } from "../storage/services/storage.service.js";
import {
  ExcelColumnDef,
  ExcelExportOptions,
  ExcelExportResult,
} from "./interfaces/excel.interface.js";
import { ExportToExcelInput, ExportToExcelPayload } from "../generated/graphql/types.js";

@Injectable()
export class ExcelService {
  private readonly logger = new Logger(ExcelService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
  ) {}

  /**
   * Main entry point for exporting data to Excel and saving to storage bucket.
   */
  async exportToExcel(input: ExportToExcelInput): Promise<ExportToExcelPayload> {
    try {
      // 1. Parse columns
      const columns: ExcelColumnDef[] = (input.columns || []).map((col) => ({
        header: col.header,
        key: col.key,
        width: col.width ?? undefined,
        numFmt: col.numFmt ?? undefined,
        alignment: col.alignment
          ? {
              horizontal: col.alignment.horizontal as "left" | "center" | "right",
              vertical: col.alignment.vertical as "top" | "middle" | "bottom",
            }
          : undefined,
      }));

      // 2. Parse direct data JSON if provided
      let directData: Record<string, any>[] | undefined;
      if (input.dataJson) {
        try {
          const parsed = JSON.parse(input.dataJson);
          if (Array.isArray(parsed)) {
            directData = parsed;
          } else {
            return {
              success: false,
              totalRows: 0,
              fileSizeBytes: 0,
              userErrors: [
                {
                  message: "dataJson must be a valid JSON array of objects",
                  code: "INVALID_DATA_JSON",
                  field: ["dataJson"],
                },
              ],
            };
          }
        } catch (e: any) {
          return {
            success: false,
            totalRows: 0,
            fileSizeBytes: 0,
            userErrors: [
              {
                message: `Failed to parse dataJson: ${e.message}`,
                code: "JSON_PARSE_ERROR",
                field: ["dataJson"],
              },
            ],
          };
        }
      }

      // 3. Parse filter and orderBy
      let filter: Record<string, any> | undefined;
      if (input.filterJson) {
        try {
          filter = JSON.parse(input.filterJson);
        } catch (e: any) {
          return {
            success: false,
            totalRows: 0,
            fileSizeBytes: 0,
            userErrors: [
              {
                message: `Failed to parse filterJson: ${e.message}`,
                code: "JSON_PARSE_ERROR",
                field: ["filterJson"],
              },
            ],
          };
        }
      }

      let orderBy: Record<string, any> | Record<string, any>[] | undefined;
      if (input.orderByJson) {
        try {
          orderBy = JSON.parse(input.orderByJson);
        } catch (e: any) {
          return {
            success: false,
            totalRows: 0,
            fileSizeBytes: 0,
            userErrors: [
              {
                message: `Failed to parse orderByJson: ${e.message}`,
                code: "JSON_PARSE_ERROR",
                field: ["orderByJson"],
              },
            ],
          };
        }
      }

      // 4. Generate Excel Workbook
      const result = await this.generateAndSaveExcel({
        filename: input.filename ?? undefined,
        title: input.title ?? undefined,
        sheetName: input.sheetName ?? undefined,
        columns: columns.length > 0 ? columns : undefined,
        data: directData,
        entityName: input.entityName ?? undefined,
        filter,
        orderBy,
        subPath: input.subPath ?? "exports/excel",
        bucket: input.bucket ?? undefined,
      });

      return result;
    } catch (error: any) {
      this.logger.error(`Export to Excel failed: ${error.message}`, error.stack);
      return {
        success: false,
        totalRows: 0,
        fileSizeBytes: 0,
        userErrors: [
          {
            message: error.message || "An unexpected error occurred during Excel export",
            code: "INTERNAL_ERROR",
          },
        ],
      };
    }
  }

  /**
   * Generates an Excel workbook from either in-memory dataset or dynamically chunked Prisma queries,
   * styles it professionally, saves it to storage bucket, and returns metadata.
   */
  async generateAndSaveExcel(options: ExcelExportOptions): Promise<ExcelExportResult> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "BENTLY ERP System";
    workbook.lastModifiedBy = "BENTLY ERP System";
    workbook.created = new Date();
    workbook.modified = new Date();

    const sheetName = options.sheetName?.trim() || "Export Data";
    const worksheet = workbook.addWorksheet(sheetName, {
      views: [{ showGridLines: true }],
    });

    let totalRows = 0;
    let resolvedColumns = options.columns ? [...options.columns] : [];

    // Case A: Direct Data
    if (options.data && options.data.length > 0) {
      if (resolvedColumns.length === 0) {
        resolvedColumns = this.inferColumnsFromData(options.data);
      }
      this.setupWorksheetHeaders(worksheet, resolvedColumns, options.title);
      totalRows = this.appendRowsToWorksheet(worksheet, resolvedColumns, options.data);
    } else if (options.entityName) {
      // Case B: Dynamic Prisma Chunked Ingestion
      const delegate = this.getPrismaDelegate(options.entityName);
      if (!delegate) {
        return {
          success: false,
          filename: "",
          filePath: "",
          downloadUrl: "",
          totalRows: 0,
          fileSizeBytes: 0,
          userErrors: [
            {
              message: `Unknown or unsupported entity: '${options.entityName}'`,
              code: "ENTITY_NOT_FOUND",
              field: ["entityName"],
            },
          ],
        };
      }

      // Fetch in chunks of 1000 records
      const CHUNK_SIZE = 1000;
      let offset = 0;
      let hasMore = true;
      let headersInitialized = false;

      while (hasMore) {
        const queryArgs: any = {
          take: CHUNK_SIZE,
          skip: offset,
        };
        if (options.filter) {
          queryArgs.where = options.filter;
        }
        if (options.orderBy) {
          queryArgs.orderBy = options.orderBy;
        }

        const chunk: any[] = await delegate.findMany(queryArgs);

        if (chunk.length === 0) {
          hasMore = false;
          break;
        }

        if (!headersInitialized) {
          if (resolvedColumns.length === 0) {
            resolvedColumns = this.inferColumnsFromData(chunk);
          }
          this.setupWorksheetHeaders(worksheet, resolvedColumns, options.title);
          headersInitialized = true;
        }

        const appendedCount = this.appendRowsToWorksheet(worksheet, resolvedColumns, chunk);
        totalRows += appendedCount;
        offset += chunk.length;

        if (chunk.length < CHUNK_SIZE) {
          hasMore = false;
        }
      }

      // If no records were found at all, still initialize header if columns were provided
      if (!headersInitialized && resolvedColumns.length > 0) {
        this.setupWorksheetHeaders(worksheet, resolvedColumns, options.title);
      }
    } else {
      // Empty export
      if (resolvedColumns.length > 0) {
        this.setupWorksheetHeaders(worksheet, resolvedColumns, options.title);
      }
    }

    // Auto-fit column widths
    this.adjustColumnWidths(worksheet, resolvedColumns);

    // Generate buffer
    const arrayBuffer = await workbook.xlsx.writeBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Determine filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const sanitizedBase = (options.filename || options.entityName || "export")
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .replace(/_+/g, "_");
    const filename = sanitizedBase.endsWith(".xlsx")
      ? sanitizedBase
      : `${sanitizedBase}_${timestamp}.xlsx`;

    const subPath = options.subPath || "exports/excel";

    // Save to storage bucket
    const saved = await this.storageService.saveBuffer(
      subPath,
      filename,
      buffer,
      options.bucket,
    );

    const downloadUrl = `/api/storage/${saved.relativePath.startsWith("public/") ? saved.relativePath : "private/" + saved.relativePath.replace(/^private\//, "")}`;

    return {
      success: true,
      filename,
      filePath: saved.relativePath,
      downloadUrl,
      totalRows,
      fileSizeBytes: buffer.length,
      userErrors: [],
    };
  }

  /**
   * Set up worksheet title and header row with consistent professional styling.
   */
  private setupWorksheetHeaders(
    worksheet: ExcelJS.Worksheet,
    columns: ExcelColumnDef[],
    title?: string,
  ): void {
    let headerRowIndex = 1;

    // Optional Title Banner
    if (title && title.trim()) {
      worksheet.mergeCells(1, 1, 1, Math.max(columns.length, 1));
      const titleCell = worksheet.getCell(1, 1);
      titleCell.value = title.trim();
      titleCell.font = {
        name: "Calibri",
        size: 14,
        bold: true,
        color: { argb: "FF0F172A" },
      };
      titleCell.alignment = { vertical: "middle", horizontal: "left" };
      worksheet.getRow(1).height = 30;

      // Blank spacing row
      worksheet.getRow(2).height = 12;
      headerRowIndex = 3;
    }

    // Header Row Definition
    const headerRow = worksheet.getRow(headerRowIndex);
    headerRow.height = 28;

    columns.forEach((col, idx) => {
      const cell = headerRow.getCell(idx + 1);
      cell.value = col.header;
      cell.font = {
        name: "Calibri",
        size: 11,
        bold: true,
        color: { argb: "FFFFFFFF" }, // White text
      };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF1E293B" }, // Dark Navy / Slate (#1E293B)
      };
      cell.alignment = {
        vertical: "middle",
        horizontal: col.alignment?.horizontal || "center",
        wrapText: true,
      };
      cell.border = {
        top: { style: "thin", color: { argb: "FF475569" } },
        left: { style: "thin", color: { argb: "FF475569" } },
        bottom: { style: "medium", color: { argb: "FF0F172A" } },
        right: { style: "thin", color: { argb: "FF475569" } },
      };
    });

    headerRow.commit();
  }

  /**
   * Appends formatted data rows to the worksheet.
   */
  private appendRowsToWorksheet(
    worksheet: ExcelJS.Worksheet,
    columns: ExcelColumnDef[],
    data: Record<string, any>[],
  ): number {
    let rowCount = 0;

    for (const record of data) {
      const rowValues: any[] = [];

      for (const col of columns) {
        const val = this.resolveNestedValue(record, col.key);
        rowValues.push(this.formatCellValue(val));
      }

      const row = worksheet.addRow(rowValues);
      row.height = 20;

      // Apply cell styling & formats
      columns.forEach((col, idx) => {
        const cell = row.getCell(idx + 1);

        cell.font = {
          name: "Calibri",
          size: 10,
          color: { argb: "FF334155" },
        };

        cell.border = {
          top: { style: "thin", color: { argb: "FFE2E8F0" } },
          left: { style: "thin", color: { argb: "FFE2E8F0" } },
          bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
          right: { style: "thin", color: { argb: "FFE2E8F0" } },
        };

        if (col.alignment) {
          cell.alignment = {
            vertical: col.alignment.vertical || "middle",
            horizontal: col.alignment.horizontal || "left",
          };
        } else {
          cell.alignment = {
            vertical: "middle",
            horizontal: typeof cell.value === "number" ? "right" : "left",
          };
        }

        if (col.numFmt) {
          cell.numFmt = col.numFmt;
        }
      });

      row.commit();
      rowCount++;
    }

    return rowCount;
  }

  /**
   * Dynamically auto-fits column widths based on cell content length.
   */
  private adjustColumnWidths(
    worksheet: ExcelJS.Worksheet,
    columns: ExcelColumnDef[],
  ): void {
    columns.forEach((col, idx) => {
      const worksheetColumn = worksheet.getColumn(idx + 1);

      if (col.width && col.width > 0) {
        worksheetColumn.width = col.width;
        return;
      }

      let maxLength = (col.header || "").toString().length;

      worksheetColumn.eachCell({ includeEmpty: false }, (cell, rowNumber) => {
        // Skip title row (row 1 if merged)
        if (rowNumber === 1 && worksheet.views.length > 0) {
          // Check if merged
          return;
        }

        const cellValue = cell.value;
        if (cellValue !== null && cellValue !== undefined) {
          let strVal = "";
          if (cellValue instanceof Date) {
            strVal = cellValue.toISOString().slice(0, 19);
          } else if (typeof cellValue === "object") {
            strVal = JSON.stringify(cellValue);
          } else {
            strVal = cellValue.toString();
          }

          if (strVal.length > maxLength) {
            maxLength = strVal.length;
          }
        }
      });

      // Bound width between 12 and 50 characters
      worksheetColumn.width = Math.max(12, Math.min(maxLength + 4, 50));
    });
  }

  /**
   * Infer column headers and keys from the first record keys.
   */
  private inferColumnsFromData(data: Record<string, any>[]): ExcelColumnDef[] {
    if (!data || data.length === 0) return [];
    const first = data[0];
    const keys = Object.keys(first);

    return keys.map((key) => ({
      header: this.formatHeaderLabel(key),
      key,
    }));
  }

  /**
   * Converts camelCase or snake_case key to clean Header Label.
   */
  private formatHeaderLabel(key: string): string {
    return key
      .replace(/_/g, " ")
      .replace(/([a-z])([A-Z])/g, "$1 $2")
      .replace(/^./, (str) => str.toUpperCase())
      .trim();
  }

  /**
   * Safely resolves dot-notated nested object paths (e.g. "customer.name" or "items.0.code").
   */
  private resolveNestedValue(record: Record<string, any>, keyPath: string): any {
    if (!record || !keyPath) return null;
    if (keyPath in record) return record[keyPath];

    const parts = keyPath.split(".");
    let current: any = record;
    for (const part of parts) {
      if (current === null || current === undefined) {
        return null;
      }
      current = current[part];
    }
    return current;
  }

  /**
   * Formats raw value for Excel cell.
   */
  private formatCellValue(value: any): any {
    if (value === null || value === undefined) {
      return "";
    }
    if (value instanceof Date) {
      return value;
    }
    if (typeof value === "boolean") {
      return value ? "Yes" : "No";
    }
    if (typeof value === "object") {
      if (Array.isArray(value)) {
        return value.map((v) => (typeof v === "object" ? JSON.stringify(v) : v)).join(", ");
      }
      return JSON.stringify(value);
    }
    return value;
  }

  /**
   * Retrieves Prisma model delegate matching entity name (e.g., "SalesOrder" -> prisma.salesOrder).
   */
  private getPrismaDelegate(entityName: string): any | null {
    if (!entityName) return null;

    // Direct match
    if ((this.prisma as any)[entityName]) {
      return (this.prisma as any)[entityName];
    }

    // Lower camelCase match (e.g. "SalesOrder" -> "salesOrder", "FINISHED_GOODS_LOT" -> "finishedGoodsLot")
    const camel = entityName.charAt(0).toLowerCase() + entityName.slice(1);
    if ((this.prisma as any)[camel]) {
      return (this.prisma as any)[camel];
    }

    // Lowercase match
    const lower = entityName.toLowerCase();
    const keys = Object.keys(this.prisma);
    const matchedKey = keys.find((k) => k.toLowerCase() === lower);
    if (matchedKey && (this.prisma as any)[matchedKey]?.findMany) {
      return (this.prisma as any)[matchedKey];
    }

    return null;
  }
}
