import { Context, Effect, Layer } from "effect";
import { constants } from "starknet";
import { z } from "zod";
import { ConfigError } from "./errors.js";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Get the directory of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Config schema
const envSchema = z.object({
	// Chain configuration
	CHAIN_ID: z
		.enum(["SN_MAIN", "SN_SEPOLIA"])
		.default("SN_MAIN")
		.describe("StarkNet chain ID"),
	RPC_URL: z
		.string()
		.url()
		.default("https://api.cartridge.gg/rpc/starknet-mainnet")
		.describe("StarkNet RPC endpoint"),

	// Account configuration
	ACCOUNT_ADDRESS: z
		.string()
		.min(1)
		.describe("Account address for sending transactions"),
	ACCOUNT_PRIVATE_KEY: z
		.string()
		.min(1)
		.describe("Private key for the account"),

	// Marketplace contract address
	MARKETPLACE_ADDRESS: z
		.string()
		.min(1)
		.describe("Address of the marketplace contract"),

	MARKETPLACE_TORII_URL: z
		.string()
		.url()
		.default("https://api.cartridge.gg/x/marketplace-mainnet/torii")
		.describe("Marketplace Torii"),

	// Arcade contract address
	ARCADE_ADDRESS: z.string().min(1).describe("Address of the arcade contract"),

	// Processing configuration
	BATCH_SIZE: z
		.string()
		.transform((val) => Number.parseInt(val, 10))
		.pipe(z.number().positive())
		.default("10")
		.describe("Number of tokens to process in parallel"),
	TOKEN_FETCH_BATCH_SIZE: z
		.string()
		.transform((val) => Number.parseInt(val, 10))
		.pipe(z.number().positive())
		.default("5000")
		.describe("Number of tokens to fetch per batch from Torii"),
	RETRY_ATTEMPTS: z
		.string()
		.transform((val) => Number.parseInt(val, 10))
		.pipe(z.number().positive())
		.default("3")
		.describe("Number of retry attempts for failed operations"),
	RETRY_DELAY: z
		.string()
		.transform((val) => Number.parseInt(val, 10))
		.pipe(z.number().positive())
		.default("5000")
		.describe("Delay between retries in milliseconds"),

	// Worker configuration
	FETCH_INTERVAL: z
		.string()
		.transform((val) => Number.parseInt(val, 10))
		.pipe(z.number().positive())
		.default("60")
		.describe("Interval for periodic token fetching (minutes)"),
	LOG_LEVEL: z
		.enum(["trace", "debug", "info", "warn", "error", "fatal"])
		.default("info")
		.describe("Log level"),
	NODE_ENV: z
		.enum(["development", "production", "test"])
		.default("development")
		.describe("Node environment"),

	// Metadata fetching configuration
	METADATA_FETCH_TIMEOUT: z
		.string()
		.transform((val) => Number.parseInt(val, 10))
		.pipe(z.number().positive())
		.default("30000")
		.describe("Timeout for metadata fetching (ms)"),
	IPFS_GATEWAY: z
		.string()
		.url()
		.default("https://ipfs.io/ipfs/")
		.describe("IPFS gateway URL"),
});

export type Config = z.infer<typeof envSchema> & {
	chainId: constants.StarknetChainId;
	isProduction: boolean;
	isDevelopment: boolean;
};

// Service interface
export class ConfigService extends Context.Tag("ConfigService")<
	ConfigService,
	{
		readonly get: () => Config;
	}
>() {}

// Load environment variables
const loadEnv = Effect.sync(() => {
	const envFiles = [
		path.resolve(process.cwd(), ".env.local"),
		path.resolve(process.cwd(), ".env"),
		path.resolve(__dirname, "../../.env.local"),
		path.resolve(__dirname, "../../.env"),
	];

	// Try to load env files in order of preference
	let envLoaded = false;
	for (const envFile of envFiles) {
		const result = dotenv.config({ path: envFile });
		if (!result.error) {
			envLoaded = true;
			break;
		}
	}

	if (!envLoaded) {
		console.warn(
			"!  No .env file found. Using environment variables from shell.",
		);
	}
});

// Create config layer
export const ConfigLive = Layer.effect(
	ConfigService,
	Effect.gen(function* () {
		// Load environment variables
		yield* loadEnv;

		// Parse and validate
		const parsed = envSchema.safeParse(process.env);

		if (!parsed.success) {
			const issues = parsed.error.issues;
			const missing = issues
				.filter(
					(issue) =>
						issue.code === "invalid_type" && issue.received === "undefined",
				)
				.map((issue) => issue.path[0]);

			yield* Effect.fail(
				new ConfigError({
					message: `Invalid environment variables. Missing: ${missing.join(", ")}`,
				}),
			);
		}

		const env = parsed.data!;

		// Create config with derived values
		const config: Config = {
			...env,
			chainId: constants.StarknetChainId[env.CHAIN_ID],
			isProduction: env.NODE_ENV === "production",
			isDevelopment: env.NODE_ENV === "development",
		};

		return {
			get: () => config,
		};
	}),
);