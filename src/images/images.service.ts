import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { existsSync, unlink } from 'fs';
import * as path from 'path';
import * as sharp from 'sharp';

@Injectable()
export class ImagesService {
  getFilepath(filename: string) {
    return path.resolve(`public/images/${filename}`);
  }

  async getImageMetadata(filepath: string) {
    const image = await sharp(filepath);
    const metadata = await image.metadata();

    return metadata;
  }

  isFileExists(filepath: string) {
    return existsSync(filepath);
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
    const maxWidth = 1920;
    const maxHeight = 1080;

    await image
      .resize(maxWidth, maxHeight, {
        withoutEnlargement: metadata.format === 'svg' ? false : true,
        fit: 'inside',
      })
      .toFormat('webp')
      .toFile(filepath);
  }

  deleteImage(filepath: string) {
    return new Promise((resolve, reject) => {
      unlink(filepath, function (err) {
        if (err) reject(err);
        return resolve(true);
      });
    });
  }
}
