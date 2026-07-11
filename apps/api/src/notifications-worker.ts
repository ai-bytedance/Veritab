import "reflect-metadata";
import { Logger } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { NotificationWorkerService } from "./modules/notifications/notification-worker.service";

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule, { bufferLogs: true });
  const worker = app.get(NotificationWorkerService);
  let stopping = false;
  const stop = () => { stopping = true; };
  process.once("SIGTERM", stop);
  process.once("SIGINT", stop);
  Logger.log("Notification worker started", "Bootstrap");
  while (!stopping) {
    const processed = await worker.processOne().catch((reason) => {
      Logger.error(reason instanceof Error ? reason.message : reason, "NotificationWorker");
      return false;
    });
    if (!processed) await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  await app.close();
}

void bootstrap();
