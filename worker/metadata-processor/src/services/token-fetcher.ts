import { RpcProvider, type constants, type ProviderInterface } from "starknet";
import { createLogger, type Logger } from "../utils/logger.ts";
import {
	createArcadeRegistryState,
	createToriiClients,
	fetchEditions,
	initArcadeRegistry,
	type ArcadeRegistryState,
} from "./arcade.ts";
import type {
	ToriiClient,
	Token as ToriiToken,
} from "@dojoengine/torii-wasm/node";
import { env } from "../env.ts";
import type { EditionModel } from "@cartridge/arcade";

/**
 * Token type definition
 */
export type Token = ToriiToken;

/**
 * Token fetcher state type
 */
export type TokenFetcherState = {
	provider: ProviderInterface;
	logger: Logger;
	editions: Map<string, any>;
	toriiClients: Map<string, ToriiClient>;
	ignoreProjects: string[];
	registryState: ArcadeRegistryState;
};

/**
 * Token fetcher initialization options
 */
export type TokenFetcherOptions = {
	chainId: constants.StarknetChainId;
	provider: ProviderInterface;
	ignoreProjects?: string[];
};

/**
 * Creates a token fetcher state
 */
export function createTokenFetcherState(
	options: TokenFetcherOptions,
): TokenFetcherState {
	return {
		provider: options.provider || new RpcProvider({ nodeUrl: env.RPC_URL }),
		logger: createLogger("TokenFetcher"),
		editions: new Map(),
		toriiClients: new Map(),
		ignoreProjects: [
			...(options.ignoreProjects || []),
			...["populariumdemo-game", "dragark-mainnet-v11-3"],
		],
		registryState: createArcadeRegistryState(options.chainId),
	};
}

/**
 * Initializes the token fetcher
 */
export async function initializeTokenFetcher(
	options: TokenFetcherOptions,
): Promise<TokenFetcherState> {
	const state = createTokenFetcherState(options);
	state.logger.info("Initializing token fetcher...");

	// Initialize Arcade Registry using our Node.js compatible service
	await initArcadeRegistry(state.registryState);

	// Fetch all editions from the arcade registry
	await fetchEditions(state);

	// Create Torii clients for each edition
	await createToriiClients(state);

	state.logger.info(
		`Initialized with ${state.toriiClients.size} Torii clients`,
	);
	return state;
}

/**
 * Generator that yields token batches from a specific project
 */
export async function* fetchTokenBatchesFromProject(
	state: TokenFetcherState,
	projectId: string,
	client: ToriiClient,
	batchSize: number = 5000,
): AsyncGenerator<Token[], void, unknown> {
	state.logger.info(`Starting token fetch for project: ${projectId}`);
	
	try {
		yield* fetchPaginatedTokens(client, state.logger, batchSize);
	} catch (error) {
		state.logger.error(error, `Error querying tokens from ${projectId}`);
	}
}

/**
 * Generator function that yields tokens in batches
 */
async function* fetchPaginatedTokens(
	client: ToriiClient,
	logger: Logger,
	batchSize: number = 5000,
): AsyncGenerator<Token[], void, unknown> {
	let cursor: string | undefined = undefined;
	
	do {
		try {
			const response = await client.getTokens([], [], batchSize, cursor);
			const tokensWithMetadata = response.items.filter((t) => !!t.metadata);
			
			if (tokensWithMetadata.length > 0) {
				yield tokensWithMetadata;
			}
			
			cursor = response.next_cursor;
		} catch (e) {
			logger.warn("Failed fetching tokens batch", e);
			break;
		}
	} while (cursor);
}

/**
 * Generator that yields token batches from all Torii instances
 */
export async function* fetchAllTokenBatches(
	state: TokenFetcherState,
	batchSize: number = 5000,
): AsyncGenerator<{ projectId: string; tokens: Token[] }, void, unknown> {
	state.logger.info("Starting batch token fetch from all Torii instances...");
	
	const eligibleClients = Array.from(state.toriiClients.entries())
		.filter(([projectId, _client]) => !state.ignoreProjects.includes(projectId));
	
	for (const [projectId, client] of eligibleClients) {
		let batchCount = 0;
		let tokenCount = 0;
		
		for await (const batch of fetchTokenBatchesFromProject(state, projectId, client, batchSize)) {
			batchCount++;
			tokenCount += batch.length;
			yield { projectId, tokens: batch };
			
			state.logger.info(
				`Project ${projectId}: Yielded batch ${batchCount} with ${batch.length} tokens (total: ${tokenCount})`,
			);
		}
		
		if (tokenCount > 0) {
			state.logger.info(
				`Completed fetching from project ${projectId}: ${tokenCount} tokens in ${batchCount} batches`,
			);
		}
	}
}

/**
 * Fetches all tokens from all Torii instances (backward compatibility)
 * Note: This loads all tokens into memory. Consider using fetchAllTokenBatches for better memory efficiency.
 */
export async function fetchAllTokens(
	state: TokenFetcherState,
): Promise<Token[]> {
	state.logger.info("Fetching all tokens (legacy mode)...");
	const allTokens: Token[] = [];
	
	for await (const { tokens } of fetchAllTokenBatches(state)) {
		allTokens.push(...tokens);
	}
	
	state.logger.info(`Total tokens fetched: ${allTokens.length}`);
	return allTokens;
}

/**
 * Gets all Torii clients from the state
 */
export function getToriiClients(
	state: TokenFetcherState,
): Map<string, ToriiClient> {
	return state.toriiClients;
}

/**
 * Gets all editions from the state
 */
export function getEditions(
	state: TokenFetcherState,
): Map<string, EditionModel> {
	return state.editions;
}
