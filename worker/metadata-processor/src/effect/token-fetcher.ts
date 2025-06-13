import { Context, Effect, Layer, Stream, Chunk, Option } from "effect";
import { RpcProvider, type constants, type ProviderInterface } from "starknet";
import type { ToriiClient, Token as ToriiToken } from "@dojoengine/torii-wasm/node";
import type { EditionModel } from "@cartridge/arcade";
import { ConfigService } from "./config.js";
import { FetchError, InitializationError } from "./errors.js";
import {
	createArcadeRegistryState,
	createToriiClients as createToriiClientsOriginal,
	fetchEditions as fetchEditionsOriginal,
	initArcadeRegistry,
	type ArcadeRegistryState,
} from "../services/arcade.js";

export type Token = ToriiToken;

export type TokenBatch = {
	projectId: string;
	tokens: Token[];
};

// Service interface
export class TokenFetcher extends Context.Tag("TokenFetcher")<
	TokenFetcher,
	{
		readonly fetchAllBatches: (
			batchSize?: number,
		) => Stream.Stream<TokenBatch, FetchError>;
		readonly fetchAllTokens: () => Effect.Effect<readonly Token[], FetchError>;
		readonly getToriiClients: () => Map<string, ToriiClient>;
		readonly getEditions: () => Map<string, EditionModel>;
		readonly ignoreProjects: readonly string[];
	}
>() {}

// Internal state
type TokenFetcherState = {
	provider: ProviderInterface;
	editions: Map<string, EditionModel>;
	toriiClients: Map<string, ToriiClient>;
	ignoreProjects: string[];
	registryState: ArcadeRegistryState;
};

// Fetch tokens from a single project as a stream
const fetchTokenBatchesFromProject = (
	state: TokenFetcherState,
	projectId: string,
	client: ToriiClient,
	batchSize: number,
): Stream.Stream<Token[], FetchError> => {
	const fetchBatch = (cursor: string | undefined): Effect.Effect<{ tokens: Token[]; nextCursor: string | undefined }, FetchError> =>
		Effect.tryPromise({
			try: async () => {
				const response = await client.getTokens([], [], batchSize, cursor);
				const tokensWithMetadata = response.items.filter((t) => !!t.metadata);
				return { tokens: tokensWithMetadata, nextCursor: response.next_cursor };
			},
			catch: (error) =>
				new FetchError({
					message: `Failed to fetch tokens from ${projectId}: ${error}`,
					projectId,
				}),
		});

	return Stream.paginateEffect(
		Option.none<string>(),
		(cursorOption) => {
			const cursor = Option.getOrUndefined(cursorOption);
			return fetchBatch(cursor).pipe(
				Effect.map(({ tokens, nextCursor }) => {
					if (tokens.length === 0 && !nextCursor) {
						return [Chunk.empty<Token[]>(), Option.none<string>()] as const;
					}
					return [
						Chunk.of(tokens), 
						nextCursor ? Option.some(nextCursor) : Option.none<string>()
					] as const;
				}),
			);
		},
	).pipe(Stream.filter((tokens) => tokens.length > 0));
};

// Create the service implementation
const makeTokenFetcher = (
	state: TokenFetcherState,
): TokenFetcher["Type"] => ({
	fetchAllBatches: (batchSize = 5000) => {
		const eligibleClients = Array.from(state.toriiClients.entries()).filter(
			([projectId]) => !state.ignoreProjects.includes(projectId),
		);

		return Stream.flatMap(
			Stream.fromIterable(eligibleClients),
			([projectId, client]) =>
				Stream.map(
					fetchTokenBatchesFromProject(state, projectId, client, batchSize),
					(tokens): TokenBatch => ({ projectId, tokens }),
				).pipe(
					Stream.catchAll((error) => {
						// Log the error but continue with other projects
						Effect.runSync(Effect.logError(`Failed to fetch from ${projectId}: ${error.message}`));
						return Stream.empty;
					})
				),
		);
	},

	fetchAllTokens: () =>
		Effect.gen(function* () {
			const batchStream = makeTokenFetcher(state).fetchAllBatches();
			const batches = yield* Stream.runCollect(batchStream);
			return Array.from(batches).flatMap((batch) => batch.tokens);
		}),

	getToriiClients: () => state.toriiClients,
	getEditions: () => state.editions,
	ignoreProjects: state.ignoreProjects,
});

// Initialize token fetcher
const initializeTokenFetcher = Effect.gen(function* () {
	const config = yield* ConfigService;
	const { chainId, RPC_URL: rpcUrl } = config.get();

	const provider = new RpcProvider({ nodeUrl: rpcUrl });
	const registryState = createArcadeRegistryState(chainId);
	
	// Initialize Arcade Registry
	yield* Effect.tryPromise({
		try: () => initArcadeRegistry(registryState),
		catch: (error) =>
			new InitializationError({
				message: `Failed to initialize Arcade Registry: ${error}`,
			}),
	});

	// Create initial state
	const state: TokenFetcherState = {
		provider,
		editions: new Map(),
		toriiClients: new Map(),
		ignoreProjects: ["populariumdemo-game", "dragark-mainnet-v11-3", "dragark-mainnet-v11-6"],
		registryState,
	};

	// Add logger to match the expected type
	(state as any).logger = { info: () => {}, error: () => {}, debug: () => {}, warn: () => {} };

	// Fetch editions
	yield* Effect.tryPromise({
		try: () => fetchEditionsOriginal(state as any),
		catch: (error) =>
			new InitializationError({
				message: `Failed to fetch editions: ${error}`,
			}),
	});

	// Create Torii clients
	yield* Effect.tryPromise({
		try: () => createToriiClientsOriginal(state as any),
		catch: (error) =>
			new InitializationError({
				message: `Failed to create Torii clients: ${error}`,
			}),
	});

	return makeTokenFetcher(state);
});

// Create the layer
export const TokenFetcherLive = Layer.effect(
	TokenFetcher,
	initializeTokenFetcher,
);