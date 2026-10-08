import {
  Controller,
  Get,
  Req,
  Res,
  UseGuards,
  NotFoundException,
} from "@nestjs/common";
import type { Request, Response } from "express";
import * as path from "node:path";
import { StorageService } from "../services/storage.service.js";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard.js";

const MIME_MAP: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".avif": "image/avif",
  ".pdf": "application/pdf",
  ".txt": "text/plain",
  ".csv": "text/csv",
  ".json": "application/json",
  ".zip": "application/zip",
  ".mp4": "video/mp4",
  ".mp3": "audio/mpeg",
};

@Controller("api/storage")
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  @Get("public/{*path}")
  async servePublicFile(@Req() req: Request, @Res() res: Response) {
    const rawPath = (req.params as any).path || (req.params as any)[0] || (req.params as any)["*"] || "";
    const relativePath = `public/${rawPath}`;
    await this.streamFile(relativePath, res);
  }

  @Get("private/{*path}")
  @UseGuards(JwtAuthGuard)
  async servePrivateFile(@Req() req: Request, @Res() res: Response) {
    const rawPath = (req.params as any).path || (req.params as any)[0] || (req.params as any)["*"] || "";
    const relativePath = `private/${rawPath}`;
    await this.streamFile(relativePath, res);
  }

  private async streamFile(relativePath: string, res: Response) {
    try {
      const { stream, stat, absolutePath } = await this.storageService.getReadStream(relativePath);
      const ext = path.extname(absolutePath).toLowerCase();
      const contentType = MIME_MAP[ext] || "application/octet-stream";

      const isInline =
        contentType.startsWith("image/") ||
        contentType === "application/pdf" ||
        contentType.startsWith("text/");

      const dispositionType = isInline ? "inline" : "attachment";
      const basename = path.basename(absolutePath);

      res.setHeader("Content-Type", contentType);
      res.setHeader("Content-Length", stat.size);
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.setHeader("Content-Disposition", `${dispositionType}; filename="${basename}"`);
      res.setHeader("Cache-Control", "public, max-age=86400, immutable");

      stream.pipe(res);
    } catch (err: any) {
      if (err instanceof NotFoundException) {
        throw err;
      }
      throw new NotFoundException("File not found");
    }
  }
}
