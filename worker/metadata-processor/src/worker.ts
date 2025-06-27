import { env } from "./env.ts";
import { fetchAllTokenBatches } from "./services/token-fetcher.ts";
import { runTasksForTokenBatch } from "./tasks/index.ts";
import {
	subscribeToAllTokens,
	unsubscribeAll,
} from "./services/token-subscription.ts";
import type { WorkerState } from "./init.ts";
import { waitForRetryDelay } from "./utils/index.ts";

/**
 * Processes all tokens from all Torii instances using batches
 */
export async function processAllTokensFromFetcher(
	state: WorkerState,
	retryCount = 0,
): Promise<void> {
	const batchSize = env.TOKEN_FETCH_BATCH_SIZE;
	const maxRetries = env.RETRY_ATTEMPTS;

	state.logger.info(
		`Starting batch token processing (batch size: ${batchSize})${retryCount > 0 ? ` - Retry ${retryCount}/${maxRetries}` : ""}...`,
	);

	let totalProcessed = 0;
	let batchCount = 0;

	try {
		for await (const { projectId, tokens } of fetchAllTokenBatches(
			state.tokenFetcherState,
			batchSize,
		)) {
			batchCount++;
			const startTime = Date.now();

			state.logger.info(
				`Processing batch ${batchCount} from project ${projectId} with ${tokens.length} tokens...`,
			);

			await runTasksForTokenBatch(state.taskRunnerState, tokens);
			totalProcessed += tokens.length;

			const processingTime = Date.now() - startTime;
			state.logger.info(
				`Batch ${batchCount} processed in ${processingTime}ms (${Math.round(tokens.length / (processingTime / 1000))} tokens/sec)`,
			);
		}

		state.logger.info(
			`Processing complete. Processed ${totalProcessed} tokens in ${batchCount} batches`,
		);
		return; // Success, exit the retry loop
	} catch (error) {
		state.logger.error(
			error,
			`Error during batch token processing (attempt ${retryCount}/${maxRetries})`,
		);

		if (retryCount >= maxRetries) {
			state.logger.error("Maximum retry attempts reached, giving up");
			// Don't throw - we want the worker to continue even if processing fails
			return;
		}

		await waitForRetryDelay();
		await processAllTokensFromFetcher(state, retryCount + 1);
	}
}

/**
 * Starts the worker
 */
export async function startWorker(state: WorkerState): Promise<void> {
	state.logger.info("Starting metadata processor worker...");

	try {
		// Perform initial token fetch and processing
		processAllTokensFromFetcher(state);

		// Set up subscriptions for real-time updates
		subscribeToAllTokens(state.subscriptionState);

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
