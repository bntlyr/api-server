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
import { JwtAuthGuard, Public } from "../../auth/guards/jwt-auth.guard.js";

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
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".xls": "application/vnd.ms-excel",
  ".mp4": "video/mp4",
  ".mp3": "audio/mpeg",
};

@Controller(["api/storage", "api/bucket-storage"])
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  @Public()
  @Get("public/{*path}")
  async servePublicFile(@Req() req: Request, @Res() res: Response) {
    const rawPath = this.extractWildcardPath(req);
    const relativePath = `public/${rawPath}`;
    await this.streamFile(relativePath, res);
  }

  @Get("private/{*path}")
  @UseGuards(JwtAuthGuard)
  async servePrivateFile(@Req() req: Request, @Res() res: Response) {
    const rawPath = this.extractWildcardPath(req);
    const relativePath = `private/${rawPath}`;
    await this.streamFile(relativePath, res);
  }

  private extractWildcardPath(req: Request): string {
    const param =
      (req.params as any).path ??
      (req.params as any)[0] ??
      (req.params as any)["*"] ??
      "";
    const joined = Array.isArray(param) ? param.join("/") : String(param);
    return joined.replace(/^\/+/, "");
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
    } catch {
      res.status(404).json({
        statusCode: 404,
        message: "File not found",
        error: "Not Found",
      });
    }
  }
}
