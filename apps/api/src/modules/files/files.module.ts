import { Module } from "@nestjs/common";
import { FilesController } from "./files.controller";
import { FilesService } from "./files.service";
import { ObjectStorageService } from "./object-storage.service";
import { FileCleanupService } from "./file-cleanup.service";

@Module({ controllers: [FilesController], providers: [FilesService, ObjectStorageService, FileCleanupService] })
export class FilesModule {}
