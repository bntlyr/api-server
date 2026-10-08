import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  Body,
  UseGuards,
  Req,
  BadRequestException,
} from "@nestjs/common";
import { FileInterceptor, FilesInterceptor } from "@nestjs/platform-express";
import type { Request } from "express";
import { UploadService } from "../services/upload.service.js";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard.js";
import { CurrentUser } from "../../auth/decorators/current-user.decorator.js";
import { AuditTrailService } from "../../auth/services/audit-trail.service.js";
import type { AuthenticatedUser } from "../../auth/interfaces/auth.interface.js";
import { UploadFileDto, UploadImageDto } from "../dto/upload.dto.js";
import type { UploadResult } from "../interfaces/storage.interface.js";

@Controller("api/upload")
@UseGuards(JwtAuthGuard)
export class UploadController {
  constructor(
    private readonly uploadService: UploadService,
    private readonly auditService: AuditTrailService,
  ) {}

  @Post("file")
  @UseInterceptors(FileInterceptor("file"))
  async uploadSingleFile(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: UploadFileDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ): Promise<UploadResult> {
    if (!file) {
      throw new BadRequestException("No file provided in form-data field 'file'");
    }

    const isPublic = body.isPublic === true || body.isPublic === "true";
    const destinationPath = body.folder || "files";

    const result = await this.uploadService.uploadFile({
      file,
      destinationPath,
      isPublic,
    });

    await this.auditService.log({
      userId: user.userId,
      action: "FILE_UPLOAD",
      method: "REST",
      tableName: "Storage",
      recordId: result.relativePath,
      description: `Uploaded file '${result.originalName}' to '${result.relativePath}'`,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"] || "unknown",
    });

    return result;
  }

  @Post("image")
  @UseInterceptors(FileInterceptor("file"))
  async uploadSingleImage(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: UploadImageDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ): Promise<UploadResult> {
    if (!file) {
      throw new BadRequestException("No image provided in form-data field 'file'");
    }

    const isPublic = body.isPublic === true || body.isPublic === "true";
    const destinationPath = body.folder || "images";

    const result = await this.uploadService.uploadImage({
      file,
      destinationPath,
      isPublic,
    });

    await this.auditService.log({
      userId: user.userId,
      action: "IMAGE_UPLOAD",
      method: "REST",
      tableName: "Storage",
      recordId: result.relativePath,
      description: `Uploaded image '${result.originalName}' to '${result.relativePath}'`,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"] || "unknown",
    });

    return result;
  }

  @Post("multiple")
  @UseInterceptors(FilesInterceptor("files", 10))
  async uploadMultipleFiles(
    @UploadedFiles() files: Express.Multer.File[],
    @Body() body: UploadFileDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ): Promise<UploadResult[]> {
    if (!files || files.length === 0) {
      throw new BadRequestException("No files provided in form-data field 'files'");
    }

    const isPublic = body.isPublic === true || body.isPublic === "true";
    const destinationPath = body.folder || "files";

    const results = await Promise.all(
      files.map((file) =>
        this.uploadService.uploadFile({
          file,
          destinationPath,
          isPublic,
        }),
      ),
    );

    await this.auditService.log({
      userId: user.userId,
      action: "MULTIPLE_FILES_UPLOAD",
      method: "REST",
      tableName: "Storage",
      recordId: results.map((r) => r.relativePath).join(","),
      description: `Uploaded ${results.length} files to folder '${destinationPath}'`,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"] || "unknown",
    });

    return results;
  }
}
