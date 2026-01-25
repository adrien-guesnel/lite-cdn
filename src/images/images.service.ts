import { existsSync, unlink } from "node:fs";
import * as path from "node:path";

import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as sharp from "sharp";

@Injectable()
export class ImagesService {
  private readonly ALLOWED_FORMATS = [
    "jpeg",
    "png",
    "webp",
    "gif",
    "avif",
    "tiff",
    "svg",
  ];
  private readonly publicImagesDir = path.resolve("public/images");

  constructor(
    private configService: ConfigService,
    private logger: Logger
  ) {}

  SERVICE: string = ImagesService.name;

  /**
   * Validate and sanitize filename to prevent path traversal
   */
  private validateFilename(filename: string): void {
    // Reject if filename contains path traversal patterns
    if (
      filename.includes("..") ||
      filename.includes("/") ||
      filename.includes("\\")
    ) {
      throw new BadRequestException(
        "Invalid filename: path traversal detected"
      );
    }

    // Reject if filename is empty or too long
    if (!filename || filename.length > 255) {
      throw new BadRequestException(
        "Invalid filename: must be between 1 and 255 characters"
      );
    }

    // Only allow alphanumeric, hyphens, underscores, and dots
    if (!/^[a-zA-Z0-9._-]+$/.test(filename)) {
      throw new BadRequestException(
        "Invalid filename: only alphanumeric, dots, hyphens and underscores allowed"
      );
    }
  }

  /**
   * Ensure filepath is within public/images directory (security check)
   */
  private securePath(filepath: string): void {
    const resolved = path.resolve(filepath);
    if (!resolved.startsWith(this.publicImagesDir)) {
      throw new BadRequestException("Invalid file path");
    }
  }

  getFilepath(filename: string): string {
    this.validateFilename(filename);
    const filepath = path.resolve(`public/images/${filename}`);
    this.securePath(filepath);
    return filepath;
  }

  async getImageMetadata(filepath: string) {
    const image = await sharp(filepath);
    const metadata = await image.metadata();

    this.logger.debug(
      `Image metadata: format=${metadata.format}, size=${metadata.width}x${metadata.height}`,
      this.SERVICE
    );

    return metadata;
  }

  isFileExists(filepath: string): boolean {
    const isExists = existsSync(filepath);
    this.logger.debug(
      `File ${path.basename(filepath)} exists: ${isExists}`,
      this.SERVICE
    );
    return isExists;
  }

  async getResizedImage(
    filepath: string,
    width?: unknown,
    height?: unknown
  ): Promise<Buffer> {
    const startTime = Date.now();
    const buffer = await sharp(filepath)
      .resize(Number(height) || null, Number(width) || null, {
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

  async saveImage(imgData: Buffer | string, filepath: string): Promise<string> {
    const maxFileSize = this.configService.get<number>("maxFileSize");
    const startTime = Date.now();

    try {
      // Validate file size if it's a buffer
      if (Buffer.isBuffer(imgData) && imgData.length > maxFileSize) {
        throw new BadRequestException(
          `File size exceeds maximum allowed size of ${maxFileSize / 1024 / 1024}MB`
        );
      }

      const image = await sharp(imgData);
      const metadata = await image.metadata();

      // Validate image format
      if (!this.ALLOWED_FORMATS.includes(metadata.format)) {
        throw new BadRequestException(
          `Unsupported image format: ${metadata.format}. Allowed formats: ${this.ALLOWED_FORMATS.join(", ")}`
        );
      }

      const maxWidth = this.configService.get<number>("saveMaxWidth");
      const maxHeight = this.configService.get<number>("saveMaxHeight");

      await image
        .resize(maxWidth, maxHeight, {
          withoutEnlargement: metadata.format !== "svg",
          fit: "inside",
        })
        .toFormat("webp")
        .toFile(filepath);

      const duration = Date.now() - startTime;
      this.logger.log(
        `Image saved successfully: ${path.basename(filepath)} (${duration}ms, original format: ${metadata.format})`,
        this.SERVICE
      );

      return "webp";
    } catch (error) {
      // Clean up partial file if it was created
      if (this.isFileExists(filepath)) {
        try {
          await this.deleteImage(filepath);
          this.logger.warn(
            `Cleaned up partial file after save error: ${path.basename(filepath)}`,
            this.SERVICE
          );
        } catch (cleanupError) {
          this.logger.error(
            `Failed to clean up partial file: ${cleanupError.message}`,
            this.SERVICE
          );
        }
      }

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

  /**
   * Resolve filepath trying multiple patterns for backward compatibility
   * - First try the filename as-is
   * - If not found and has extension, try without extension
   * - If not found and no extension, try with .webp
   */
  resolveFilepath(filename: string): string | null {
    const startTime = Date.now();

    try {
      this.validateFilename(filename);
    } catch (_error) {
      this.logger.warn(
        `Invalid filename in resolveFilepath: ${filename}`,
        this.SERVICE
      );
      return null;
    }

    // First try the filename as-is
    let filepath = this.getFilepath(filename);
    if (this.isFileExists(filepath)) {
      const duration = Date.now() - startTime;
      this.logger.debug(
        `Resolved filename '${filename}' as-is (${duration}ms)`,
        this.SERVICE
      );
      return filepath;
    }

    // If not found and filename has an extension, try without extension
    const lastDotIndex = filename.lastIndexOf(".");
    if (lastDotIndex > 0) {
      const filenameWithoutExt = filename.substring(0, lastDotIndex);
      filepath = this.getFilepath(filenameWithoutExt);
      if (this.isFileExists(filepath)) {
        const duration = Date.now() - startTime;
        this.logger.debug(
          `Resolved filename '${filename}' without extension (${duration}ms)`,
          this.SERVICE
        );
        return filepath;
      }
    }

    // If not found and filename doesn't have extension, try with .webp
    filepath = this.getFilepath(`${filename}.webp`);
    if (this.isFileExists(filepath)) {
      const duration = Date.now() - startTime;
      this.logger.debug(
        `Resolved filename '${filename}' with .webp extension (${duration}ms)`,
        this.SERVICE
      );
      return filepath;
    }

    const duration = Date.now() - startTime;
    this.logger.warn(
      `Could not resolve filename '${filename}' (${duration}ms)`,
      this.SERVICE
    );
    return null;
  }

  verifyKey(key: string): void {
    const API_SECRET = this.configService.get<string>("API_SECRET");

    if (!API_SECRET) {
      this.logger.error("API_SECRET not configured", this.SERVICE);
      throw new Error("Server configuration error");
    }

    if (key !== API_SECRET) {
      this.logger.warn(
        `Unauthorized access attempt with invalid key`,
        this.SERVICE
      );
      throw new BadRequestException("Invalid API key");
    }
  }
}
