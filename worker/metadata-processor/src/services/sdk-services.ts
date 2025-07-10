import { Effect, Context, Layer, Redacted } from "effect";
import { init as initSDK, type SDK } from "@dojoengine/sdk/node";
import { Account, constants, RpcProvider, shortString } from "starknet";
import { SigningKey } from "@dojoengine/torii-wasm/node";
import type { SchemaType } from "@cartridge/marketplace";
import type { ArcadeSchemaType } from "./arcade";
import {
	ChainConfigService,
	AccountConfigService,
	MarketplaceConfigService,
	getStarknetChainId,
} from "../effect-config";
import { getToriiConfig } from "../constants";

// Define the ArcadeSDK service interface
export interface ArcadeSDKService {
	readonly sdk: SDK<ArcadeSchemaType>;
}

// Create the service tag using Context.Tag
export class ArcadeSDK extends Context.Tag("ArcadeSDK")<
	ArcadeSDK,
	ArcadeSDKService
>() {}

export interface MarketplaceSDKService {
	readonly sdk: SDK<SchemaType>;
}

export class MarketplaceSDK extends Context.Tag("MarketplaceSDK")<
	MarketplaceSDK,
	MarketplaceSDKService
>() {}

export interface MarketplaceAccountService {
	readonly account: Account;
}

export class MarketplaceAccount extends Context.Tag("MarketplaceAccount")<
	MarketplaceAccount,
	MarketplaceAccountService
>() {}

// Helper to initialize Arcade SDK
const initArcadeSDK = (
	chainId: constants.StarknetChainId,
	toriiUrl: string,
	worldAddress: string,
) =>
	Effect.tryPromise({
		try: () =>
			initSDK<ArcadeSchemaType>({
				client: {
					toriiUrl,
					worldAddress,
				},
				domain: {
					name: "Arcade",
					version: "1.0",
					chainId: shortString.decodeShortString(chainId),
					revision: "1",
				},
			}),
		catch: (error) => new Error(`Failed to initialize Arcade SDK: ${error}`),
	});

// Helper to initialize Marketplace SDK
const initMarketplaceSDK = () =>
	Effect.gen(function* () {
		const chainConfig = yield* ChainConfigService;
		const accountConfig = yield* AccountConfigService;
		const marketplaceConfig = yield* MarketplaceConfigService;

		return yield* Effect.tryPromise({
			try: () =>
				initSDK<SchemaType>({
					client: {
						toriiUrl: marketplaceConfig.toriiUrl,
						worldAddress: marketplaceConfig.address,
					},
					domain: {
						name: "Marketplace",
						version: "1.0",
						chainId: shortString.encodeShortString(chainConfig.chainId),
						revision: "1",
					},
					identity: accountConfig.address,
					signer: new SigningKey(Redacted.value(accountConfig.privateKey)),
				}),
			catch: (error) => new Error(`Failed to initialize Marketplace SDK: ${error}`),
		});
	});

// Create Marketplace Account
export const makeMarketplaceAccount = () =>
	Effect.gen(function* () {
		const chainConfig = yield* ChainConfigService;
		const accountConfig = yield* AccountConfigService;

		// Initialize provider and account
		const provider = new RpcProvider({ nodeUrl: chainConfig.rpcUrl });
		const account = new Account(
			provider,
			accountConfig.address,
			Redacted.value(accountConfig.privateKey),
		);
		return { account } satisfies MarketplaceAccountService;
	});

// Create the Arcade SDK implementation
export const makeArcadeSDK = () =>
	Effect.gen(function* () {
		const chainConfig = yield* ChainConfigService;
		const config = yield* getToriiConfig(chainConfig.chainId);
		const chainId = getStarknetChainId(chainConfig.chainId);
		const sdk = yield* initArcadeSDK(
			chainId,
			config.toriiUrl,
			config.worldAddress,
		);
		return { sdk } satisfies ArcadeSDKService;
	});

// Create the Marketplace SDK implementation
export const makeMarketplaceSDK = () =>
	Effect.gen(function* () {
		const sdk = yield* initMarketplaceSDK();
		return { sdk } satisfies MarketplaceSDKService;
	});

// Create the SDK layers
export const ArcadeSDKLive = Layer.effect(ArcadeSDK, makeArcadeSDK());
export const MarketplaceSDKLive = Layer.effect(MarketplaceSDK, makeMarketplaceSDK());
export const MarketplaceAccountLive = Layer.effect(
	MarketplaceAccount,
	makeMarketplaceAccount(),
);