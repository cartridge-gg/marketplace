import {
	KeysClause,
	OrComposeClause,
	ToriiQueryBuilder,
	type SDK,
} from "@dojoengine/sdk/node";
import { env } from "../env.ts";
import { createLogger, type Logger } from "../utils/logger.ts";
import type { Token } from "../services/token-fetcher.ts";
import {
	cairo,
	type BigNumberish,
	type Account,
	type RpcProvider,
} from "starknet";
import type { SchemaType } from "@cartridge/marketplace-sdk";

/**
 * Metadata attribute type
 */
export type MetadataAttribute = {
	trait_type: string;
	value: string;
};

/**
 * Token metadata type
 */
export type TokenMetadata = {
	name?: string;
	description?: string;
	image?: string;
	attributes?: MetadataAttribute[];
};

/**
 * Metadata message type for orderbook
 */
export type MetadataMessage = {
	identity: string;
	collection: string;
	token_id: { low: BigNumberish; high: BigNumberish };
	index: BigNumberish;
	trait_type: string;
	value: string;
};

/**
 * Metadata processor state
 */
export type MetadataProcessorState = {
	provider: RpcProvider;
	account: Account;
	marketplaceAddress: string;
	processedTokens: Set<string>;
	logger: Logger;
	batchSize: number;
	client: SDK<SchemaType>;
};

/**
 * Metadata processor options
 */
export type MetadataProcessorOptions = {
	provider: RpcProvider;
	account: Account;
	marketplaceAddress: string;
	client: SDK<SchemaType>;
	batchSize?: number;
};

const MetadataAttributedataTyped = [
	{
		name: "identity",
		type: "ContractAddress",
	},
	{
		name: "collection",
		type: "felt",
	},
	{
		name: "token_id",
		type: "u256",
	},
	{
		name: "index",
		type: "u128",
	},
	{
		name: "trait_type",
		type: "string",
	},
	{
		name: "value",
		type: "string",
	},
];

/**
 * Creates metadata processor state
 */
export function createMetadataProcessorState(
	options: MetadataProcessorOptions,
): MetadataProcessorState {
	return {
		provider: options.provider,
		account: options.account,
		marketplaceAddress: options.marketplaceAddress,
		processedTokens: new Set(),
		logger: createLogger("MetadataProcessor"),
		batchSize: options.batchSize || 10,
		client: options.client,
	};
}

/**
 * Gets a unique token key
 */
export function getTokenKey(token: Token): string[] {
	return [token.contract_address, token.token_id];
}

/**
 * Checks if a token has been processed
 */
export async function isTokenProcessed(
	state: MetadataProcessorState,
	token: Token,
): Promise<boolean> {
	const query = new ToriiQueryBuilder()
		.withClause(
			OrComposeClause([
				KeysClause(["MARKETPLACE-MetadataAttribute"], getTokenKey(token)),
			]).build(),
		)
		.withEntityModels(["MARKETPLACE-MetadataAttribute"]);
	const res = await state.client.getEntities({ query });

	return res.getItems().length > 0;
}

/**
 * Fetches token metadata from URI
 */
export async function fetchTokenMetadata(
	state: MetadataProcessorState,
	token: Token,
): Promise<TokenMetadata | null> {
	try {
		const metadata = JSON.parse(token.metadata);
		return metadata;
	} catch (error) {
		state.logger.error(
			error,
			`Failed to fetch metadata for ${token.contract_address}-${token.token_id}`,
		);
		return null;
	}
}

/**
 * Creates a metadata attribute message
 */
export function createAttributeMessage(
	token: Token,
	index: number,
	traitType: string,
	value: string,
): MetadataMessage {
	const tokenIdU256 = cairo.uint256(token.token_id);
	return {
		identity: env.ACCOUNT_ADDRESS,
		collection: token.contract_address,
		token_id: { low: tokenIdU256.low, high: tokenIdU256.high },
		index: index,
		trait_type: traitType,
		value: value,
	};
}

/**
 * Creates metadata messages from token metadata
 */
export function createMetadataMessages(
	token: Token,
	metadata: TokenMetadata,
): MetadataMessage[] {
	const messages: MetadataMessage[] = [];

	// Iterate over all metadata keys
	Object.keys(metadata).forEach((key, index) => {
		const value = metadata[key as keyof TokenMetadata];

		if (key === "attributes" && Array.isArray(value)) {
			// Handle attributes array specially
			value.forEach((attr: any, attrIndex) => {
				const traitType = attr.trait_type ?? attr.trait ?? 'unknown';
				messages.push(
					createAttributeMessage(
						token,
						index + attrIndex + Object.keys(metadata).length,
						traitType,
						attr.value,
					),
				);
			});
		}
	});

	return messages;
}

