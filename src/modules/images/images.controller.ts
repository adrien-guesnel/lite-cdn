import { randomUUID } from "node:crypto";
import { createReadStream } from "node:fs";
import * as path from "node:path";

import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Delete,
  Get,
  Header,
  HttpException,
  HttpStatus,
  Logger,
  NotFoundException,
  Param,
  Post,
  Query,
  StreamableFile,
  UseGuards,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Throttle } from "@nestjs/throttler";

import { ImagesService } from "@src/modules/images/images.service";

import { ApiKeyGuard } from "../../guards/api-key.guard";
import { ValidateFilenamePipe } from "./pipes/validate-filename.pipe";

@Controller("img")
export class ImagesController {
  constructor(
    private readonly imagesServices: ImagesService,
    private logger: Logger,
    private readonly configService: ConfigService
  ) {}

  private parseDimension(
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

  private formatToMime(formatOrExt?: string): string {
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

  @Get(":filename")
  @Header("Cache-Control", "max-age=3600")
  async getImage(
    @Param("filename", ValidateFilenamePipe) filename: string,
    @Query("h") height?: string,
    @Query("w") width?: string
  ): Promise<StreamableFile> {
    const filepath = this.imagesServices.resolveFilepath(filename);

    if (!filepath) {
      this.logger.warn(`Image ${filename} not found`);
      throw new NotFoundException("File not found");
    }

    const maxHeight = this.configService.get<number>("saveMaxHeight");
    const maxWidth = this.configService.get<number>("saveMaxWidth");
    const parsedHeight = this.parseDimension(height, "h", maxHeight);
    const parsedWidth = this.parseDimension(width, "w", maxWidth);

    try {
      const metadata = await this.imagesServices.getImageMetadata(filepath);
      const mime = this.formatToMime(
        metadata.format ?? path.extname(filepath).replace(".", "")
      );

      if (!parsedHeight && !parsedWidth) {
        const file = createReadStream(filepath);
        this.logger.log(`Deliver image ${filename}`);
        return new StreamableFile(file, {
          type: mime,
          disposition: `inline; filename="${path.basename(filename)}"`,
        });
      }

      const buffer = await this.imagesServices.getResizedImage(
        filepath,
        parsedWidth,
        parsedHeight
      );
      this.logger.log(
        `Deliver resized image ${filename} (${parsedWidth}x${parsedHeight})`
      );
      return new StreamableFile(buffer, {
        type: mime,
        disposition: `inline; filename="${path.basename(filename)}"`,
      });
    } catch (error) {
      this.logger.error(`Error processing image ${filename}: ${error.message}`);
      throw new HttpException(
        "Error processing image",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post()
  @UseGuards(ApiKeyGuard)
  async addImage(
    @Body() imgData: Buffer | string
  ): Promise<{ status: string; filename: string }> {
    if (!imgData) {
      this.logger.warn("Upload attempt with no image data");
      throw new HttpException("No image data provided", HttpStatus.BAD_REQUEST);
    }

    const maxFileSize = this.configService.getOrThrow<number>("maxFileSize");

    const payloadSize = Buffer.isBuffer(imgData)
      ? imgData.length
      : Buffer.byteLength(String(imgData));
    if (payloadSize > maxFileSize) {
      this.logger.warn(
        `Uploaded file exceeds max size (${payloadSize} > ${maxFileSize})`
      );

      throw new BadRequestException(
        `File size exceeds maximum allowed size of ${maxFileSize / 1024 / 1024}MB`
      );
    }

    const filename = randomUUID();
    const filepath = this.imagesServices.getFilepath(filename);
    const isFileExists = this.imagesServices.isFileExists(filepath);

    if (isFileExists) {
      this.logger.warn(`Image ${filename} already exists (UUID collision)`);

      throw new ConflictException("File already exists (please retry)");
    }

    try {
      const filepathWithExt = await this.imagesServices.saveImage(
        imgData,
        filepath
      );
      const filenameWithExt = path.basename(filepathWithExt);

      this.logger.log(`Image uploaded successfully: ${filenameWithExt}`);

      return {
        status: "ok",
        filename: filenameWithExt,
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        this.logger.warn(
          `Image upload validation failed for ${filename}: ${error.message}`
        );

        throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
      }

      this.logger.error(
        `Image upload failed for ${filename}: ${error.message}`
      );

      throw new HttpException(
        "Error during image upload. Please check that your image is in a supported format (JPEG, PNG, WebP, GIF, AVIF, TIFF, SVG) and under the size limit.",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Delete(":filename")
  @UseGuards(ApiKeyGuard)
  async deleteImage(
    @Param("filename", ValidateFilenamePipe) filename: string
  ): Promise<{ status: string }> {
    const filepath = this.imagesServices.resolveFilepath(filename);

    if (!filepath) {
      this.logger.warn(`Delete attempt for non-existent image: ${filename}`);

      throw new HttpException("File not found", HttpStatus.NOT_FOUND);
    }

    try {
      await this.imagesServices.deleteImage(filepath);
      this.logger.log(`Image deleted: ${filename}`);

      return { status: "ok" };
    } catch (error) {
      this.logger.error(`Failed to delete image ${filename}: ${error.message}`);

      throw new HttpException(
        "Error during image deletion",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}
