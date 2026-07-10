import { FastifyRequest } from "fastify";
import { Principal } from "./principal";

export type RequestWithPrincipal = FastifyRequest & { user: Principal };