/**
 * Helper function to chunk an array into smaller arrays
 */
function chunkArray<T>(array: T[], chunkSize: number): T[][] {
	const chunks: T[][] = [];
	for (let i = 0; i < array.length; i += chunkSize) {
		chunks.push(array.slice(i, i + chunkSize));
	}
	return chunks;
}

/**
 * Sends metadata messages to the orderbook
 */
export async function publishOffchainMetadataMessagesBatch(
	state: MetadataProcessorState,
	messages: MetadataMessage[],
): Promise<void> {
	try {
		const sdk = state.client;
		const batchSize = env.MESSAGE_BATCH_SIZE;

		// Split messages into batches
		const batches = chunkArray(messages, batchSize);
		state.logger.info(
			`Processing ${messages.length} messages in ${batches.length} batches of up to ${batchSize} messages each`,
		);

		// Process each batch sequentially
		for (const [batchIndex, batch] of batches.entries()) {
			state.logger.debug(
				`Processing batch ${batchIndex + 1}/${batches.length} with ${batch.length} messages`,
			);

			const batchData = batch.map((message) =>
				sdk.generateTypedData(
					"MARKETPLACE-MetadataAttribute",
					message,
					MetadataAttributedataTyped,
				),
			);
			const res = await sdk.sendMessageBatch(batchData, state.account);
			if (res.isErr()) {
				throw res.error;
			}

			state.logger.debug(`Completed batch ${batchIndex + 1}/${batches.length}`);
		}

		state.logger.info(
			`Successfully sent all ${messages.length} metadata messages`,
		);
	} catch (error) {
		state.logger.error(error, "Failed to send metadata messages");
		throw error;
	}
}

/**
 * Processes a single token and returns its messages
 */
export async function processTokenForMessages(
	state: MetadataProcessorState,
	token: Token,
): Promise<MetadataMessage[]> {
	const tokenKey = getTokenKey(token);
	// Fetch token metadata
	const metadata = await fetchTokenMetadata(state, token);

	// Skip if already processed
	if (await isTokenProcessed(state, token)) {
		state.logger.debug(`Token ${tokenKey} already processed, skipping...`);
		return [];
	}

	try {
		if (!metadata) {
			state.logger.warn(`No metadata found for token ${tokenKey}`);
			return [];
		}

		// Create metadata messages
		const messages = createMetadataMessages(token, metadata);
		return messages;
	} catch (error) {
		state.logger.error(error, `Failed to process token ${tokenKey}`);
		return [];
	}
}

/**
 * Processes a single token (for real-time updates)
 */
export async function processToken(
	state: MetadataProcessorState,
	token: Token,
): Promise<void> {
	const messages = await processTokenForMessages(state, token);

	// Publish offchain messages
	if (messages.length > 0) {
		await publishOffchainMetadataMessagesBatch(state, messages);
	}
}

/**
 * Processes all tokens in a batch
 */
export async function processTokens(
	state: MetadataProcessorState,
	tokens: Token[],
): Promise<void> {
	state.logger.info(`Processing metadata for ${tokens.length} tokens...`);

	// Collect all messages from all tokens
	const allMessages: MetadataMessage[] = [];
	let processedCount = 0;

	for (const token of tokens) {
		const messages = await processTokenForMessages(state, token);
		if (messages.length > 0) {
			allMessages.push(...messages);
			processedCount++;
		}
	}

	// Send all messages in a single batch
	if (allMessages.length > 0) {
		state.logger.info(
			`Sending ${allMessages.length} messages from ${processedCount} tokens in batch`,
		);
		await publishOffchainMetadataMessagesBatch(state, allMessages);
	}

	state.logger.info(`Processed metadata for ${processedCount} tokens`);
}

/**
 * Gets the count of processed tokens
 */
export async function getProcessedCount(
	state: MetadataProcessorState,
): Promise<number> {
	const query = new ToriiQueryBuilder()
		.withClause(
			KeysClause(
				["MARKETPLACE-MetadataAttribute"],
				[undefined, undefined, undefined, undefined],
				"FixedLen",
			).build(),
		)
		.withEntityModels(["MARKETPLACE-MetadataAttribute"]);
	const res = await state.client.getEntities({ query });

	return res.getItems().length;
}
