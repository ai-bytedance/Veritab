import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from "@nestjs/common";
import { FastifyRequest } from "fastify";
import { Observable, tap } from "rxjs";

@Injectable()
export class RequestLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger("HTTP");

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<FastifyRequest>();
    const startedAt = Date.now();
    return next.handle().pipe(
      tap({
        next: () => this.log(request, Date.now() - startedAt),
        error: () => this.log(request, Date.now() - startedAt),
      }),
    );
  }

  private log(request: FastifyRequest, durationMs: number): void {
    this.logger.log({ requestId: request.id, method: request.method, url: request.url, durationMs });
  }
}
