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
 * Fetches tokens from a specific project
 */
export async function fetchTokensFromProject(
	state: TokenFetcherState,
	projectId: string,
	client: ToriiClient,
): Promise<Token[]> {
	try {
		return await fetchPaginatedTokens(client, state.logger, [], undefined);
	} catch (error) {
		state.logger.error(error, `Error querying tokens from ${projectId}`);
		return [];
	}
}

async function fetchPaginatedTokens(
	client: ToriiClient,
	logger: Logger,
	init: ToriiToken[],
	cursor: string | undefined,
): Promise<Token[]> {
	try {
		const tokens = await client.getTokens([], [], 5000, cursor);
		if (tokens.next_cursor) {
			return fetchPaginatedTokens(
				client,
				logger,
				[...init, ...tokens.items.filter((t) => !!t.metadata)],
				tokens.next_cursor,
			);
		}
		return [...init, ...tokens.items.filter((t) => !!t.metadata)];
	} catch (e) {
		logger.warn("failed fetching tokens", e);
	}
}

/**
 * Fetches all tokens from all Torii instances
 */
export async function fetchAllTokens(
	state: TokenFetcherState,
): Promise<Token[]> {
	state.logger.info("Fetching tokens from all Torii instances...");
	const allTokens: Token[] = [];

	async function fetchFromProject([projectId, client]: [
		string,
		ToriiClient,
	]): Promise<void> {
		try {
			const tokens = await fetchTokensFromProject(state, projectId, client);
			allTokens.push(...tokens);
			state.logger.info(
				`Fetched ${tokens.length} tokens from project: ${projectId}`,
			);
		} catch (error) {
			state.logger.error(error, `Failed to fetch tokens from ${projectId}`);
		}
	}

	const fetchPromises = Array.from(state.toriiClients.entries())
		.filter(([projectId, _client]) => !state.ignoreProjects.includes(projectId))
		.map(fetchFromProject);
	await Promise.all(fetchPromises);

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
