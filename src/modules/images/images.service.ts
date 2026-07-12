import { randomUUID } from "node:crypto";
import { createReadStream, existsSync, unlink } from "node:fs";
import * as path from "node:path";

import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  StreamableFile,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import sharp, { type FormatEnum } from "sharp";

interface ImageResponse {
  file: StreamableFile;
  mime: string;
}

@Injectable()
export class ImagesService {
  private readonly allowedFormats: string[];
  private readonly publicImagesDir = "public/images";
  private readonly maxImagePixels: number;
  private readonly maxFileSize: number;
  private readonly saveMaxWidth: number;
  private readonly saveMaxHeight: number;
  private readonly SERVICE = ImagesService.name;

  constructor(
    private configService: ConfigService,
    private logger: Logger
  ) {
    const allowSvgUploads = this.configService.get<boolean>(
      "allowSvgUploads",
      false
    );
    this.allowedFormats = ["jpeg", "png", "webp", "gif", "avif", "tiff"];

    if (allowSvgUploads) {
      this.allowedFormats.push("svg");
    }

    this.maxImagePixels = Math.max(
      1,
      this.configService.get<number>("maxImagePixels", 25_000_000)
    );

    const maxFileSize = this.configService.get<number>("maxFileSize");
    if (!maxFileSize || maxFileSize <= 0) {
      throw new InternalServerErrorException(
        "maxFileSize must be configured and greater than 0"
      );
    }
    this.maxFileSize = maxFileSize;

    this.saveMaxWidth =
      this.configService.get<number>("saveMaxWidth") || undefined;
    this.saveMaxHeight =
      this.configService.get<number>("saveMaxHeight") || undefined;
  }

  parseDimension(
    value: string | number | undefined,
    name: "w" | "h",
    max?: number
  ): number | undefined {
    if (value === undefined) {
      return undefined;
    }

    const parsed = Number(value);

    if (!Number.isFinite(parsed) || parsed <= 0) {
      throw new BadRequestException(
        `Invalid ${name} parameter: must be a positive number`
      );
    }

    if (max !== undefined && parsed > max) {
      throw new BadRequestException(
        `Invalid ${name} parameter: must be less than or equal to ${max}`
      );
    }

    return Math.floor(parsed);
  }

  formatToMime(formatOrExt?: string): string {
    if (!formatOrExt) {
      return "application/octet-stream";
    }

    const map: Record<string, string> = {
      jpeg: "image/jpeg",
      jpg: "image/jpeg",
      png: "image/png",
      webp: "image/webp",
      gif: "image/gif",
      avif: "image/avif",
      tiff: "image/tiff",
      svg: "image/svg+xml",
    };

    const v = formatOrExt.toLowerCase();
    if (map[v]) {
      return map[v];
    }

    // handle extension like .webp
    const ext = v.startsWith(".") ? v.slice(1) : v;
    if (map[ext]) {
      return map[ext];
    }

    // fallback to generic image/*
    return `image/${ext}`;
  }

  isFileExists(filepath: string): boolean {
    const isExists = existsSync(filepath);
    this.logger.debug(
      `File ${path.basename(filepath)} exists: ${isExists}`,
      this.SERVICE
    );
    return isExists;
  }

  async getImageMetadata(filepath: string) {
    const image = await sharp(filepath, {
      limitInputPixels: this.maxImagePixels,
    });
    const metadata = await image.metadata();

    this.logger.debug(
      `Image metadata: format=${metadata.format}, size=${metadata.width}x${metadata.height}`,
      this.SERVICE
    );

    return metadata;
  }

  async getResizedImage(
    filepath: string,
    width?: number,
    height?: number
  ): Promise<Buffer> {
    const startTime = Date.now();
    const buffer = await sharp(filepath, {
      limitInputPixels: this.maxImagePixels,
    })
      .resize(Number(width) || null, Number(height) || null, {
        withoutEnlargement: true,
        fit: "inside",
      })
      .toBuffer();

    const duration = Date.now() - startTime;
    this.logger.debug(
      `Resize operation completed in ${duration}ms (${width}x${height})`,
      this.SERVICE
    );

    return buffer;
  }

  async saveImage(
    imgData: Buffer | string,
    filepath: string,
    toFormat: keyof FormatEnum = "webp"
  ): Promise<string> {
    const startTime = Date.now();

    try {
      const payloadSize = this.getPayloadSizeBytes(imgData);

      if (payloadSize > this.maxFileSize) {
        throw new BadRequestException(
          `File size exceeds maximum allowed size of ${this.maxFileSize / 1024 / 1024}MB`
        );
      }

      const image = sharp(imgData, {
        limitInputPixels: this.maxImagePixels,
      });
      const metadata = await image.metadata();

      if (!metadata.format) {
        throw new BadRequestException("Unsupported image format");
      }

      if (!this.allowedFormats.includes(metadata.format)) {
        throw new BadRequestException(
          `Unsupported image format: ${metadata.format}. Allowed formats: ${this.allowedFormats.join(", ")}`
        );
      }

      const filepathWithExt = `${filepath}.${toFormat}`;

      await image
        .resize(this.saveMaxWidth, this.saveMaxHeight, {
          withoutEnlargement: metadata.format !== "svg",
          fit: "inside",
        })
        .toFormat(toFormat)
        .toFile(filepathWithExt);

      const duration = Date.now() - startTime;
      this.logger.log(
        `Image saved successfully: ${path.basename(filepathWithExt)} (${duration}ms, original format: ${metadata.format})`,
        this.SERVICE
      );

      return filepathWithExt;
    } catch (error) {
      this.cleanupPartialFile(filepath, toFormat);

      this.logger.error(error.message);

      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new BadRequestException(
        `Error processing image: ${error.message || "Unknown error"}`
      );
    }
  }

