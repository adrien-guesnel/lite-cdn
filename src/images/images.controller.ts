import { randomUUID } from "node:crypto";
import { createReadStream } from "node:fs";

import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Headers,
  HttpException,
  HttpStatus,
  Logger,
  Param,
  Post,
  Query,
  StreamableFile,
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";

import { UploadImageDto } from "@src/images/dto/upload-image.dto";
import { ImagesService } from "@src/images/images.service";

@Controller("img")
export class ImagesController {
  constructor(
    private readonly imagesServices: ImagesService,
    private logger: Logger
  ) {}

  @Get(":filename")
  @Header("Cache-Control", "max-age=3600")
  async getImage(
    @Param("filename") filename: string,
    @Query("h") height?: number,
    @Query("w") weight?: number
  ): Promise<StreamableFile> {
    if (!filename) {
      throw new BadRequestException("Filename is required");
    }

    const filepath = this.imagesServices.resolveFilepath(filename);

    if (!filepath) {
      this.logger.warn(`Image ${filename} not found`);

      throw new HttpException("File not found", HttpStatus.NOT_FOUND);
    }

    if (!height && !weight) {
      const file = createReadStream(filepath);
      this.logger.log(`Deliver image ${filename}`);

      return new StreamableFile(file);
    }

    try {
      const metadata = await this.imagesServices.getImageMetadata(filepath);
      const buffer = await this.imagesServices.getResizedImage(
        filepath,
        weight,
        height
      );

      this.logger.log(
        `Deliver resized image ${filename} (${weight}x${height})`
      );

      return new StreamableFile(buffer, {
        type: metadata.format as string,
        disposition: `attachment; filename="${filename}"`,
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
  async addImage(
    @Body() data: UploadImageDto,
    @Headers("key") key: string
  ): Promise<{ status: string; filename: string }> {
    if (!key) {
      this.logger.warn("Upload attempt without API key");

      throw new HttpException("API key required", HttpStatus.UNAUTHORIZED);
    }

    try {
      this.imagesServices.verifyKey(key);
    } catch (_error) {
      this.logger.warn(`Unauthorized upload attempt`);

      throw new HttpException("Invalid API key", HttpStatus.UNAUTHORIZED);
    }

    if (!data || !data.file) {
      this.logger.warn(`Upload attempt with no image data`);

      throw new HttpException("No image data provided", HttpStatus.BAD_REQUEST);
    }

    const filename = randomUUID();
    const filepath = this.imagesServices.getFilepath(filename);
    const isFileExists = this.imagesServices.isFileExists(filepath);

    if (isFileExists) {
      this.logger.warn(`Image ${filename} already exists (UUID collision)`);

      throw new HttpException(
        "File already exists (please retry)",
        HttpStatus.CONFLICT
      );
    }

    try {
      const format = await this.imagesServices.saveImage(data.file, filepath);
      this.logger.log(`Image uploaded successfully: ${filename}.${format}`);

      return {
        status: "ok",
        filename: `${filename}.${format}`,
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
  async deleteImage(
    @Param("filename") filename: string,
    @Headers("key") key: string
  ): Promise<{ status: string }> {
    if (!key) {
      this.logger.warn(`Delete attempt without API key`);

      throw new HttpException("API key required", HttpStatus.UNAUTHORIZED);
    }

    try {
      this.imagesServices.verifyKey(key);
    } catch (_error) {
      this.logger.warn(`Unauthorized delete attempt`);

      throw new HttpException("Invalid API key", HttpStatus.UNAUTHORIZED);
    }

    if (!filename) {
      throw new BadRequestException("Filename is required");
    }

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
