import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { existsSync } from 'fs';
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

  fileExist(filepath: string) {
    if (!existsSync(filepath)) {
      throw new HttpException(
        'File not found',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getResizedImage(filepath: string, width?: unknown, height?: unknown) {
    return await sharp(filepath)
      .resize(Number(height) || null, Number(width) || null, {
        withoutEnlargement: true,
        fit: 'inside',
      })
      .toBuffer();
  }

  async saveImage(
    imgData: Buffer | string,
    filepath: string,
    maxWidth: number,
    maxHeight: number,
  ) {
    const image = await sharp(imgData);
    const metadata = await image.metadata();

    await image
      .resize(maxWidth, maxHeight, {
        withoutEnlargement: metadata.format === 'svg' ? false : true,
        fit: 'inside',
      })
      .toFormat('webp')
      .toFile(filepath);
  }

  addImage() {
    // const filename = req.params.name;
    // const imgData = req.body;
    // const { key } = req.headers;
    // verifyKey(key as string);
    // if (!filename) {
    //   res.status(500).send('No filename found');
    //   return;
    // }
    // if (!imgData || JSON.stringify(imgData) === '{}') {
    //   res.status(500).send('No img data found into the request');
    //   return;
    // }
    // const filepath = path.resolve(`public/images/${filename}`);
    // try {
    //   await saveImage(imgData, filepath, SAVE_MAX_WIDTH, SAVE_MAX_HEIGHT);
    //   console.log(`Image saved : ${filename}`);
    //   res.send({
    //     status: 'ok',
    //     filename,
    //   });
    // } catch (error) {
    //   console.error(error);
    //   res
    //     .status(500)
    //     .send(
    //       'Error during upload of your image. Please check that your image is JPEG, PNG, WebP, GIF, AVIF, TIFF and SVG type and below 10Mb.',
    //     );
    // }
  }

  deleteImage() {
    // const { key } = req.headers;
    // const filename = req.params.filename;
    // const filepath = path.resolve(`public/images/${filename}`);
    // verifyKey(key as string);
    // fileExist(filepath);
    // fs.unlink(filepath, function (err) {
    //   if (err) return console.error(err);
    //   res.send('ok');
    // });
  }
}
