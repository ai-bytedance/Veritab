import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { envValidationSchema } from "./config/env.validation";
import { PrismaModule } from "./infrastructure/prisma/prisma.module";
import { AuthModule } from "./modules/auth/auth.module";
import { DefectsModule } from "./modules/defects/defects.module";
import { JwtAuthGuard } from "./modules/auth/jwt-auth.guard";
import { HealthModule } from "./modules/health/health.module";
import { GitIntegrationsModule } from "./modules/git-integrations/git-integrations.module";
import { OrganizationsModule } from "./modules/organizations/organizations.module";
import { ProjectSpacesModule } from "./modules/project-spaces/project-spaces.module";
import { PermissionsGuard } from "./modules/rbac/permissions.guard";
import { RbacModule } from "./modules/rbac/rbac.module";
import { RequirementsModule } from "./modules/requirements/requirements.module";
import { TestCasesModule } from "./modules/test-cases/test-cases.module";
import { UsersModule } from "./modules/users/users.module";
import { AiModule } from "./modules/ai/ai.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ["../../.env", ".env"],
      validationSchema: envValidationSchema,
      validationOptions: { allowUnknown: true, abortEarly: false },
    }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
    PrismaModule,
    RbacModule,
    AuthModule,
    DefectsModule,
    GitIntegrationsModule,
    UsersModule,
    OrganizationsModule,
    ProjectSpacesModule,
    RequirementsModule,
    TestCasesModule,
    HealthModule,
    AiModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
})
export class AppModule {}
