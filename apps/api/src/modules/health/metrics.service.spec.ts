import { MetricsService } from "./metrics.service";

describe("MetricsService", () => {
  it("renders outbox and database gauges in Prometheus format", async () => {
    const prisma = {
      outboxEvent: {
        count: jest.fn().mockResolvedValueOnce(7).mockResolvedValueOnce(2),
        findFirst: jest.fn().mockResolvedValue({ occurredAt: new Date(Date.now() - 10_000) }),
      },
      $queryRaw: jest.fn().mockResolvedValue([{ active_connections: 4n, max_connections: 100n, database_bytes: 2048n }]),
    };
    const output = await new MetricsService(prisma as never).render();
    expect(output).toContain("veritab_outbox_pending_events 7");
    expect(output).toContain("veritab_outbox_dead_letter_events 2");
    expect(output).toMatch(/veritab_outbox_oldest_pending_age_seconds 1\d/);
    expect(output).toContain("veritab_database_connections 4");
    expect(output).toContain("veritab_database_max_connections 100");
    expect(output).toContain("veritab_database_size_bytes 2048");
  });
});
