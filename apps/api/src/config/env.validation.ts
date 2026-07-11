import Joi from "joi";

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string().valid("development", "test", "production").default("development"),
  PORT: Joi.number().port().default(3001),
  API_PREFIX: Joi.string().default("api"),
  LOG_LEVEL: Joi.string().valid("fatal", "error", "warn", "log", "debug", "verbose").default("log"),
  TRUST_PROXY: Joi.boolean().default(false),
  CORS_ORIGINS: Joi.string().default("http://localhost:5173"),
  DATABASE_URL: Joi.string().uri({ scheme: ["postgresql"] }).required(),
  REDIS_URL: Joi.string().uri({ scheme: ["redis", "rediss"] }).required(),
  JWT_ACCESS_SECRET: Joi.string().min(32).required(),
  JWT_REFRESH_SECRET: Joi.string().min(32).required(),
  JWT_ACCESS_TTL: Joi.string().default("15m"),
  JWT_REFRESH_TTL: Joi.string().default("7d"),
  JWT_ISSUER: Joi.string().default("veritab-api"),
  JWT_AUDIENCE: Joi.string().default("veritab-web"),
  COOKIE_SECURE: Joi.boolean().default(false),
  COOKIE_DOMAIN: Joi.string().allow("").optional(),
  AI_BASE_URL: Joi.string().uri({ scheme: ["https", "http"] }).optional(),
  AI_API_KEY: Joi.string().min(8).optional(),
  AI_MODEL: Joi.string().max(160).optional(),
  AI_TIMEOUT_MS: Joi.number().integer().min(1000).max(120000).default(30000),
});
