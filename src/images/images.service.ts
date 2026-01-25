import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { existsSync, unlink } from 'fs';
import * as path from 'path';
import * as sharp from 'sharp';

@Injectable()
export class ImagesService {
  constructor(
    private configService: ConfigService,
    private logger: Logger,
  ) {}

  SERVICE: string = ImagesService.name;

  getFilepath(filename: string) {
    return path.resolve(`public/images/${filename}`);
  }

  async getImageMetadata(filepath: string) {
    const image = await sharp(filepath);
    const metadata = await image.metadata();

    this.logger.debug(metadata, this.SERVICE);

    return metadata;
  }

  isFileExists(filepath: string) {
    const isExists = existsSync(filepath);

    this.logger.debug(`File ${filepath} exists: ${isExists}`, this.SERVICE);
    return isExists;
  }

  async getResizedImage(filepath: string, width?: unknown, height?: unknown) {
    return await sharp(filepath)
      .resize(Number(height) || null, Number(width) || null, {
        withoutEnlargement: true,
        fit: 'inside',
      })
      .toBuffer();
  }

  async saveImage(imgData: Buffer | string, filepath: string) {
    const image = await sharp(imgData);
    const metadata = await image.metadata();
    const maxWidth = this.configService.get<number>('saveMaxWidth');
    const maxHeight = this.configService.get<number>('saveMaxHeight');

    await image
      .resize(maxWidth, maxHeight, {
        withoutEnlargement: metadata.format === 'svg' ? false : true,
        fit: 'inside',
      })
      .toFormat('webp')
      .toFile(filepath);

    return 'webp';
  }

  deleteImage(filepath: string) {
    return new Promise((resolve, reject) => {
      unlink(filepath, function (err) {
        if (err) reject(err);
        return resolve(true);
      });
    });
  }

  resolveFilepath(filename: string): string | null {
    // First try the filename as-is
    let filepath = this.getFilepath(filename);
    if (this.isFileExists(filepath)) {
      return filepath;
    }

    // If not found and filename has an extension, try without extension
    const lastDotIndex = filename.lastIndexOf('.');
    if (lastDotIndex > 0) {
      const filenameWithoutExt = filename.substring(0, lastDotIndex);
      filepath = this.getFilepath(filenameWithoutExt);
      if (this.isFileExists(filepath)) {
        return filepath;
      }
    }

    // If not found and filename doesn't have extension, try with .webp
    filepath = this.getFilepath(`${filename}.webp`);
    if (this.isFileExists(filepath)) {
      return filepath;
    }

    return null;
  }

  verifyKey(key: string) {
    const API_SECRET = this.configService.get<string>('API_SECRET');

    if (key !== API_SECRET) {
      this.logger.error('You are unauthorized');
      throw new Error('You are unauthorized');
    }
  }
}
