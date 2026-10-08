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

## Security & Defense Invariants
- **Path Traversal Guard**: Always validate that `targetPath.startsWith(bucketRoot + path.sep)`.
- **Blocked Extensions**: Strictly forbid uploading executable or script extensions (`.exe`, `.bat`, `.cmd`, `.sh`, `.php`, `.js`, `.ts`, `.html`, `.htm`, `.bin`, `.msi`).
- **Delivery Headers**: When serving assets via `/api/storage/*`:
  - Set `X-Content-Type-Options: nosniff`.
  - Set `Content-Disposition: inline` for previewable media and `attachment` for other files.
- **Audit Trail**: REST upload endpoints must record `userId`, `ipAddress`, and `userAgent` via `AuditTrailService.log()`.
