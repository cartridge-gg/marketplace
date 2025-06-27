import { env } from "../env.ts";

export * from "./logger.ts";

/**
 * Waits for the configured retry delay before continuing execution.
 * Uses the RETRY_DELAY value from environment configuration.
 *
 * @returns A promise that resolves after the retry delay period
 */
export async function waitForRetryDelay() {
	await waitFor(env.RETRY_DELAY);
}

/**
 * Waits for a specified amount of time before continuing execution.
 *
 * @param delay - The delay in milliseconds to wait
 * @returns A promise that resolves after the specified delay
 */
export async function waitFor(delay: number) {
	await new Promise((resolve) => setTimeout(resolve, delay));
}
