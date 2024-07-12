import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { AppModule } from './app.module';
import helmet from '@fastify/helmet';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const fastifyAdapter = new FastifyAdapter({
    logger: true,
    bodyLimit: 1024 * 1024 * 5,
  });

  fastifyAdapter.getInstance().addContentTypeParser(
    'application/octet-stream',
    {
      parseAs: 'buffer',
    },
    async function (request, payload) {
      return payload;
    },
  );

  // fastifyAdapter
  //   .getInstance()
  //   .addContentTypeParser(
  //     '*',
  //     { bodyLimit: 1024 * 1024 * 5 },
  //     (_request, _payload, done) => {
  //       done(null, _payload);
  //     },
  //   );

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    fastifyAdapter,
  );
  await app.register(helmet);
  const configService = app.get(ConfigService);

  await app.listen(configService.get('port'), '0.0.0.0');
}
bootstrap();
