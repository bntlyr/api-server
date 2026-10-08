import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { BadRequestException } from "@nestjs/common";
import { StorageService } from "./services/storage.service.js";
import { UploadService } from "./services/upload.service.js";

describe("UploadService", () => {
  let storageService: StorageService;
  let uploadService: UploadService;
  let tempDir: string;

  beforeEach(async () => {
    storageService = new StorageService();
    uploadService = new UploadService(storageService);
    tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "upload-test-"));
  });

  afterEach(async () => {
    try {
      await fs.promises.rm(tempDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  });

  describe("uploadFile", () => {
    it("should successfully upload a valid document", async () => {
      const buffer = Buffer.from("PDF file contents");
      const result = await uploadService.uploadFile({
        file: {
          buffer,
          originalname: "report.pdf",
          mimetype: "application/pdf",
          size: buffer.length,
        },
        destinationPath: "documents",
        bucket: tempDir,
        isPublic: false,
      });

      expect(result.originalName).toBe("report.pdf");
      expect(result.mimeType).toBe("application/pdf");
      expect(result.isPublic).toBe(false);
      expect(result.relativePath.startsWith("private/documents/")).toBe(true);
      expect(fs.existsSync(result.absolutePath)).toBe(true);
    });

    it("should reject blocked executable file extensions", async () => {
      const buffer = Buffer.from("echo evil");
      await expect(
        uploadService.uploadFile({
          file: {
            buffer,
            originalname: "malicious.sh",
            mimetype: "application/x-sh",
            size: buffer.length,
          },
          bucket: tempDir,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it("should reject file exceeding size limit", async () => {
      const buffer = Buffer.alloc(100);
      await expect(
        uploadService.uploadFile({
          file: {
            buffer,
            originalname: "large.pdf",
            mimetype: "application/pdf",
            size: 100,
          },
          maxSizeBytes: 50,
          bucket: tempDir,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("uploadImage", () => {
    it("should successfully upload a valid image", async () => {
      const buffer = Buffer.from("fake image bytes");
      const result = await uploadService.uploadImage({
        file: {
          buffer,
          originalname: "profile avatar.png",
          mimetype: "image/png",
          size: buffer.length,
        },
        destinationPath: "users/42/avatar",
        bucket: tempDir,
        isPublic: true,
      });

      expect(result.originalName).toBe("profile avatar.png");
      expect(result.mimeType).toBe("image/png");
      expect(result.isPublic).toBe(true);
      expect(result.relativePath.startsWith("public/users/42/avatar/")).toBe(true);
      expect(fs.existsSync(result.absolutePath)).toBe(true);
    });

    it("should reject non-image MIME types in uploadImage", async () => {
      const buffer = Buffer.from("plain text");
      await expect(
        uploadService.uploadImage({
          file: {
            buffer,
            originalname: "notes.txt",
            mimetype: "text/plain",
            size: buffer.length,
          },
          bucket: tempDir,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
