import { env } from './env';

export const servicesConfig = {
  notification: {
    url: env.NOTIFICATION_SERVICE_URL,
    apiKey: env.NOTIFICATION_SERVICE_API_KEY,
  },
  core: {
    url: env.CORE_SERVICE_URL,
    apiKey: env.CORE_SERVICE_API_KEY,
  },
} as const;
