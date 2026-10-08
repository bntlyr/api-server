import { Injectable, BadRequestException } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import * as path from "node:path";
import { StorageService } from "./storage.service.js";
import type {
  UploadOptions,
  UploadImageOptions,
  UploadResult,
  UploadFileInput,
} from "../interfaces/storage.interface.js";
import {
  DEFAULT_MAX_FILE_SIZE_BYTES,
  DEFAULT_MAX_IMAGE_SIZE_BYTES,
  DEFAULT_ALLOWED_IMAGE_MIME_TYPES,
  BLOCKED_EXTENSIONS,
} from "../constants/storage.constants.js";

@Injectable()
export class UploadService {
  constructor(private readonly storageService: StorageService) {}

  /**
   * Universal file upload method.
   */
  async uploadFile(options: UploadOptions): Promise<UploadResult> {
    const {
      file,
      destinationPath = "files",
      bucket,
      filename: customFilename,
      allowedMimeTypes,
      maxSizeBytes = DEFAULT_MAX_FILE_SIZE_BYTES,
      isPublic = true,
    } = options;

    if (!file) {
      throw new BadRequestException("No file provided for upload");
    }

    const { buffer, originalname, mimetype, size } = this.extractFileInfo(file);

    // 1. Size Validation
    if (size > maxSizeBytes) {
      const maxMb = (maxSizeBytes / (1024 * 1024)).toFixed(1);
      throw new BadRequestException(`File size exceeds maximum allowed limit of ${maxMb}MB`);
    }

    // 2. Extension and MIME Validation
    const ext = path.extname(originalname).toLowerCase();
    if (BLOCKED_EXTENSIONS.has(ext)) {
      throw new BadRequestException(`Uploading files with extension '${ext}' is forbidden`);
    }

    if (allowedMimeTypes && allowedMimeTypes.length > 0) {
      if (!allowedMimeTypes.includes(mimetype.toLowerCase())) {
        throw new BadRequestException(
          `Invalid file type '${mimetype}'. Allowed types: ${allowedMimeTypes.join(", ")}`,
        );
      }
    }

    // 3. Safe Filename Generation
    const sanitizedFilename = customFilename || this.generateSafeFilename(originalname);

    // 4. Resolve folder prefix (group into public/ or private/ by default if not specified)
    const visibilityPrefix = isPublic ? "public" : "private";
    const fullDestinationPath = destinationPath.startsWith("public") || destinationPath.startsWith("private")
      ? destinationPath
      : `${visibilityPrefix}/${destinationPath}`;

    // 5. Save to Storage
    const { absolutePath, relativePath } = await this.storageService.saveBuffer(
      fullDestinationPath,
      sanitizedFilename,
      buffer,
      bucket,
    );

    // 6. Build file URL
    const url = this.buildFileUrl(relativePath);

    return {
      filename: sanitizedFilename,
      relativePath,
      absolutePath,
      url,
      originalName: originalname,
      mimeType: mimetype,
      size,
      isPublic,
      uploadedAt: new Date(),
    };
  }

  /**
   * Specialized image upload method with image-specific constraints.
   */
  async uploadImage(options: UploadImageOptions): Promise<UploadResult> {
    const imageAllowedTypes = options.allowedMimeTypes ?? DEFAULT_ALLOWED_IMAGE_MIME_TYPES;
    const maxSizeBytes = options.maxSizeBytes ?? DEFAULT_MAX_IMAGE_SIZE_BYTES;
    const destinationPath = options.destinationPath ?? "images";

    return this.uploadFile({
      ...options,
      destinationPath,
      allowedMimeTypes: imageAllowedTypes,
      maxSizeBytes,
    });
  }

  /**
   * Deletes a file by relative path.
   */
  async deleteFile(relativePath: string, bucketOverride?: string): Promise<boolean> {
    return this.storageService.delete(relativePath, bucketOverride);
  }

  /**
   * Generates a safe, collision-resistant filename using UUID and sanitized original name.
   */
  generateSafeFilename(originalname: string): string {
    const ext = path.extname(originalname).toLowerCase();
    const baseName = path
      .basename(originalname, ext)
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 50);

    const uuid = randomUUID();
    return `${uuid}-${baseName || "file"}${ext}`;
  }

  /**
   * Builds the accessible HTTP URL for a given relative path.
   */
  buildFileUrl(relativePath: string): string {
    const baseUrl =
      process.env.STORAGE_BASE_URL?.replace(/\/+$/, "") || "http://localhost:3000/api/storage";
    const cleanRelative = relativePath.replace(/^\/+/, "");
    return `${baseUrl}/${cleanRelative}`;
  }

  private extractFileInfo(file: Express.Multer.File | UploadFileInput) {
    if ("buffer" in file && file.buffer) {
      return {
        buffer: file.buffer,
        originalname: file.originalname || "unnamed",
        mimetype: file.mimetype || "application/octet-stream",
        size: file.size ?? file.buffer.length,
      };
    }
    throw new BadRequestException("Invalid file format received");
  }
}
