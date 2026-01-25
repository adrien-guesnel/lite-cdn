import { Logger, Module } from "@nestjs/common";

import { ImagesController } from "@src/images/images.controller";
import { ImagesService } from "@src/images/images.service";

@Module({
  controllers: [ImagesController],
  providers: [ImagesService, Logger],
})
export class ImagesModule {}
