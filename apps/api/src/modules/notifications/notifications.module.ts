import { Module } from "@nestjs/common";
import { NotificationsController } from "./notifications.controller";
import { NotificationsService } from "./notifications.service";
import { WebhookCryptoService } from "./webhook-crypto.service";
import { NotificationWorkerService } from "./notification-worker.service";

@Module({ controllers: [NotificationsController], providers: [NotificationsService, WebhookCryptoService, NotificationWorkerService] })
export class NotificationsModule {}
