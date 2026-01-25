import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

import { AppController } from "@src/app.controller";
import { AppService } from "@src/app.service";
import configuration from "@src/config/configuration";
import { ImagesModule } from "@src/images/images.module";

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
