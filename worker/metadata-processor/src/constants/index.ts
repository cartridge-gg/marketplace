import { Effect } from "effect";
import { ToriiConfigService } from "../effect-config";

// Default ignored projects if not configured
export const DEFAULT_IGNORED_PROJECTS: string[] = [
	"zkube-budo-mainnet",
	"evolute-duel-arcade",
	"jokersofneondev",
	"jokersofneon",
	"budokan-mainnet-2",
	"ponziland-tourney-2-2",
];

// Metadata attribute typed data for signing
export const MetadataAttributeTypedData = [
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

// Get Torii configuration for a specific chain
export const getToriiConfig = (chainId: "SN_MAIN" | "SN_SEPOLIA") =>
	Effect.gen(function* () {
		const toriiConfig = yield* ToriiConfigService;
		return toriiConfig[chainId];
	});