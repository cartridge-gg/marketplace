import pino from "pino";
import { env, isProduction } from "../env.ts";

/**
 * Creates a pino logger instance with the appropriate configuration
 */
export function createLogger(name: string) {
	if (isProduction) {
		// Production: JSON logs
		return pino({
			name,
			level: env.LOG_LEVEL,
		});
	}
	// Development: Pretty printed logs
	return pino({
		name,
		level: env.LOG_LEVEL,
		transport: {
			target: "pino-pretty",
			options: {
				colorize: true,
				translateTime: "HH:MM:ss Z",
				ignore: "pid,hostname",
			},
		},
	});
}

// Re-export the Logger type from pino
export type Logger = pino.Logger;
