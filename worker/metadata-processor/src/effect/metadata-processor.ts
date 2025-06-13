import { Context, Effect, Layer, Stream, Chunk } from "effect";
import { KeysClause, ToriiQueryBuilder, type SDK } from "@dojoengine/sdk/node";
import { BigNumberish, cairo, Account, RpcProvider, shortString } from "starknet";
import { type SchemaType } from "@cartridge/marketplace-sdk";
import { init } from "@dojoengine/sdk/node";
import { SigningKey } from "@dojoengine/torii-wasm/node";
import { ConfigService } from "./config.js";
import { ProcessingError, InitializationError } from "./errors.js";
import type { Token } from "./token-fetcher.js";

// Types
export type MetadataAttribute = {
	trait_type: string;
	value: string;
};

export type TokenMetadata = {
	name?: string;
	description?: string;
	image?: string;
	attributes?: MetadataAttribute[];
};

export type MetadataMessage = {
	identity: string;
	collection: string;
	token_id: { low: BigNumberish; high: BigNumberish };
	index: BigNumberish;
	trait_type: string;
	value: string;
};

// Service interface
export class MetadataProcessor extends Context.Tag("MetadataProcessor")<
	MetadataProcessor,
	{
		readonly processToken: (token: Token) => Effect.Effect<void, ProcessingError>;
		readonly processTokens: (tokens: readonly Token[]) => Effect.Effect<void, ProcessingError>;
		readonly processTokenStream: (tokens: Stream.Stream<Token>) => Effect.Effect<void, ProcessingError>;
		readonly isTokenProcessed: (token: Token) => Effect.Effect<boolean, ProcessingError>;
		readonly getProcessedCount: () => number;
	}
>() {}

// Internal state
type MetadataProcessorState = {
	provider: RpcProvider;
	account: Account;
	marketplaceAddress: string;
	processedTokens: Set<string>;
	client: SDK<SchemaType>;
	config: ReturnType<ConfigService["Type"]["get"]>;
};

const MetadataAttributeTyped = [
	{ name: "identity", type: "ContractAddress" },
	{ name: "collection", type: "felt" },
	{ name: "token_id", type: "u256" },
	{ name: "index", type: "u128" },
	{ name: "trait_type", type: "string" },
	{ name: "value", type: "string" },
];

// Helper functions
const getTokenKey = (token: Token): string =>
	`${token.contract_address}-${token.token_id}`;

const fetchTokenMetadata = (
	token: Token,
): Effect.Effect<TokenMetadata | null, ProcessingError> =>
	Effect.try({
		try: () => JSON.parse(token.metadata) as TokenMetadata,
		catch: (error) =>
			new ProcessingError({
				message: `Failed to parse metadata: ${error}`,
				tokenKey: getTokenKey(token),
			}),
	}).pipe(
		Effect.catchAll(() => Effect.succeed(null)),
	);

const createAttributeMessage = (
	token: Token,
	index: number,
	traitType: string,
	value: string,
	identity: string,
): MetadataMessage => {
	const tokenIdU256 = cairo.uint256(token.token_id);
	return {
		identity,
		collection: token.contract_address,
		token_id: { low: tokenIdU256.low, high: tokenIdU256.high },
		index,
		trait_type: traitType,
		value,
	};
};

const createMetadataMessages = (
	token: Token,
	metadata: TokenMetadata,
	identity: string,
): MetadataMessage[] => {
	const messages: MetadataMessage[] = [];

	// Handle attributes array
	if (metadata.attributes && Array.isArray(metadata.attributes)) {
		metadata.attributes.forEach((attr, index) => {
			messages.push(
				createAttributeMessage(
					token,
					index,
					attr.trait_type,
					attr.value,
					identity,
				),
			);
		});
	}

	return messages;
};

