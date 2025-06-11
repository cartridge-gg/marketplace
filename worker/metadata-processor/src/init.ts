import { Account, RpcProvider } from "starknet";
import { env, chainId } from "./env.ts";
import {
	type TokenFetcherState,
	initializeTokenFetcher,
	getToriiClients,
} from "./services/token-fetcher.ts";
import {
	type MetadataProcessorState,
	createMetadataProcessorState,
} from "./services/metadata-processor.ts";
import {
	type TokenSubscriptionState,
	createTokenSubscriptionState,
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