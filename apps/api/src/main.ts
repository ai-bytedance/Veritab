import "reflect-metadata";
import { randomUUID } from "node:crypto";
import fastifyCookie from "@fastify/cookie";
import helmet from "@fastify/helmet";
import { Logger, ValidationPipe, VersioningType } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { FastifyAdapter, NestFastifyApplication } from "@nestjs/platform-fastify";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module";
import { GlobalHttpExceptionFilter } from "./common/filters/http-exception.filter";
import { RequestLoggingInterceptor } from "./common/interceptors/request-logging.interceptor";

async function bootstrap(): Promise<void> {
  const adapter = new FastifyAdapter({
    trustProxy: process.env.TRUST_PROXY === "true",
    genReqId: (request: { headers: Record<string, string | string[] | undefined> }) => {
      const incoming = request.headers["x-request-id"];
      return typeof incoming === "string" && incoming.length <= 100 ? incoming : randomUUID();
    },
    bodyLimit: 1024 * 1024,
  });
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, adapter, { bufferLogs: true });
  const config = app.get(ConfigService);

  await app.register(fastifyCookie);
  await app.register(helmet, { contentSecurityPolicy: false });
  app.enableShutdownHooks();
  app.setGlobalPrefix(config.get<string>("API_PREFIX", "api"));
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: "1" });
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true, stopAtFirstError: false }),
  );
  app.useGlobalFilters(new GlobalHttpExceptionFilter());
  app.useGlobalInterceptors(new RequestLoggingInterceptor());
  const allowedOrigins = config
    .get<string>("CORS_ORIGINS", "http://localhost:5173")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  app.enableCors({ origin: allowedOrigins, credentials: true });

  const swaggerConfig = new DocumentBuilder()
    .setTitle("Veritab Agile Platform API")
    .setDescription("Production API for Veritab Agile Platform")
    .setVersion("1.0")
    .addBearerAuth()
    .build();
  SwaggerModule.setup("docs", app, SwaggerModule.createDocument(app, swaggerConfig));

  const port = config.get<number>("PORT", 3001);
  await app.listen(port, "0.0.0.0");
  Logger.log(`Veritab API listening on http://0.0.0.0:${port}`, "Bootstrap");
}

void bootstrap();
