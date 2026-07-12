import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";

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
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        throttlers: [
          {
            ttl: configService.get<number>("apiWindowMinDelay") * 60 * 1000,
            limit: configService.get<number>("apiLimitRequestsByWindowAndIp"),
          },
        ],
      }),
    }),
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
