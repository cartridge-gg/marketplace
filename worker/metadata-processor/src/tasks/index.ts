import { type SDK } from "@dojoengine/sdk/node";
import { createLogger, type Logger } from "../utils/logger.ts";
import type { Token } from "../services/token-fetcher.ts";
import type { Account, RpcProvider } from "starknet";
import { type SchemaType } from "@cartridge/marketplace";

// Import tasks
import {
	checkTokenIntegrity,
	checkTokenIntegrityBatch,
	createTokenIntegrityState,
	type TokenIntegrityState,
} from "./check-token-integrity.ts";
import {
	processToken as processMetadata,
	processTokens as processMetadataBatch,
	createMetadataProcessorState,
	type MetadataProcessorState,
} from "./process-metadata.ts";
import { createMarketplaceClient } from "../init.ts";

/**
 * Task state that combines all task-specific states
 */
export type TaskRunnerState = {
	provider: RpcProvider;
	account: Account;
	marketplaceAddress: string;
	client: SDK<SchemaType>;
	logger: Logger;
	integrityState: TokenIntegrityState;
	metadataState: MetadataProcessorState;
};

/**
 * Task runner options
 */
export type TaskRunnerOptions = {
	provider: RpcProvider;
	account: Account;
	marketplaceAddress: string;
	client: SDK<SchemaType>;
	batchSize?: number;
};

/**
 * Task definition
 */
export type Task<TState> = {
	name: string;
	execute: (state: TState, token: Token) => Promise<void>;
};

/**
 * Creates task runner state
 */
export function createTaskRunnerState(
	options: TaskRunnerOptions,
): TaskRunnerState {
	const integrityState = createTokenIntegrityState({
		provider: options.provider,
		account: options.account,
		marketplaceAddress: options.marketplaceAddress,
		client: options.client,
	});

	const metadataState = createMetadataProcessorState({
		provider: options.provider,
		account: options.account,
		marketplaceAddress: options.marketplaceAddress,
		client: options.client,
		batchSize: options.batchSize,
	});

	return {
		provider: options.provider,
		account: options.account,
		marketplaceAddress: options.marketplaceAddress,
		client: options.client,
		logger: createLogger("TaskRunner"),
		integrityState,
		metadataState,
	};
}

/**
 * Defines the tasks to run in order
 */
const tasks: Array<Task<TaskRunnerState>> = [
	{
		name: "check-token-integrity",
		execute: async (state, token) => {
			await checkTokenIntegrity(state.integrityState, token);
		},
	},
	{
		name: "process-metadata",
		execute: async (state, token) => {
			await processMetadata(state.metadataState, token);
		},
	},
];

/**
 * Runs all tasks sequentially for a single token
 */
export async function runTasksForToken(
	state: TaskRunnerState,
	token: Token,
): Promise<void> {
	const tokenKey = `${token.contract_address}:${token.token_id}`;
	state.logger.debug(`Running tasks for token ${tokenKey}`);

	for (const task of tasks) {
		state.client = await createMarketplaceClient();
		try {
			state.logger.debug(`Running task '${task.name}' for token ${tokenKey}`);
			await task.execute(state, token);
			state.logger.debug(`Task '${task.name}' completed for token ${tokenKey}`);
		} catch (error) {
			state.logger.error(
				error,
				`Task '${task.name}' failed for token ${tokenKey}`,
			);
			// Stop processing further tasks for this token if one fails
			throw error;
		}
	}

	state.logger.debug(`All tasks completed for token ${tokenKey}`);
}

/**
 * Runs all tasks for a batch of tokens
 */
export async function runTasksForTokenBatch(
	state: TaskRunnerState,
	tokens: Token[],
): Promise<void> {
	state.logger.info(`Running tasks for ${tokens.length} tokens`);

	// For batch processing, we still use the optimized batch processor for metadata
	// but run integrity checks individually first
	const startTime = Date.now();

	// First, run integrity checks for all tokens

	try {
		state.integrityState.client = await createMarketplaceClient();
		await checkTokenIntegrityBatch(state.integrityState, tokens);
	} catch (error) {
		state.logger.error(error, `Integrity check failed for token`);
	}

	// Then, process metadata in batch (more efficient)
	state.metadataState.client = await createMarketplaceClient();
	await processMetadataBatch(state.metadataState, tokens);

	const duration = Date.now() - startTime;
	state.logger.info(
		`Completed all tasks for ${tokens.length} tokens in ${duration}ms`,
	);
}

// Re-export the state types for external use
export type { MetadataProcessorState } from "./process-metadata.ts";
export { createMetadataProcessorState } from "./process-metadata.ts";
export { getProcessedCount } from "./process-metadata.ts";
