export interface ExcelColumnDef {
  header: string;
  key: string;
  width?: number;
  numFmt?: string;
  alignment?: {
    horizontal?: "left" | "center" | "right";
    vertical?: "top" | "middle" | "bottom";
  };
}

export interface ExcelExportOptions {
  filename?: string;
  title?: string;
  sheetName?: string;
  columns?: ExcelColumnDef[];
  data?: Record<string, any>[];
  entityName?: string;
  filter?: Record<string, any>;
  orderBy?: Record<string, any> | Record<string, any>[];
  subPath?: string;
  bucket?: string;
}

export interface ExcelExportResult {
  success: boolean;
  filename: string;
  filePath: string;
  downloadUrl: string;
  totalRows: number;
  fileSizeBytes: number;
  userErrors: { message: string; code?: string; field?: string[] }[];
}
