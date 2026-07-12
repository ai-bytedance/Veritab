import { Controller, Get, Headers, Res, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ApiExcludeController } from "@nestjs/swagger";
import { FastifyReply } from "fastify";
import { timingSafeEqual } from "node:crypto";
import { Public } from "../../common/decorators/public.decorator";
import { MetricsService } from "./metrics.service";

@ApiExcludeController()
@Controller("metrics")
export class MetricsController {
  constructor(
    private readonly metrics: MetricsService,
    private readonly config: ConfigService,
  ) {}

  @Public()
  @Get()
  async get(@Headers("authorization") authorization: string | undefined, @Res() response: FastifyReply): Promise<void> {
    const configured = this.config.get<string>("METRICS_TOKEN") ?? "";
    const supplied = authorization?.startsWith("Bearer ") ? authorization.slice(7) : "";
    if (!configured || !this.sameSecret(configured, supplied)) throw new UnauthorizedException();
    response.header("content-type", "text/plain; version=0.0.4; charset=utf-8");
    response.header("cache-control", "no-store");
    response.send(await this.metrics.render());
  }

  private sameSecret(expected: string, actual: string): boolean {
    const left = Buffer.from(expected);
    const right = Buffer.from(actual);
    return left.length === right.length && timingSafeEqual(left, right);
  }
}
