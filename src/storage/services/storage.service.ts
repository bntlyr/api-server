import { Injectable, BadRequestException, NotFoundException } from "@nestjs/common";
import * as fs from "node:fs";
import * as path from "node:path";
import { DEFAULT_BUCKET_DIR } from "../constants/storage.constants.js";

@Injectable()
export class StorageService {
  /**
   * Resolves and returns the configured root directory for file storage.
   * Priority: overrideBucket -> process.env.BUCKET -> ./uploads
   */
  getBucketRoot(overrideBucket?: string): string {
    const rawBucket = overrideBucket || process.env.BUCKET || DEFAULT_BUCKET_DIR;
    return path.resolve(rawBucket);
  }

  /**
   * Sanitizes subPath and filename, and ensures the target path is strictly
   * contained within the bucket root directory (preventing directory traversal).
   */
  resolveSafePath(subPath = "", filename = "", overrideBucket?: string): string {
    const bucketRoot = this.getBucketRoot(overrideBucket);

    // If filename is provided, extract its basename to prevent slash injection in filename
    const cleanFilename = filename ? path.basename(filename) : "";

    const targetPath = path.resolve(bucketRoot, subPath, cleanFilename);

    // Security Check: Target path must start with bucket root path
    if (
      !targetPath.startsWith(bucketRoot + path.sep) &&
      targetPath !== bucketRoot
    ) {
      throw new BadRequestException("Security Violation: Invalid path traversal detected.");
    }

    return targetPath;
  }

  /**
   * Ensures the destination directory exists and writes the buffer to disk.
   */
  async saveBuffer(
    destinationSubPath: string,
    filename: string,
    buffer: Buffer,
    overrideBucket?: string,
  ): Promise<{ absolutePath: string; relativePath: string }> {
    const bucketRoot = this.getBucketRoot(overrideBucket);
    const absoluteFilePath = this.resolveSafePath(destinationSubPath, filename, overrideBucket);
    const destinationDir = path.dirname(absoluteFilePath);

    // Ensure the target directory exists
    await fs.promises.mkdir(destinationDir, { recursive: true });

    // Write file to disk
    await fs.promises.writeFile(absoluteFilePath, buffer);

    const relativePath = path.relative(bucketRoot, absoluteFilePath).split(path.sep).join("/");

    return {
      absolutePath: absoluteFilePath,
      relativePath,
    };
  }

  /**
   * Checks if a file exists at the given relative path.
   */
  async fileExists(relativePath: string, overrideBucket?: string): Promise<boolean> {
    try {
      const absolutePath = this.resolveSafePath(relativePath, "", overrideBucket);
      await fs.promises.access(absolutePath, fs.constants.F_OK);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Deletes a file from the bucket directory.
   */
  async delete(relativePath: string, overrideBucket?: string): Promise<boolean> {
    const absolutePath = this.resolveSafePath(relativePath, "", overrideBucket);
    try {
      await fs.promises.unlink(absolutePath);
      return true;
    } catch (err: any) {
      if (err.code === "ENOENT") {
        return false;
      }
      throw err;
    }
  }

  /**
   * Returns a readable stream and file stats for streaming to clients.
   */
  async getReadStream(
    relativePath: string,
    overrideBucket?: string,
  ): Promise<{ stream: fs.ReadStream; stat: fs.Stats; absolutePath: string }> {
    const absolutePath = this.resolveSafePath(relativePath, "", overrideBucket);

    try {
      const stat = await fs.promises.stat(absolutePath);
      if (!stat.isFile()) {
        throw new NotFoundException("Requested resource is not a file");
      }
      const stream = fs.createReadStream(absolutePath);
      return { stream, stat, absolutePath };
    } catch (err: any) {
      if (err instanceof NotFoundException) throw err;
      if (err.code === "ENOENT") {
        throw new NotFoundException("File not found");
      }
      throw err;
    }
  }
}
