import { env } from './env';

export const socketConfig = {
  cors: {
    origin: env.SOCKET_CORS_ORIGIN,
    methods: ['GET', 'POST'] as string[],
    credentials: true,
  },
};
