export const DEFAULT_BUCKET_DIR = "uploads";

export const DEFAULT_MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB
export const DEFAULT_MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export const DEFAULT_ALLOWED_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
  "image/avif",
];

export const BLOCKED_EXTENSIONS = new Set([
  ".exe",
  ".bat",
  ".cmd",
  ".sh",
  ".bash",
  ".php",
  ".phtml",
  ".php3",
  ".php4",
  ".php5",
  ".phps",
  ".js",
  ".mjs",
  ".cjs",
  ".ts",
  ".html",
  ".htm",
  ".xhtml",
  ".dll",
  ".so",
  ".bin",
  ".msi",
  ".vbs",
  ".scr",
  ".jar",
]);
