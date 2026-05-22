import { AsyncLocalStorage } from 'async_hooks';

export interface LoggerStore {
  correlationId: string;
}

export const loggerLocalStorage = new AsyncLocalStorage<LoggerStore>();
