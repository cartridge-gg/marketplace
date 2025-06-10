import { createLogger, type Logger } from "../utils/logger.ts";
import { type Token } from "./token-fetcher.ts";
import { CallData, hash, Account, RpcProvider } from "starknet";

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
	token_id: string;
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
};

/**
 * Metadata processor options
 */
export type MetadataProcessorOptions = {
	provider: RpcProvider;
	account: Account;
	marketplaceAddress: string;
	batchSize?: number;
};

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
	};
}

/**
 * Creates batches from an array
 */
export function createBatches<T>(items: T[], batchSize: number): T[][] {
	const batches: T[][] = [];
	for (let i = 0; i < items.length; i += batchSize) {
		batches.push(items.slice(i, i + batchSize));
	}
	return batches;
}

/**
 * Gets a unique token key
 */
export function getTokenKey(token: Token): string {
	return `${token.collection}-${token.tokenId}`;
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
 * Gets token URI from contract
 */
export async function getTokenURI(
	state: MetadataProcessorState,
	token: Token,
): Promise<string | null> {
	try {
		// Call the token contract to get the URI
		// This needs to be adapted based on the actual token contract interface
		// For ERC721/ERC1155, this would typically be tokenURI(tokenId)

		// Example placeholder - replace with actual contract call
		const result = await state.provider.callContract({
			contractAddress: token.collection,
			entrypoint: "tokenURI",
			calldata: CallData.compile({
				tokenId: token.tokenId,
			}),
		});

		// Parse the result to get the URI string
		// This will depend on how the URI is returned by the contract
		return ""; // Placeholder
	} catch (error) {
		state.logger.error(
			error,
			`Failed to get token URI for ${token.collection}-${token.tokenId}`,
		);
		return null;
	}
}

/**
 * Fetches token metadata from URI
 */
export async function fetchTokenMetadata(
	state: MetadataProcessorState,
	token: Token,
): Promise<TokenMetadata | null> {
	try {
		// First, get the token URI from the contract
		const tokenURI = await getTokenURI(state, token);

		if (!tokenURI) {
			return null;
		}

		// Fetch metadata from URI
		const response = await fetch(tokenURI);
		if (!response.ok) {
			throw new Error(`Failed to fetch metadata: ${response.statusText}`);
		}

		const metadata = (await response.json()) as TokenMetadata;
		return metadata;
	} catch (error) {
		state.logger.error(
			error,
			`Failed to fetch metadata for ${token.collection}-${token.tokenId}`,
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
	return {
		identity: hash.getSelectorFromName("metadata_attribute"),
		collection: token.collection,
		token_id: token.tokenId,
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

	// Create messages for basic metadata
	if (metadata.name) {
		messages.push(createAttributeMessage(token, 0, "name", metadata.name));
	}

	if (metadata.description) {
		messages.push(
			createAttributeMessage(token, 1, "description", metadata.description),
		);
	}

	if (metadata.image) {
		messages.push(createAttributeMessage(token, 2, "image", metadata.image));
	}

	// Create messages for attributes
	if (metadata.attributes && metadata.attributes.length > 0) {
		metadata.attributes.forEach((attr, index) => {
			messages.push(
				createAttributeMessage(
					token,
					index + 3, // Start after basic metadata
					attr.trait_type,
					attr.value,
				),
			);
		});
	}

	return messages;
}

/**
 * Sends metadata messages to the orderbook
 */
export async function sendMetadataMessages(
	state: MetadataProcessorState,
	messages: MetadataMessage[],
): Promise<void> {
	try {
		// Prepare the multicall to send all messages at once
		function createCall(message: MetadataMessage) {
			return {
				contractAddress: state.marketplaceAddress,
				entrypoint: "set_metadata_attribute", // Adjust based on actual contract interface
				calldata: CallData.compile(message),
			};
		}

		const calls = messages.map(createCall);

		// Execute the transaction
		const tx = await state.account.execute(calls);

		state.logger.info(
			`Sent ${messages.length} metadata messages. Transaction: ${tx.transaction_hash}`,
		);

		// Wait for transaction confirmation
		await state.provider.waitForTransaction(tx.transaction_hash);
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

		// Send messages to the orderbook
		if (messages.length > 0) {
			await sendMetadataMessages(state, messages);
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

	const batches = createBatches(tokens, state.batchSize);

	for (const batch of batches) {
		await processBatch(state, batch);
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