  deleteImage(filepath: string): Promise<boolean> {
    const startTime = Date.now();
    return new Promise((resolve, reject) => {
      unlink(filepath, (err) => {
        if (err) {
          this.logger.error(
            `Failed to delete image ${path.basename(filepath)}: ${err.message}`,
            this.SERVICE
          );
          reject(err);
        } else {
          const duration = Date.now() - startTime;
          this.logger.log(
            `Image deleted: ${path.basename(filepath)} (${duration}ms)`,
            this.SERVICE
          );
          resolve(true);
        }
      });
    });
  }

  resolveFilepath(filename: string): string | null {
    const startTime = Date.now();

    // Try patterns in order: as-is, without extension, with .webp
    const patterns = [
      { filename, description: "as-is" },
      ...(filename.includes(".") && filename.lastIndexOf(".") > 0
        ? [
            {
              filename: filename.substring(0, filename.lastIndexOf(".")),
              description: "without extension",
            },
          ]
        : []),
      { filename: `${filename}.webp`, description: "with .webp extension" },
    ];

    for (const pattern of patterns) {
      const filepath = path.resolve(this.publicImagesDir, pattern.filename);

      if (this.isFileExists(filepath)) {
        const duration = Date.now() - startTime;
        this.logger.debug(
          `Resolved filename '${filename}' ${pattern.description} (${duration}ms)`,
          this.SERVICE
        );
        return filepath;
      }
    }

    const duration = Date.now() - startTime;
    this.logger.warn(
      `Could not resolve filename '${filename}' (${duration}ms)`,
      this.SERVICE
    );
    return null;
  }

  getFilepath(filename: string): string {
    return path.resolve(this.publicImagesDir, filename);
  }

  async get(
    filename: string,
    height?: string,
    width?: string
  ): Promise<ImageResponse> {
    const filepath = this.resolveFilepath(filename);

    if (!filepath) {
      this.logger.warn(`Image ${filename} not found`);
      throw new NotFoundException("File not found");
    }

    const parsedHeight = this.parseDimension(height, "h", this.saveMaxHeight);
    const parsedWidth = this.parseDimension(width, "w", this.saveMaxWidth);

    const metadata = await this.getImageMetadata(filepath);
    const mime = this.formatToMime(
      metadata.format ?? path.extname(filepath).replace(".", "")
    );

    if (!parsedHeight && !parsedWidth) {
      const fileStream = createReadStream(filepath);
      this.logger.log(`Deliver image ${filename}`);
      const file = new StreamableFile(fileStream, {
        type: mime,
        disposition: `inline; filename="${path.basename(filename)}"`,
      });
      return { file, mime };
    }

    const buffer = await this.getResizedImage(
      filepath,
      parsedWidth,
      parsedHeight
    );
    this.logger.log(
      `Deliver resized image ${filename} (${parsedWidth}x${parsedHeight})`
    );
    const file = new StreamableFile(buffer, {
      type: mime,
      disposition: `inline; filename="${path.basename(filename)}"`,
    });
    return { file, mime };
  }

  async add(
    imgData: Buffer | string
  ): Promise<{ status: string; filename: string }> {
    if (!imgData) {
      this.logger.warn("Upload attempt with no image data");
      throw new BadRequestException("No image data provided");
    }

    const payloadSize = this.getPayloadSizeBytes(imgData);
    if (payloadSize > this.maxFileSize) {
      this.logger.warn(
        `Uploaded file exceeds max size (${payloadSize} > ${this.maxFileSize})`
      );
      throw new BadRequestException(
        `File size exceeds maximum allowed size of ${this.maxFileSize / 1024 / 1024}MB`
      );
    }

    const filename = this.generateFilename();
    const filepath = this.getFilepath(filename);

    if (this.isFileExists(filepath)) {
      this.logger.warn(`Image ${filename} already exists (UUID collision)`);
      throw new ConflictException("File already exists (please retry)");
    }

    const filepathWithExt = await this.saveImage(imgData, filepath);
    const filenameWithExt = path.basename(filepathWithExt);

    this.logger.log(`Image uploaded successfully: ${filenameWithExt}`);

    return {
      status: "ok",
      filename: filenameWithExt,
    };
  }

  async delete(filename: string): Promise<{ status: string }> {
    const filepath = this.resolveFilepath(filename);

    if (!filepath) {
      this.logger.warn(`Delete attempt for non-existent image: ${filename}`);
      throw new NotFoundException("File not found");
    }

    await this.deleteImage(filepath);
    this.logger.log(`Image deleted: ${filename}`);

    return { status: "ok" };
  }

  private generateFilename(): string {
    return randomUUID();
  }

  private getPayloadSizeBytes(imgData: Buffer | string): number {
    if (Buffer.isBuffer(imgData)) {
      return imgData.length;
    }

    const normalized = imgData.startsWith("data:")
      ? (imgData.split(",")[1] ?? "")
      : imgData;
    const isBase64 = /^[A-Za-z0-9+/]+=*$/.test(normalized);
    const encoding: BufferEncoding = isBase64 ? "base64" : "utf8";

    return Buffer.byteLength(normalized, encoding);
  }

  private cleanupPartialFile(
    filepath: string,
    toFormat: keyof FormatEnum
  ): void {
    const filepathWithExt = `${filepath}.${toFormat}`;
    if (this.isFileExists(filepathWithExt)) {
      this.deleteImage(filepathWithExt)
        .then(() => {
          this.logger.warn(
            `Cleaned up partial file: ${path.basename(filepathWithExt)}`,
            this.SERVICE
          );
        })
        .catch((error) => {
          this.logger.error(
            `Failed to clean up partial file: ${error.message}`,
            this.SERVICE
          );
        });
    }
  }
}
