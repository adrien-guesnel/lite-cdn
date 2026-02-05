import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

import configuration from "@src/config/configuration";
import { AppController } from "@src/modules/app/app.controller";
import { AppService } from "@src/modules/app/app.service";
import { ImagesModule } from "@src/modules/images/images.module";

@Module({
  imports: [
    ImagesModule,
    ConfigModule.forRoot({
      load: [configuration],
      isGlobal: true,
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
