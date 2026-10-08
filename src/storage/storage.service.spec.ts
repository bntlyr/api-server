import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import { StorageService } from "./services/storage.service.js";

describe("StorageService", () => {
  let service: StorageService;
  let tempDir: string;

  beforeEach(async () => {
    service = new StorageService();
    tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "storage-test-"));
  });

  afterEach(async () => {
    try {
      await fs.promises.rm(tempDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  });

  describe("resolveSafePath", () => {
    it("should resolve valid subfolder and filename inside bucket", () => {
      const resolved = service.resolveSafePath("users/avatars", "avatar.png", tempDir);
      expect(resolved).toBe(path.join(tempDir, "users/avatars", "avatar.png"));
    });

    it("should throw BadRequestException on path traversal attempts", () => {
      expect(() => {
        service.resolveSafePath("../../etc", "passwd", tempDir);
      }).toThrow(BadRequestException);

      expect(() => {
        service.resolveSafePath("users/../../../etc", "shadow", tempDir);
      }).toThrow(BadRequestException);
    });
  });

  describe("saveBuffer and getReadStream", () => {
    it("should write buffer to disk and create subdirectories", async () => {
      const buffer = Buffer.from("test file content");
      const result = await service.saveBuffer("modules/user", "test.txt", buffer, tempDir);

      expect(result.relativePath).toBe("modules/user/test.txt");
      expect(fs.existsSync(result.absolutePath)).toBe(true);

      const exists = await service.fileExists(result.relativePath, tempDir);
      expect(exists).toBe(true);

      const { stream, stat } = await service.getReadStream(result.relativePath, tempDir);
      expect(stat.size).toBe(buffer.length);
      stream.destroy();
    });

    it("should throw NotFoundException for non-existent files", async () => {
      await expect(service.getReadStream("non-existent.txt", tempDir)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("delete", () => {
    it("should delete existing file", async () => {
      const buffer = Buffer.from("delete me");
      const result = await service.saveBuffer("temp", "delete.txt", buffer, tempDir);

      const deleted = await service.delete(result.relativePath, tempDir);
      expect(deleted).toBe(true);
      expect(await service.fileExists(result.relativePath, tempDir)).toBe(false);
    });

    it("should return false when deleting non-existent file", async () => {
      const deleted = await service.delete("unknown/file.txt", tempDir);
      expect(deleted).toBe(false);
    });
  });
});
