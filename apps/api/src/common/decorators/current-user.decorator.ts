import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { RequestWithPrincipal } from "../auth/request-with-principal";

export const CurrentUser = createParamDecorator(
  (field: keyof RequestWithPrincipal["user"] | undefined, context: ExecutionContext) => {
    const request = context.switchToHttp().getRequest<RequestWithPrincipal>();
    return field ? request.user[field] : request.user;
  },
);
