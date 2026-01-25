import helmet from "@fastify/helmet";
import { Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { WinstonModule } from "nest-winston";

import { AppModule } from "@src/app.module";
import { loggerMiddleware } from "@src/logger/logger.middleware";
import { instance } from "@src/logger/winston.logger";

async function bootstrap() {
  const logger = new Logger();
  const fastifyAdapter = new FastifyAdapter({
    logger: false,
    bodyLimit: 1024 * 1024 * 5,
  });

  fastifyAdapter.getInstance().addContentTypeParser(
    "application/octet-stream",
    {
      parseAs: "buffer",
    },
    async (_request, payload) => payload
  );

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    fastifyAdapter,
    {
      logger: WinstonModule.createLogger({
        instance: instance,
      }),
    }
  );
  const configService = app.get(ConfigService);

  await app.register(helmet, {
    crossOriginResourcePolicy: { policy: "same-site" },
  });

  app.enableCors({
    origin: configService.get("allowedOrigins"),
    credentials: true,
  });

  app.use(loggerMiddleware);

  await app.listen(configService.get("port"), "0.0.0.0");

  logger.log(`Application is running port: ${configService.get("port")}`);
}

bootstrap();
