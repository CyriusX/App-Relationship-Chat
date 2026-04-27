import pino, { type Logger } from 'pino';
import { appConfig } from '../config';

export function createLogger(): Logger {
  const isDev = appConfig.isDevelopment;
  const isTest = appConfig.isTest;

  const transport = isDev
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          levelFirst: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      }
    : undefined;

  return pino({
    level: appConfig.logLevel,
    name: appConfig.serviceName,
    transport,
    serializers: {
      req: pino.stdSerializers.req,
      res: pino.stdSerializers.res,
      err: pino.stdSerializers.err,
    },
    formatters: {
      level: (label) => {
        return { level: label };
      },
    },
    timestamp: !isTest,
  });
}

export const logger = createLogger();

export type { Logger };
