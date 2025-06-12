import { env } from "./env.ts";
import {
	fetchAllTokens,
	fetchAllTokenBatches,
} from "./services/token-fetcher.ts";
import {
	processTokens,
	getProcessedCount,
} from "./services/metadata-processor.ts";
import {
	subscribeToAllTokens,
	unsubscribeAll,
} from "./services/token-subscription.ts";
import type { WorkerState } from "./init.ts";

/**
 * Processes all tokens from all Torii instances using batches
 */
export async function processAllTokensFromFetcher(
	state: WorkerState,
): Promise<void> {
	const batchSize = env.TOKEN_FETCH_BATCH_SIZE;
	state.logger.info(`Starting batch token processing (batch size: ${batchSize})...`);

	let totalProcessed = 0;
	let batchCount = 0;

	try {
		for await (const { projectId, tokens } of fetchAllTokenBatches(state.tokenFetcherState, batchSize)) {
			batchCount++;
			const startTime = Date.now();
			
			state.logger.info(
				`Processing batch ${batchCount} from project ${projectId} with ${tokens.length} tokens...`,
			);
			
			await processTokens(state.metadataProcessorState, tokens);
			totalProcessed += tokens.length;
			
			const processingTime = Date.now() - startTime;
			state.logger.info(
				`Batch ${batchCount} processed in ${processingTime}ms (${Math.round(tokens.length / (processingTime / 1000))} tokens/sec)`,
			);
		}

		state.logger.info(
			`Processing complete. Processed ${totalProcessed} tokens in ${batchCount} batches`,
		);
	} catch (error) {
		state.logger.error(error, "Error during batch token processing");
		// Don't throw - we want the worker to continue even if processing fails
	}
}

/**
 * Processes all tokens from all Torii instances (legacy mode - loads all into memory)
 */
export async function processAllTokensLegacy(
	state: WorkerState,
): Promise<void> {
	state.logger.info("Starting token processing (legacy mode)...");

	try {
		const tokens = await fetchAllTokens(state.tokenFetcherState);
		await processTokens(state.metadataProcessorState, tokens);

		state.logger.info(
			`Processing complete. Processed ${getProcessedCount(state.metadataProcessorState)} tokens`,
		);
	} catch (error) {
		state.logger.error(error, "Error during token processing");
		// Don't throw - we want the worker to continue even if processing fails
	}
}

/**
 * Starts periodic token fetching
 */
export function startPeriodicFetching(state: WorkerState): void {
	const intervalMs = env.FETCH_INTERVAL * 60 * 1000; // Convert minutes to ms

	state.logger.info(
		`Setting up periodic token fetching every ${env.FETCH_INTERVAL} minutes`,
	);

	async function runPeriodicFetch(): Promise<void> {
		state.logger.info("Running periodic token fetch...");

		try {
			await processAllTokensFromFetcher(state);
		} catch (error) {
			state.logger.error(error, "Error during periodic token fetch");
		}
	}

	state.intervalId = setInterval(runPeriodicFetch, intervalMs);
}

/**
 * Stops periodic fetching
 */
export function stopPeriodicFetching(state: WorkerState): void {
	if (state.intervalId) {
		clearInterval(state.intervalId);
		state.intervalId = undefined;
	}
}

/**
 * Starts the worker
 */
export async function startWorker(state: WorkerState): Promise<void> {
	state.logger.info("Starting metadata processor worker...");

	try {
		// Perform initial token fetch and processing
		await processAllTokensFromFetcher(state);

		// Set up subscriptions for real-time updates
		await subscribeToAllTokens(state.subscriptionState);

		// Set up periodic token fetching
		startPeriodicFetching(state);

		state.logger.info("Worker started successfully");
	} catch (error) {
		state.logger.error(error, "Failed to start worker");
		throw error;
	}
}

/**
 * Stops the worker
 */
export async function stopWorker(state: WorkerState): Promise<void> {
	state.logger.info("Stopping metadata processor worker...");

	// Clear periodic interval
	stopPeriodicFetching(state);

	// Unsubscribe from all token updates
	await unsubscribeAll(state.subscriptionState);

	state.logger.info("Worker stopped");
}

/**
 * Sets up graceful shutdown handlers
 */
export function setupGracefulShutdown(state: WorkerState): void {
	async function shutdownHandler(signal: string): Promise<void> {
		state.logger.info(`Received ${signal}, shutting down gracefully...`);

		try {
			await stopWorker(state);
			process.exit(0);
		} catch (error) {
			state.logger.error(error, "Error during shutdown");
			process.exit(1);
		}
	}

	function handleSigint(): void {
		shutdownHandler("SIGINT").catch(console.error);
	}

	function handleSigterm(): void {
		shutdownHandler("SIGTERM").catch(console.error);
	}

	process.on("SIGINT", handleSigint);
	process.on("SIGTERM", handleSigterm);
}