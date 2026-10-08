import "multer";

export interface UploadFileInput {
  buffer: Buffer;
  originalname?: string;
  mimetype?: string;
  size?: number;
}

export interface UploadOptions {
  file: Express.Multer.File | UploadFileInput;
  destinationPath?: string;
  bucket?: string;
  filename?: string;
  allowedMimeTypes?: string[];
  maxSizeBytes?: number;
  isPublic?: boolean;
}

export interface UploadImageOptions extends UploadOptions {
  maxSizeBytes?: number;
}

export interface UploadResult {
  filename: string;
  relativePath: string;
  absolutePath: string;
  url: string;
  originalName: string;
  mimeType: string;
  size: number;
  isPublic: boolean;
  uploadedAt: Date;
}
