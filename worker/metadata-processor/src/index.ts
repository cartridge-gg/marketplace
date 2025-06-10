import { Account, RpcProvider } from "starknet";
import { env, chainId } from "./env.ts";
import {
	type TokenFetcherState,
	initializeTokenFetcher,
	fetchAllTokens,
	getToriiClients,
} from "./services/token-fetcher.ts";
import {
	type MetadataProcessorState,
	createMetadataProcessorState,
	processTokens,
	getProcessedCount,
} from "./services/metadata-processor.ts";
import {
	type TokenSubscriptionState,
	createTokenSubscriptionState,
	subscribeToAllTokens,
	unsubscribeAll,
} from "./services/token-subscription.ts";
import { createLogger, type Logger } from "./utils/logger.ts";

/**
 * Worker state type
 */
export type WorkerState = {
	logger: Logger;
	tokenFetcherState: TokenFetcherState;
	metadataProcessorState: MetadataProcessorState;
	subscriptionState: TokenSubscriptionState;
	provider: RpcProvider;
	account: Account;
	intervalId?: NodeJS.Timeout;
};

/**
 * Creates the initial worker state
 */
export async function createWorkerState(): Promise<WorkerState> {
	const logger = createLogger("MetadataProcessorWorker");

	// Initialize provider and account
	const provider = new RpcProvider({ nodeUrl: env.RPC_URL });
	const account = new Account(
		provider,
		env.ACCOUNT_ADDRESS,
		env.ACCOUNT_PRIVATE_KEY,
	);

	// Initialize token fetcher
	const tokenFetcherState = await initializeTokenFetcher({ provider, chainId });

	// Initialize metadata processor
	const metadataProcessorState = createMetadataProcessorState({
		provider,
		account,
		marketplaceAddress: env.MARKETPLACE_ADDRESS,
		batchSize: env.BATCH_SIZE,
	});

	// Initialize subscription service
	const subscriptionState = createTokenSubscriptionState({
		toriiClients: getToriiClients(tokenFetcherState),
		metadataProcessorState,
	});

	return {
		logger,
		tokenFetcherState,
		metadataProcessorState,
		subscriptionState,
		provider,
		account,
	};
}

/**
 * Processes all tokens from all Torii instances
 */
export async function processAllTokensFromFetcher(
	state: WorkerState,
): Promise<void> {
	state.logger.info("Starting token processing...");

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
 * Initializes the worker
 */
export async function initializeWorker(): Promise<WorkerState> {
	const logger = createLogger("MetadataProcessorWorker");
	logger.info("Initializing metadata processor worker...");

	try {
		const state = await createWorkerState();
		logger.info("Worker initialized successfully");
		return state;
	} catch (error) {
		logger.error(error, "Failed to initialize worker");
		throw error;
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

/**
 * Main entry point
 */
async function main() {
	try {
		// Initialize worker
		const state = await initializeWorker();

		// Start worker
		await startWorker(state);

		// Set up graceful shutdown
		setupGracefulShutdown(state);

		// Keep the process running
		console.log("Metadata processor worker is running. Press Ctrl+C to stop.");
	} catch (error) {
		console.error("Fatal error:", error);
		process.exit(1);
	}
}

// Run the worker
main().catch(console.error);

