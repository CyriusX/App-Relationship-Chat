import { env } from './env';

export const appConfig = {
  nodeEnv: env.NODE_ENV,
  port: env.PORT,
  serviceName: env.SERVICE_NAME,
  isDevelopment: env.NODE_ENV === 'development',
  isProduction: env.NODE_ENV === 'production',
  isTest: env.NODE_ENV === 'test',
  logLevel: env.LOG_LEVEL,
  rateLimit: {
    max: env.RATE_LIMIT_MAX,
    windowMs: env.RATE_LIMIT_WINDOW_MS,
  },
} as const;
