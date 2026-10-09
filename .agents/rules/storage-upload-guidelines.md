# Storage & File/Image Upload Conventions

## Local Bucket Configuration
- The `BUCKET` environment variable defines the root storage path on the local filesystem (e.g. `BUCKET="./uploads"` or `/var/storage`).
- Files are grouped into `public/` (publicly accessible) or `private/` (authentication-required) subdirectories.

## Reusable Storage & Upload Services
- `StorageService` (`src/storage/services/storage.service.ts`):
  - Filesystem engine for atomic writing (`saveBuffer`), reading (`getReadStream`), existence checks (`fileExists`), and deletion (`delete`).
  - **Path Traversal Shield**: `resolveSafePath` ensures target paths strictly reside within the `BUCKET` root directory.
- `UploadService` (`src/storage/services/upload.service.ts`):
  - Injected across domain modules to handle file uploads with custom subpaths (e.g., `destinationPath: "users/${userId}/avatar"`).
  - Generates safe UUID-prefixed filenames: `${randomUUID()}-${sanitizedBaseName}.${ext}`.
  - `uploadFile(options)`: General file upload with MIME whitelist and size limits (default 25 MB).
  - `uploadImage(options)`: Strict image upload enforcing image MIME types (`jpeg`, `png`, `webp`, `gif`, `svg`, `avif`) and default 5 MB limit.

## Global Excel Export Subsystem
- `ExcelService` (`src/excel/excel.service.ts`):
  - Global module supporting both GraphQL mutation (`exportToExcel`) and REST endpoint (`POST /api/export/excel`).
  - **Single Worksheet Chunking**: Iteratively queries large database models in chunks of 1,000 (`take: 1000, skip: offset`) and streams all rows into a single unified worksheet.
  - **Direct Tabular Export**: Ingests raw `dataJson` with auto-inference for headers and keys when not provided.
  - **Corporate Excel Styling**:
    - Header: `#1E293B` background, bold white Calibri 11pt, 28pt height, thin borders.
    - Data Cells: Calibri 10pt `#334155`, 20pt height, `#E2E8F0` borders, auto right-align for numbers.
    - Auto Column Width: Dynamically calculated based on content length (bounded between 12 and 50 chars).
  - **Bucket Saving**: Directly writes generated workbook buffer via `StorageService.saveBuffer("exports/excel", ...)` and returns `{ success, filename, filePath, downloadUrl, totalRows, fileSizeBytes, userErrors }`.

## Security & Defense Invariants
- **Path Traversal Guard**: Always validate that `targetPath.startsWith(bucketRoot + path.sep)`.
- **Blocked Extensions**: Strictly forbid uploading executable or script extensions (`.exe`, `.bat`, `.cmd`, `.sh`, `.php`, `.js`, `.ts`, `.html`, `.htm`, `.bin`, `.msi`).
- **Delivery Headers & MIME Types**: When serving assets via `/api/storage/*`:
  - Set `X-Content-Type-Options: nosniff`.
  - Set `Content-Disposition: inline` for previewable media and `attachment` for other files (e.g., `.xlsx`, `.zip`, `.csv`).
  - Include `.xlsx` and `.xls` in `MIME_MAP` to ensure correct spreadsheet downloads.
- **Audit Trail**: REST upload endpoints must record `userId`, `ipAddress`, and `userAgent` via `AuditTrailService.log()`.
