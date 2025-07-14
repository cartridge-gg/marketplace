import { Effect } from "effect";
import { AccountInterface, TypedData } from "starknet";
import { Message, type Token } from "@dojoengine/torii-wasm/node";
import type { SDK } from "@dojoengine/sdk/node";
import type { SchemaType } from "@cartridge/marketplace";
import {
	createAttributeMessage,
	type MetadataAttribute,
	type TokenMetadata,
} from "../tasks/process-metadata";
import { createSignedMessage } from "../utils/signature";
import {
	MarketplaceSDK,
	MarketplaceAccount,
	makeMarketplaceSDK,
} from "./sdk-services";
import { MetadataAttributeTypedData } from "../constants";
import { AccountConfigService, ConfigLive } from "../effect-config";

// Fetch token metadata
const fetchTokenMetadata = (token: Token) =>
	Effect.try({
		try: () => {
			return JSON.parse(token.metadata);
		},
		catch: (error) => new Error(`Failed to parse token metadata ${error}`),
	});

// Create signed message effect
const createSignedMessageEffect = (
	account: AccountInterface,
	typedData: TypedData,
) =>
	Effect.tryPromise({
		try: () => createSignedMessage(account, typedData),
		catch: (error) => new Error(`Failed to create signed message: ${error}`),
	});

// Generate typed data effect
const generateTypedDataEffect = (
	sdk: SDK<SchemaType>,
	identity: string,
	metadata: TokenMetadata,
	attr: MetadataAttribute,
	attrIndex: number,
	idx: number,
	token: Token,
	traitType: string,
) =>
	Effect.try({
		try: () =>
			sdk.generateTypedData(
				"MARKETPLACE-MetadataAttribute",
				createAttributeMessage(
					identity,
					token,
					idx + attrIndex + Object.keys(metadata).length,
					traitType,
					attr.value,
				),
				MetadataAttributeTypedData,
			),
		catch: (error) => new Error(`Failed to generate typedData ${error}`),
	});

// Create attribute signed message
const createAttributeSignedMessage = (
	metadata: TokenMetadata,
	attr: MetadataAttribute,
	attrIndex: number,
	idx: number,
	token: Token,
) =>
	Effect.gen(function* () {
		const sdk = (yield* MarketplaceSDK).sdk;
		const account = (yield* MarketplaceAccount).account;
		const identity = (yield* AccountConfigService).address;
		const traitType = attr.trait_type ?? attr.trait ?? "unknown";
		const typedData = yield* generateTypedDataEffect(
			sdk,
			identity,
			metadata,
			attr,
			attrIndex,
			idx,
			token,
			traitType,
		);
		return yield* createSignedMessageEffect(account, typedData);
	});

// Create metadata messages
const createMetadataMessages = (token: Token, metadata: TokenMetadata) =>
	Effect.gen(function* () {
		const messages: Message[] = [];
		const entries = Object.keys(metadata).entries();

		for (const [idx, key] of Array.from(entries)) {
			const value = metadata[key as keyof TokenMetadata];

			if (key === "attributes" && Array.isArray(value) && value.length > 0) {
				const attributeEffects = value.map(
					(attr: MetadataAttribute, attrIndex: number) =>
						createAttributeSignedMessage(metadata, attr, attrIndex, idx, token),
				);

				const attributeMessages = yield* Effect.all(attributeEffects);
				messages.push(...attributeMessages);
			}
		}

		return messages;
	});

// Generate token message
const generateTokenMessage = (token: Token) =>
	Effect.gen(function* () {
		const metadata = yield* fetchTokenMetadata(token);
		return yield* createMetadataMessages(token, metadata);
	});

// Process token messages
export const processTokenMessages = (token: Token) =>
	Effect.gen(function* () {
		const messages = yield* generateTokenMessage(token);
		return messages;
	});

// Publish offchain messages batch
const publishOffchainMessagesBatch = (
	sdk: SDK<SchemaType>,
	messages: Message[],
) =>
	Effect.tryPromise({
		try: async () => {
			const res = await sdk.sendSignedMessageBatch(messages);
			if (!res.isOk()) {
				throw new Error(res.error);
			}
			return res.value;
		},
		catch: (err) =>
			new Error(`Failed to publish batch offchain messages ${err}`),
	});

// Publish messages
export const publishMessages = (messages: Message[]) =>
	Effect.gen(function* () {
		// TODO: Use this when dojo.c removes lock on function
		// const sdk = (yield* MarketplaceSDK).sdk
		// TODO: Avoid client creation on each iteration.
		const sdk = (yield* makeMarketplaceSDK()).sdk;
		yield* Effect.logDebug(`Publishing ${messages.length} messages`);
		yield* publishOffchainMessagesBatch(sdk, messages);
	});

