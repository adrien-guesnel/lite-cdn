import {
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  StreamableFile,
} from '@nestjs/common';
import { ImagesService } from './images.service';
import { createReadStream } from 'fs';

@Controller('img')
export class ImagesController {
  constructor(private readonly imagesServices: ImagesService) {}

  @Get(':filename')
  async getImage(
    @Param('filename') filename: string,
    @Query('h') height?: number,
    @Query('w') weight?: number,
  ): Promise<StreamableFile> {
    console.log({ filename, height, weight });
    const filepath = this.imagesServices.getFilepath(filename);
    console.debug(filepath);
    this.imagesServices.fileExist(filepath);

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

  // @Throttle({ default: { limit: 3, ttl: 10000 } })
  // @Post()
  // addImage(): string {
  //   return this.imagesServices.addImage();
  // }

  // @Throttle({ default: { limit: 3, ttl: 10000 } })
  // @Delete()
  // deleteImage(): string {
  //   return this.imagesServices.deleteImage();
  // }
}
