import type { SDK } from "@dojoengine/sdk/node";
import type { Message } from "@dojoengine/torii-wasm";
import { createLogger, type Logger } from "../utils/logger.ts";
import type { Token } from "../services/token-fetcher.ts";
import { env } from "../env.ts";
import { cairo, type Account, type RpcProvider, hash } from "starknet";
import type { SchemaType } from "@cartridge/marketplace-sdk";
import { createMarketplaceClient } from "../init.ts";
import { createSignedMessage } from "../utils/signature.ts";

/**
 * Token integrity message type
 */
export type TokenIntegrityMessage = {
	identity: string;
	collection: string;
	token_id: { low: string; high: string };
	state: string;
};

/**
 * Token integrity state
 */
export type TokenIntegrityState = {
	provider: RpcProvider;
	account: Account;
	marketplaceAddress: string;
	logger: Logger;
	client: SDK<SchemaType>;
};

/**
 * Token integrity options
 */
export type TokenIntegrityOptions = {
	provider: RpcProvider;
	account: Account;
	marketplaceAddress: string;
	client: SDK<SchemaType>;
};

const TokenIntegrityTyped = [
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
		name: "state",
		type: "felt",
	},
];

/**
 * Creates token integrity state
 */
export function createTokenIntegrityState(
	options: TokenIntegrityOptions,
): TokenIntegrityState {
	return {
		provider: options.provider,
		account: options.account,
		marketplaceAddress: options.marketplaceAddress,
		logger: createLogger("TokenIntegrity"),
		client: options.client,
	};
}

/**
 * Computes a hash for token integrity
 */
async function computeTokenHash(token: Token): Promise<string> {
	const tokenData = [
		token.contract_address,
		token.token_id,
		`0x${hash.starknetKeccak(token.metadata).toString(16)}`,
	];

	return hash.computeHashOnElements(tokenData);
}

/**
 * Creates a token integrity message
 */
function createIntegrityMessage(
	token: Token,
	integrityHash: string,
): TokenIntegrityMessage {
	const tokenIdU256 = cairo.uint256(token.token_id);
	return {
		identity: env.ACCOUNT_ADDRESS,
		collection: token.contract_address,
		token_id: {
			low: tokenIdU256.low.toString(),
			high: tokenIdU256.high.toString(),
		},
		state: integrityHash,
	};
}

/**
 * Publishes token integrity to torii
 */
export async function publishTokenIntegrity(
	state: TokenIntegrityState,
	token: Token,
): Promise<void> {
	try {
		// Compute integrity hash
		const integrityHash = await computeTokenHash(token);

		// Create integrity message
		const message = createIntegrityMessage(token, integrityHash);

		// Generate typed data
		const data = state.client.generateTypedData(
			"MARKETPLACE-MetadataAttributeIntegrity",
			message,
			TokenIntegrityTyped,
		);

		// Send message
		const res = await state.client.sendMessage(data, state.account);
		if (res.isErr()) {
			throw res.error;
		}

		state.logger.debug(
			`Published integrity hash for token ${token.contract_address}:${token.token_id}`,
		);
	} catch (error) {
		state.logger.error(
			error,
			`Failed to publish integrity for token ${token.contract_address}:${token.token_id}`,
		);
		throw error;
	}
}

/**
 * Checks token integrity (main task function)
 */
export async function checkTokenIntegrity(
	state: TokenIntegrityState,
	token: Token,
): Promise<void> {
	const startTime = Date.now();

	try {
		state.logger.debug(
			`Checking integrity for token ${token.contract_address}:${token.token_id}`,
		);

		await publishTokenIntegrity(state, token);

		const duration = Date.now() - startTime;
		state.logger.debug(
			`Token integrity check completed in ${duration}ms for ${token.contract_address}:${token.token_id}`,
		);
	} catch (error) {
		state.logger.error(
			error,
			`Failed to check integrity for token ${token.contract_address}:${token.token_id}`,
		);
		// Re-throw to let the task runner handle it
		throw error;
	}
}

/**
 * Checks token integrity (main task function)
 */
export async function checkTokenIntegrityBatch(
	state: TokenIntegrityState,
	tokens: Token[],
): Promise<void> {
	const startTime = Date.now();

	try {
		state.logger.debug(`Checking integrity for tokens`);

		const data: Message[] = await Promise.all(
			tokens.map(async (t) => {
				const client = await createMarketplaceClient();
				const integrityHash = await computeTokenHash(t);
				const message = createIntegrityMessage(t, integrityHash);
				const typedData = client.generateTypedData(
					"MARKETPLACE-MetadataAttributeIntegrity",
					message,
					TokenIntegrityTyped,
				);
				return createSignedMessage(state.account, typedData);
			}),
		);

		// Send message
		const res = await state.client.sendSignedMessageBatch(data);
		if (res.isErr()) {
			state.logger.error("Failed to send integrity check messages");
			throw res.error;
		}

		const duration = Date.now() - startTime;
		state.logger.debug(
			`Token integrity check completed in ${duration}ms for batch`,
		);
	} catch (error) {
		state.logger.error(error, `Failed to check integrity for batch`);
		// Re-throw to let the task runner handle it
		throw error;
	}
}
