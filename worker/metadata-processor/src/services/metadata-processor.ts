import type { SDK } from "@dojoengine/sdk/node";
import { env } from "../env.ts";
import { createLogger, type Logger } from "../utils/logger.ts";
import type { Token } from "./token-fetcher.ts";
import { BigNumberish, cairo, type Account, type RpcProvider } from "starknet";
import { type SchemaType } from "@cartridge/marketplace-sdk";

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
	index: number;
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
		type: "ContractAddress",
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
export function getTokenKey(token: Token): string {
	return `${token.contract_address}-${token.token_id}`;
}

/**
 * Checks if a token has been processed
 */
export function isTokenProcessed(
	state: MetadataProcessorState,
	token: Token,
): boolean {
	return state.processedTokens.has(getTokenKey(token));
}

/**
 * Marks a token as processed
 */
export function markTokenAsProcessed(
	state: MetadataProcessorState,
	token: Token,
): void {
	state.processedTokens.add(getTokenKey(token));
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
			value.forEach((attr, attrIndex) => {
				messages.push(
					createAttributeMessage(
						token,
						index + attrIndex + Object.keys(metadata).length,
						attr.trait_type,
						attr.value,
					),
				);
			});
		}
	});

	return messages;
}

/**
 * Sends metadata messages to the orderbook
 */
export async function publishOffchainMetadataMessages(
	state: MetadataProcessorState,
	messages: MetadataMessage[],
): Promise<void> {
	try {
		const sdk = state.client;
		for (const message of messages) {
			const data = sdk.generateTypedData(
				"MARKETPLACE-MetadataAttribute",
				message,
				MetadataAttributedataTyped,
			);
			await sdk.sendMessage(data);
		}

		state.logger.info(`Sent ${messages.length} metadata messages.`);
	} catch (error) {
		state.logger.error(error, "Failed to send metadata messages");
		throw error;
	}
}

/**
 * Processes a single token
 */
export async function processToken(
	state: MetadataProcessorState,
	token: Token,
): Promise<void> {
	const tokenKey = getTokenKey(token);

	// Skip if already processed
	if (isTokenProcessed(state, token)) {
		state.logger.debug(`Token ${tokenKey} already processed, skipping...`);
		return;
	}

	try {
		// Fetch token metadata
		const metadata = await fetchTokenMetadata(state, token);

		if (!metadata) {
			state.logger.warn(`No metadata found for token ${tokenKey}`);
			return;
		}

		// Create metadata messages
		const messages = createMetadataMessages(token, metadata);

		// Publish offchain messages
		if (messages.length > 0) {
			await publishOffchainMetadataMessages(state, messages);
		}

		// Mark as processed
		markTokenAsProcessed(state, token);
	} catch (error) {
		state.logger.error(error, `Failed to process token ${tokenKey}`);
	}
}

/**
 * Processes a batch of tokens
 */
export async function processBatch(
	state: MetadataProcessorState,
	tokens: Token[],
): Promise<void> {
	async function processTokenWrapper(token: Token): Promise<void> {
		return processToken(state, token);
	}

	const promises = tokens.map(processTokenWrapper);
	await Promise.all(promises);
}

/**
 * Processes all tokens
 */
export async function processTokens(
	state: MetadataProcessorState,
	tokens: Token[],
): Promise<void> {
	state.logger.info(`Processing metadata for ${tokens.length} tokens...`);

	for (const token of tokens) {
		await processToken(state, token);
	}

	state.logger.info(
		`Processed metadata for ${state.processedTokens.size} tokens`,
	);
}

/**
 * Gets the count of processed tokens
 */
export function getProcessedCount(state: MetadataProcessorState): number {
	return state.processedTokens.size;
}
