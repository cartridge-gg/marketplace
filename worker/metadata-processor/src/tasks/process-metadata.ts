import { cairo, type BigNumberish } from "starknet";
import type { Token } from "@dojoengine/torii-wasm/node";

/**
 * Metadata attribute type
 */
export type MetadataAttribute = {
	trait_type?: string;
	trait?: string;
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
	[key: string]: any;
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
 * Creates a metadata attribute message
 */
export function createAttributeMessage(
	identity: string,
	token: Token,
	index: number,
	traitType: string,
	value: string,
): MetadataMessage {
	const tokenIdU256 = cairo.uint256(token.token_id);
	return {
		identity: identity,
		collection: token.contract_address,
		token_id: { low: tokenIdU256.low, high: tokenIdU256.high },
		index: index,
		trait_type: traitType,
		value: value,
	};
}

