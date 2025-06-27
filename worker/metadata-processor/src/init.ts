import { Account, RpcProvider, shortString } from "starknet";
import { env, chainId } from "./env.ts";
import {
	type TokenFetcherState,
	initializeTokenFetcher,
	getToriiClients,
} from "./services/token-fetcher.ts";
import { type TaskRunnerState, createTaskRunnerState } from "./tasks/index.ts";
import {
	type TokenSubscriptionState,
	createTokenSubscriptionState,
} from "./services/token-subscription.ts";
import { createLogger, type Logger } from "./utils/logger.ts";
import { init } from "@dojoengine/sdk/node";
import { SigningKey } from "@dojoengine/torii-wasm/node";
import type { SchemaType } from "@cartridge/marketplace-sdk";

/**
 * Worker state type
 */
export type WorkerState = {
	logger: Logger;
	tokenFetcherState: TokenFetcherState;
	taskRunnerState: TaskRunnerState;
	subscriptionState: TokenSubscriptionState;
	provider: RpcProvider;
	account: Account;
	intervalId?: NodeJS.Timeout;
};

export async function createMarketplaceClient() {
	return await init<SchemaType>({
		client: {
			toriiUrl: env.MARKETPLACE_TORII_URL,
			worldAddress: env.MARKETPLACE_ADDRESS,
		},
		domain: {
			name: "Marketplace",
			version: "1.0",
			chainId: shortString.encodeShortString(env.CHAIN_ID),
			revision: "1",
		},
		identity: env.ACCOUNT_ADDRESS,
		signer: new SigningKey(env.ACCOUNT_PRIVATE_KEY),
	});
}

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

	// Initialize task runner
	const taskRunnerState = createTaskRunnerState({
		provider,
		account,
		marketplaceAddress: env.MARKETPLACE_ADDRESS,
		client: await createMarketplaceClient(),
		batchSize: env.BATCH_SIZE,
	});

	// Initialize subscription service
	const subscriptionState = createTokenSubscriptionState({
		toriiClients: getToriiClients(tokenFetcherState),
		taskRunnerState,
	});

	return {
		logger,
		tokenFetcherState,
		taskRunnerState,
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
