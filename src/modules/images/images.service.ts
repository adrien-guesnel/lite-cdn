import { existsSync, unlink } from "node:fs";
import * as path from "node:path";

import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as sharp from "sharp";

@Injectable()
export class ImagesService {
  private readonly allowedFormats: string[];
  private readonly publicImagesDir = path.resolve("public/images");
  private readonly maxImagePixels: number;

  constructor(
    private configService: ConfigService,
    private logger: Logger
  ) {
    const allowSvgUploads =
      this.configService.get<boolean>("allowSvgUploads") ?? false;
    this.allowedFormats = ["jpeg", "png", "webp", "gif", "avif", "tiff"];
    if (allowSvgUploads) {
      this.allowedFormats.push("svg");
    }

    const maxImagePixelsConfig =
      this.configService.get<number>("maxImagePixels");
    this.maxImagePixels = Math.max(1, maxImagePixelsConfig ?? 25_000_000);
  }

  SERVICE: string = ImagesService.name;

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
    const filepath = path.resolve(`public/images/${filename}`);
    this.securePath(filepath);
    return filepath;
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

  async saveImage(imgData: Buffer | string, filepath: string): Promise<string> {
    const maxFileSize = this.configService.get<number>("maxFileSize");
    const startTime = Date.now();

    try {
      if (!maxFileSize || maxFileSize <= 0) {
        throw new InternalServerErrorException("Server configuration error");
      }

      const payloadSize = this.getPayloadSizeBytes(imgData);

      if (payloadSize > maxFileSize) {
        throw new BadRequestException(
          `File size exceeds maximum allowed size of ${maxFileSize / 1024 / 1024}MB`
        );
      }

      const image = await sharp(imgData, {
        limitInputPixels: this.maxImagePixels,
      });
      const metadata = await image.metadata();

      if (!metadata.format) {
        throw new BadRequestException("Unsupported image format");
      }

      // Validate image format
      if (!this.allowedFormats.includes(metadata.format)) {
        throw new BadRequestException(
          `Unsupported image format: ${metadata.format}. Allowed formats: ${this.allowedFormats.join(", ")}`
        );
      }

      const maxWidth = this.configService.get<number>("saveMaxWidth");
      const maxHeight = this.configService.get<number>("saveMaxHeight");

      const filepathWithExt = `${filepath}.webp`;

      await image
        .resize(maxWidth, maxHeight, {
          withoutEnlargement: metadata.format !== "svg",
          fit: "inside",
        })
        .toFormat("webp")
        .toFile(filepathWithExt);

      const duration = Date.now() - startTime;
      this.logger.log(
        `Image saved successfully: ${path.basename(filepathWithExt)} (${duration}ms, original format: ${metadata.format})`,
        this.SERVICE
      );

      return filepathWithExt;
    } catch (error) {
      // Clean up partial file if it was created
      const filepathWithExt = `${filepath}.webp`;
      if (this.isFileExists(filepathWithExt)) {
        try {
          await this.deleteImage(filepathWithExt);
          this.logger.warn(
            `Cleaned up partial file after save error: ${path.basename(filepathWithExt)}`,
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
}
