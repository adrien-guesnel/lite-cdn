import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Param,
  Post,
  Query,
  StreamableFile,
  UseGuards,
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";

import { ImagesService } from "@src/modules/images/images.service";

import { ApiKeyGuard } from "../../guards/api-key.guard";
import { ValidateFilenamePipe } from "./pipes/validate-filename.pipe";

@Controller("img")
export class ImagesController {
  constructor(private readonly imagesServices: ImagesService) {}

  @Get(":filename")
  @Header("Cache-Control", "max-age=3600")
  async getImage(
    @Param("filename", ValidateFilenamePipe) filename: string,
    @Query("h") height?: string,
    @Query("w") width?: string
  ): Promise<StreamableFile> {
    const { file } = await this.imagesServices.get(filename, height, width);
    return file;
  }

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post()
  @UseGuards(ApiKeyGuard)
  async addImage(
    @Body() imgData: Buffer | string
  ): Promise<{ status: string; filename: string }> {
    return this.imagesServices.add(imgData);
  }

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Delete(":filename")
  @UseGuards(ApiKeyGuard)
  async deleteImage(
    @Param("filename", ValidateFilenamePipe) filename: string
  ): Promise<{ status: string }> {
    return this.imagesServices.delete(filename);
  }
}
