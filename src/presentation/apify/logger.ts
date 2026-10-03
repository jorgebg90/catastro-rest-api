import { log } from 'apify';

export interface AppLogger {
    info(message: string, data?: Record<string, unknown>): void;
    error(message: string, data?: Record<string, unknown>): void;
}

/** Logs through the Apify logger, which censors credentials. Never pass proxy URLs or tokens. */
export const apifyLogger: AppLogger = {
    info: (message, data) => log.info(message, data),
    error: (message, data) => log.error(message, data),
};
