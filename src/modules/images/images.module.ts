import { Logger, Module } from "@nestjs/common";

import { ApiKeyGuard } from "@src/guards/api-key.guard";
import { ImagesController } from "@src/modules/images/images.controller";
import { ImagesService } from "@src/modules/images/images.service";

@Module({
  controllers: [ImagesController],
  providers: [ImagesService, Logger, ApiKeyGuard],
})
export class ImagesModule {}
