import { Logger, Module } from "@nestjs/common";

import { ImagesController } from "@src/modules/images/images.controller";
import { ImagesService } from "@src/modules/images/images.service";

@Module({
  controllers: [ImagesController],
  providers: [ImagesService, Logger],
})
export class ImagesModule {}