// Create service implementation
const makeMetadataProcessor = (
	state: MetadataProcessorState,
): MetadataProcessor["Type"] => {
	const isTokenProcessed = (token: Token) =>
		Effect.gen(function* () {
			const query = new ToriiQueryBuilder()
				.withClause(
					KeysClause(
						["MARKETPLACE-MetadataAttribute"],
						[state.config.ACCOUNT_ADDRESS, token.contract_address, token.token_id],
					).build(),
				)
				.withEntityModels(["MARKETPLACE-MetadataAttribute"]);
			
			const res = yield* Effect.tryPromise({
				try: () => state.client.getEntities({ query }),
				catch: (error) =>
					new ProcessingError({
						message: `Failed to check token status: ${error}`,
						tokenKey: getTokenKey(token),
					}),
			});

			return res.getItems().length > 0;
		});

	const publishMessages = (messages: MetadataMessage[]) =>
		Effect.gen(function* () {
			for (const message of messages) {
				const data = state.client.generateTypedData(
					"MARKETPLACE-MetadataAttribute",
					message,
					MetadataAttributeTyped,
				);

				const res = yield* Effect.tryPromise({
					try: () => state.client.sendMessage(data, state.account),
					catch: (error) =>
						new ProcessingError({
							message: `Failed to send metadata message: ${error}`,
						}),
				});

				if (res.isErr()) {
					yield* Effect.fail(
						new ProcessingError({
							message: `Failed to send metadata message: ${res.error}`,
						}),
					);
				}
			}
		});

	const processToken = (token: Token) =>
		Effect.gen(function* () {
			const tokenKey = getTokenKey(token);

			// Check if already processed
			const alreadyProcessed = yield* isTokenProcessed(token);
			if (alreadyProcessed) {
				return;
			}

			// Fetch metadata
			const metadata = yield* fetchTokenMetadata(token);
			if (!metadata) {
				return;
			}

			// Create and publish messages
			const messages = createMetadataMessages(
				token,
				metadata,
				state.config.ACCOUNT_ADDRESS,
			);
			
			if (messages.length > 0) {
				yield* publishMessages(messages);
			}

			// Mark as processed
			state.processedTokens.add(tokenKey);
		});

	return {
		processToken,
		
		processTokens: (tokens) =>
			Effect.forEach(
				tokens,
				(token) => processToken(token),
				{ concurrency: state.config.BATCH_SIZE },
			).pipe(Effect.asVoid),

		processTokenStream: (tokens) =>
			Stream.runForEach(
				tokens,
				(token) => processToken(token),
			),

		isTokenProcessed,
		
		getProcessedCount: () => state.processedTokens.size,
	};
};

// Initialize metadata processor
const initializeMetadataProcessor = Effect.gen(function* () {
	const config = yield* ConfigService;
	const configData = config.get();

	const provider = new RpcProvider({ nodeUrl: configData.RPC_URL });
	const account = new Account(
		provider,
		configData.ACCOUNT_ADDRESS,
		configData.ACCOUNT_PRIVATE_KEY,
	);

	const marketplaceClient = yield* Effect.tryPromise({
		try: () =>
			init<SchemaType>({
				client: {
					toriiUrl: configData.MARKETPLACE_TORII_URL,
					worldAddress: configData.MARKETPLACE_ADDRESS,
				},
				domain: {
					name: "Marketplace",
					version: "1.0",
					chainId: shortString.encodeShortString(configData.CHAIN_ID),
					revision: "1",
				},
				identity: configData.ACCOUNT_ADDRESS,
				signer: new SigningKey(configData.ACCOUNT_PRIVATE_KEY),
			}),
		catch: (error) =>
			new InitializationError({
				message: `Failed to initialize marketplace client: ${error}`,
			}),
	});

	const state: MetadataProcessorState = {
		provider,
		account,
		marketplaceAddress: configData.MARKETPLACE_ADDRESS,
		processedTokens: new Set(),
		client: marketplaceClient,
		config: configData,
	};

	return makeMetadataProcessor(state);
});

// Create the layer
export const MetadataProcessorLive = Layer.effect(
	MetadataProcessor,
	initializeMetadataProcessor,
);