import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../infrastructure/prisma/prisma.service";

type DatabaseSnapshot = {
  active_connections: bigint;
  max_connections: bigint;
  database_bytes: bigint;
};

@Injectable()
export class MetricsService {
  constructor(private readonly prisma: PrismaService) {}

  async render(): Promise<string> {
    const now = new Date();
    const [pending, deadLetters, oldestPending, databaseRows] = await Promise.all([
      this.prisma.outboxEvent.count({ where: { processedAt: null, deadLetteredAt: null } }),
      this.prisma.outboxEvent.count({ where: { deadLetteredAt: { not: null } } }),
      this.prisma.outboxEvent.findFirst({
        where: { processedAt: null, deadLetteredAt: null },
        orderBy: { occurredAt: "asc" },
        select: { occurredAt: true },
      }),
      this.prisma.$queryRaw<DatabaseSnapshot[]>`
        SELECT
          (SELECT count(*) FROM pg_stat_activity WHERE datname = current_database())::bigint AS active_connections,
          current_setting('max_connections')::bigint AS max_connections,
          pg_database_size(current_database())::bigint AS database_bytes
      `,
    ]);
    const database = databaseRows[0];
    const oldestAgeSeconds = oldestPending
      ? Math.max(0, Math.floor((now.getTime() - oldestPending.occurredAt.getTime()) / 1000))
      : 0;

    return [
      "# HELP veritab_up Whether the API can query its operational datastore.",
      "# TYPE veritab_up gauge",
      "veritab_up 1",
      "# HELP veritab_outbox_pending_events Events waiting to be processed.",
      "# TYPE veritab_outbox_pending_events gauge",
      `veritab_outbox_pending_events ${pending}`,
      "# HELP veritab_outbox_dead_letter_events Events requiring operator intervention.",
      "# TYPE veritab_outbox_dead_letter_events gauge",
      `veritab_outbox_dead_letter_events ${deadLetters}`,
      "# HELP veritab_outbox_oldest_pending_age_seconds Age of the oldest pending event.",
      "# TYPE veritab_outbox_oldest_pending_age_seconds gauge",
      `veritab_outbox_oldest_pending_age_seconds ${oldestAgeSeconds}`,
      "# HELP veritab_database_connections Connections currently attached to the Veritab database.",
      "# TYPE veritab_database_connections gauge",
      `veritab_database_connections ${database?.active_connections ?? 0n}`,
      "# HELP veritab_database_max_connections PostgreSQL configured connection limit.",
      "# TYPE veritab_database_max_connections gauge",
      `veritab_database_max_connections ${database?.max_connections ?? 0n}`,
      "# HELP veritab_database_size_bytes Current Veritab database size.",
      "# TYPE veritab_database_size_bytes gauge",
      `veritab_database_size_bytes ${database?.database_bytes ?? 0n}`,
      "",
    ].join("\n");
  }
}
