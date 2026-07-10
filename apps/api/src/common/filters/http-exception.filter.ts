import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { FastifyReply, FastifyRequest } from "fastify";

@Catch()
export class GlobalHttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalHttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const request = context.getRequest<FastifyRequest>();
    const response = context.getResponse<FastifyReply>();
    const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const exceptionResponse = exception instanceof HttpException ? exception.getResponse() : undefined;
    const detail =
      typeof exceptionResponse === "string"
        ? exceptionResponse
        : typeof exceptionResponse === "object" && exceptionResponse !== null && "message" in exceptionResponse
          ? (exceptionResponse as { message: string | string[] }).message
          : status === HttpStatus.INTERNAL_SERVER_ERROR
            ? "Internal server error"
            : "Request failed";
    const requestId = request.id;
    const codeByStatus: Record<number, string> = {
      400: "VALIDATION_ERROR",
      401: "UNAUTHORIZED",
      403: "FORBIDDEN",
      404: "NOT_FOUND",
      409: "CONFLICT",
      429: "RATE_LIMITED",
      503: "SERVICE_UNAVAILABLE",
    };

    if (status >= 500) {
      this.logger.error({ requestId, method: request.method, url: request.url, exception }, "Unhandled request error");
    }
    response.status(status).send({
      type: `https://veritab.dev/problems/http-${status}`,
      title: HttpStatus[status] ?? "Error",
      status,
      code: codeByStatus[status] ?? (status >= 500 ? "INTERNAL_ERROR" : "REQUEST_FAILED"),
      detail,
      instance: request.url,
      requestId,
      timestamp: new Date().toISOString(),
    });
  }
}
