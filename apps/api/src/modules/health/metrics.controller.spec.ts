import { UnauthorizedException } from "@nestjs/common";
import { MetricsController } from "./metrics.controller";

describe("MetricsController", () => {
  const token = "metrics-token-that-is-at-least-32-characters";
  const metrics = { render: jest.fn().mockResolvedValue("veritab_up 1\n") };
  const config = { get: jest.fn().mockReturnValue(token) };
  const response = { header: jest.fn().mockReturnThis(), send: jest.fn() };
  const controller = new MetricsController(metrics as never, config as never);

  beforeEach(() => jest.clearAllMocks());

  it.each([undefined, "Bearer wrong-token", token])("rejects an invalid authorization value", async (authorization) => {
    await expect(controller.get(authorization, response as never)).rejects.toBeInstanceOf(UnauthorizedException);
    expect(metrics.render).not.toHaveBeenCalled();
  });

  it("returns metrics only for the dedicated bearer token", async () => {
    await controller.get(`Bearer ${token}`, response as never);
    expect(response.header).toHaveBeenCalledWith("cache-control", "no-store");
    expect(response.send).toHaveBeenCalledWith("veritab_up 1\n");
  });
});
