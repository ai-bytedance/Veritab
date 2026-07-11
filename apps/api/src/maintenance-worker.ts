import "reflect-metadata";
import { Logger } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { FileCleanupService } from "./modules/files/file-cleanup.service";

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule, { bufferLogs: true });
  const cleanup = app.get(FileCleanupService);
  let stopping = false;
  const stop = () => { stopping = true; };
  process.once("SIGTERM", stop);
  process.once("SIGINT", stop);
  Logger.log("Maintenance worker started", "Bootstrap");
  while (!stopping) {
    await cleanup.cleanupBatch().catch((reason) => Logger.error(reason instanceof Error ? reason.message : reason, "FileCleanup"));
    for (let elapsed = 0; elapsed < 15 * 60 && !stopping; elapsed += 5) {
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }
  await app.close();
}

void bootstrap();
