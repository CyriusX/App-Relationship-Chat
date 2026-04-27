import { z } from 'zod';
import 'dotenv/config';

const envSchema = z.object({
  // Application
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).default('3005'),
  SERVICE_NAME: z.string().default('chat-service'),

  // Database
  DATABASE_URL: z.string().url(),

  // Redis
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.string().transform(Number).default('6379'),
  REDIS_PASSWORD: z.string().optional(),

  // JWT
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('7d'),

  // Socket.io
  SOCKET_CORS_ORIGIN: z.string().default('*'),

  // Notification Service
  NOTIFICATION_SERVICE_URL: z.string().url(),
  NOTIFICATION_SERVICE_API_KEY: z.string(),

  // CORE Service
  CORE_SERVICE_URL: z.string().url(),
  CORE_SERVICE_API_KEY: z.string(),

  // Logging
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),

  // Rate Limiting
  RATE_LIMIT_MAX: z.string().transform(Number).default('100'),
  RATE_LIMIT_WINDOW_MS: z.string().transform(Number).default('60000'),
});

export type EnvConfig = z.infer<typeof envSchema>;

export function validateEnv(): EnvConfig {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const errors = result.error.issues.map((issue) => {
      return `  - ${issue.path.join('.')}: ${issue.message}`;
    });

    throw new Error(`Invalid environment variables:\n${errors.join('\n')}`);
  }

  return result.data;
}

export const env = validateEnv();
