import {
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
} from '@nestjs/common';
import { ImagesService } from './images.service';
import { createReadStream } from 'fs';
import { Throttle } from '@nestjs/throttler';
import { randomUUID } from 'crypto';

@Controller('img')
export class ImagesController {
  constructor(
    private readonly imagesServices: ImagesService,
    private logger: Logger,
  ) {}

  @Get(':filename')
  @Header('Cache-Control', 'max-age=3600')
  async getImage(
    @Param('filename') filename: string,
    @Query('h') height?: number,
    @Query('w') weight?: number,
  ): Promise<StreamableFile> {
    const filepath = this.imagesServices.getFilepath(filename);
    const isFileExists = this.imagesServices.isFileExists(filepath);

    if (!isFileExists) {
      this.logger.error(`Image ${filename} not found`);

      throw new HttpException('File not found', HttpStatus.NOT_FOUND);
    }

    if (!height && !weight) {
      const file = createReadStream(filepath);
      this.logger.log(`Deliver image ${filename}`);

      return new StreamableFile(file);
    }

    const metadata = await this.imagesServices.getImageMetadata(filepath);
    const buffer = await this.imagesServices.getResizedImage(
      filepath,
      weight,
      height,
    );

    this.logger.log(`Deliver image ${filename}`);

    return new StreamableFile(buffer, {
      type: metadata.format as string,
      disposition: 'attachment; filename="' + filename + '"',
    });
  }

  @Throttle({ default: { limit: 3, ttl: 10000 } })
  @Post()
  async addImage(
    @Body() data: any,
    @Headers('key') key: string,
  ): Promise<{ status: string; filename: string }> {
    try {
      this.imagesServices.verifyKey(key);
    } catch (error) {
      this.logger.error(`Unauthorized access with key ${key}`);
      throw new HttpException(
        'You are unauthorized',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    if (!data) {
      this.logger.error(`No img data found into the request`);
      throw new HttpException(
        'No img data found into the request',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    const filename = randomUUID();
    const filepath = this.imagesServices.getFilepath(filename);
    const isFileExists = this.imagesServices.isFileExists(filepath);
    if (isFileExists) {
      this.logger.error(`Image ${filename} exists already`);

      throw new HttpException(
        'Image exists already',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    try {
      await this.imagesServices.saveImage(data, filepath);
      this.logger.debug(`Image saved : ${filename}`);

      return {
        status: 'ok',
        filename,
      };
    } catch (error) {
      this.logger.error(error);

      throw new HttpException(
        'Error during upload of your image. Please check that your image is JPEG, PNG, WebP, GIF, AVIF, TIFF and SVG type and below 10Mb.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Throttle({ default: { limit: 3, ttl: 10000 } })
  @Delete(':filename')
  async deleteImage(
    @Param('filename') filename: string,
    @Headers('key') key: string,
  ) {
    try {
      this.imagesServices.verifyKey(key);
    } catch (error) {
      this.logger.error(`Unauthorized access with key ${key}`);

      throw new HttpException(
        'You are unauthorized',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    const filepath = this.imagesServices.getFilepath(filename);
    const isFileExists = this.imagesServices.isFileExists(filepath);

    if (!isFileExists) {
      this.logger.error(`Image ${filename} not found`);

      throw new HttpException('File not found', HttpStatus.NOT_FOUND);
    }

    try {
      await this.imagesServices.deleteImage(filepath);
      this.logger.log(`Image ${filename} deleted`);
      return 'ok';
    } catch (error) {
      this.logger.error(error);

      throw new HttpException(
        'Error during delete of your image.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
