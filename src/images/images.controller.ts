import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  HttpStatus,
  Param,
  Post,
  Query,
  StreamableFile,
} from '@nestjs/common';
import { ImagesService } from './images.service';
import { createReadStream } from 'fs';
import { Throttle } from '@nestjs/throttler';
import { randomUUID } from 'crypto';

@Controller('img')
export class ImagesController {
  constructor(private readonly imagesServices: ImagesService) {}

  @Get(':filename')
  async getImage(
    @Param('filename') filename: string,
    @Query('h') height?: number,
    @Query('w') weight?: number,
  ): Promise<StreamableFile> {
    const filepath = this.imagesServices.getFilepath(filename);
    const isFileExists = this.imagesServices.isFileExists(filepath);

    if (!isFileExists) {
      console.error(`Image ${filename} not found`);

      throw new HttpException(
        'File not found',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    console.info(`Deliver image ${filename}`);

    if (!height && !weight) {
      const file = createReadStream(filepath);
      return new StreamableFile(file);
    }

    const metadata = await this.imagesServices.getImageMetadata(filepath);
    const buffer = await this.imagesServices.getResizedImage(
      filepath,
      weight,
      height,
    );

    return new StreamableFile(buffer, {
      type: metadata.format as string,
      disposition: 'attachment; filename="' + filename + '"',
    });
  }

  @Throttle({ default: { limit: 3, ttl: 10000 } })
  @Post()
  async addImage(
    @Body() data: any,
  ): Promise<{ status: string; filename: string }> {
    if (!data) {
      console.error(`No img data found into the request`);
      throw new HttpException(
        'No img data found into the request',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    const filename = randomUUID();
    const filepath = this.imagesServices.getFilepath(filename);
    const isFileExists = this.imagesServices.isFileExists(filepath);
    if (isFileExists) {
      console.error(`Image ${filename} exists already`);

      throw new HttpException(
        'Image exists already',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    try {
      await this.imagesServices.saveImage(data, filepath);
      console.log(`Image saved : ${filename}`);

      return {
        status: 'ok',
        filename,
      };
    } catch (error) {
      console.error(error);

      throw new HttpException(
        'Error during upload of your image. Please check that your image is JPEG, PNG, WebP, GIF, AVIF, TIFF and SVG type and below 10Mb.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // @Throttle({ default: { limit: 3, ttl: 10000 } })
  // @Delete()
  // deleteImage(): string {
  //   return this.imagesServices.deleteImage();
  // }
}
