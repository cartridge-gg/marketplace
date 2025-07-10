import {
	Config,
	ConfigProvider,
	Effect,
	Layer,
	Context,
	Redacted,
} from "effect";
import { constants } from "starknet";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Get the directory of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Chain configuration
const ChainConfig = Config.all({
	chainId: Config.literal(
		"SN_MAIN",
		"SN_SEPOLIA",
	)("CHAIN_ID").pipe(
		Config.withDefault("SN_MAIN"),
		Config.withDescription("StarkNet chain ID"),
	),
	rpcUrl: Config.string("RPC_URL").pipe(
		Config.validate({
			message: "RPC_URL must be a valid URL",
			validation: (s) => {
				try {
					new URL(s);
					return true;
				} catch {
					return false;
				}
			},
		}),
		Config.withDescription("StarkNet RPC endpoint"),
	),
});

// Account configuration with sensitive data
const AccountConfig = Config.all({
	address: Config.string("ACCOUNT_ADDRESS").pipe(
		Config.validate({
			message: "ACCOUNT_ADDRESS must not be empty",
			validation: (s) => s.length > 0,
		}),
		Config.withDescription("Account address for sending transactions"),
	),
	privateKey: Config.redacted("ACCOUNT_PRIVATE_KEY").pipe(
		Config.validate({
			message: "ACCOUNT_PRIVATE_KEY must not be empty",
			validation: (s) => Redacted.value(s).length > 0,
		}),
		Config.withDescription("Private key for the account"),
	),
});

// Marketplace configuration
const MarketplaceConfig = Config.all({
	address: Config.string("MARKETPLACE_ADDRESS").pipe(
		Config.validate({
			message: "MARKETPLACE_ADDRESS must not be empty",
			validation: (s) => s.length > 0,
		}),
		Config.withDescription("Address of the marketplace contract"),
	),
	toriiUrl: Config.string("MARKETPLACE_TORII_URL").pipe(
		Config.withDefault("https://api.cartridge.gg/x/marketplace-mainnet/torii"),
		Config.validate({
			message: "MARKETPLACE_TORII_URL must be a valid URL",
			validation: (s) => {
				try {
					new URL(s);
					return true;
				} catch {
					return false;
				}
			},
		}),
		Config.withDescription("Marketplace Torii"),
	),
});

// Arcade configuration
const ArcadeConfig = Config.all({
	address: Config.string("ARCADE_ADDRESS").pipe(
		Config.validate({
			message: "ARCADE_ADDRESS must not be empty",
			validation: (s) => s.length > 0,
		}),
		Config.withDescription("Address of the arcade contract"),
	),
});

// Processing configuration
const ProcessingConfig = Config.all({
	batchSize: Config.number("BATCH_SIZE").pipe(
		Config.withDefault(10),
		Config.validate({
			message: "BATCH_SIZE must be positive",
			validation: (n) => n > 0,
		}),
		Config.withDescription("Number of tokens to process in parallel"),
	),
	tokenFetchBatchSize: Config.number("TOKEN_FETCH_BATCH_SIZE").pipe(
		Config.withDefault(5000),
		Config.validate({
			message: "TOKEN_FETCH_BATCH_SIZE must be positive",
			validation: (n) => n > 0,
		}),
		Config.withDescription("Number of tokens to fetch per batch from Torii"),
	),
	retryAttempts: Config.number("RETRY_ATTEMPTS").pipe(
		Config.withDefault(3),
		Config.validate({
			message: "RETRY_ATTEMPTS must be positive",
			validation: (n) => n > 0,
		}),
		Config.withDescription("Number of retry attempts for failed operations"),
	),
	retryDelay: Config.number("RETRY_DELAY").pipe(
		Config.withDefault(5000),
		Config.validate({
			message: "RETRY_DELAY must be positive",
			validation: (n) => n > 0,
		}),
		Config.withDescription("Delay between retries in milliseconds"),
	),
});

// Worker configuration
const WorkerConfig = Config.all({
	fetchInterval: Config.number("FETCH_INTERVAL").pipe(
		Config.withDefault(60),
		Config.validate({
			message: "FETCH_INTERVAL must be positive",
			validation: (n) => n > 0,
		}),
		Config.withDescription("Interval for periodic token fetching (minutes)"),
	),
	logLevel: Config.literal(
		"trace",
		"debug",
		"info",
		"warn",
		"error",
		"fatal",
	)("LOG_LEVEL").pipe(
		Config.withDefault("info"),
		Config.withDescription("Log level"),
	),
	nodeEnv: Config.literal(
		"development",
		"production",
		"test",
	)("NODE_ENV").pipe(
		Config.withDefault("development"),
		Config.withDescription("Node environment"),
	),
});

// Metadata configuration
const MetadataConfig = Config.all({
	fetchTimeout: Config.number("METADATA_FETCH_TIMEOUT").pipe(
		Config.withDefault(30000),
		Config.validate({
			message: "METADATA_FETCH_TIMEOUT must be positive",
			validation: (n) => n > 0,
		}),
		Config.withDescription("Timeout for metadata fetching (ms)"),
	),
	ipfsGateway: Config.string("IPFS_GATEWAY").pipe(
		Config.withDefault("https://ipfs.io/ipfs/"),
		Config.validate({
			message: "IPFS_GATEWAY must be a valid URL",
			validation: (s) => {
				try {
					new URL(s);
					return true;
				} catch {
					return false;
				}
			},
		}),
		Config.withDescription("IPFS gateway URL"),
	),
});

// Message batching configuration
const MessageConfig = Config.all({
	batchSize: Config.number("MESSAGE_BATCH_SIZE").pipe(
		Config.withDefault(500),
		Config.validate({
			message: "MESSAGE_BATCH_SIZE must be positive",
			validation: (n) => n > 0,
		}),
		Config.withDescription("Number of messages to send in a single batch"),
	),
});

// Project filtering configuration
const ProjectConfig = Config.all({
	ignoredProjects: Config.string("IGNORED_PROJECTS").pipe(
		Config.withDefault(""),
		Config.map((s) => (s ? s.split(",").map((p) => p.trim()) : [])),
		Config.withDescription("Comma-separated list of projects to ignore"),
	),
});

// Torii configuration per chain - static configuration
const ToriiConfig = Config.succeed({
	SN_MAIN: {
		toriiUrl: "https://api.cartridge.gg/x/arcade-mainnet/torii",
		worldAddress:
			"0x25c70b1422f7ee0bddb6a52b8d3c2f7251cc9e5b5b0401d5db18a37ca4e1f36",
	},
	SN_SEPOLIA: {
		toriiUrl: "https://api.cartridge.gg/x/arcade-sepolia/torii",
		worldAddress:
			"0x3907eb729c36d0e7e35b1c5570bb90e2a2fb4b7b7b97bae7b1c4b029b2a72a1",
	},
});

// Complete application configuration
const AppConfig = Config.all({
	chain: ChainConfig,
	account: AccountConfig,
	marketplace: MarketplaceConfig,
	arcade: ArcadeConfig,
	processing: ProcessingConfig,
	worker: WorkerConfig,
	metadata: MetadataConfig,
	message: MessageConfig,
	project: ProjectConfig,
	torii: ToriiConfig,
});

// Type definitions
export interface ChainConfig {
	readonly chainId: "SN_MAIN" | "SN_SEPOLIA";
	readonly rpcUrl: string;
}

export interface AccountConfig {
	readonly address: string;
	readonly privateKey: Redacted.Redacted<string>;
}

export interface MarketplaceConfig {
	readonly address: string;
	readonly toriiUrl: string;
}

export interface ArcadeConfig {
	readonly address: string;
}

export interface ProcessingConfig {
	readonly batchSize: number;
	readonly tokenFetchBatchSize: number;
	readonly retryAttempts: number;
	readonly retryDelay: number;
}

export interface WorkerConfig {
	readonly fetchInterval: number;
	readonly logLevel: "trace" | "debug" | "info" | "warn" | "error" | "fatal";
	readonly nodeEnv: "development" | "production" | "test";
}

export interface MetadataConfig {
	readonly fetchTimeout: number;
	readonly ipfsGateway: string;
}

export interface MessageConfig {
	readonly batchSize: number;
}

export interface ProjectConfig {
	readonly ignoredProjects: ReadonlyArray<string>;
}

export interface ToriiConfig {
	readonly [key: string]: {
		readonly toriiUrl: string;
		readonly worldAddress: string;
	};
}

export interface AppConfig {
	readonly chain: ChainConfig;
	readonly account: AccountConfig;
	readonly marketplace: MarketplaceConfig;
	readonly arcade: ArcadeConfig;
	readonly processing: ProcessingConfig;
	readonly worker: WorkerConfig;
	readonly metadata: MetadataConfig;
	readonly message: MessageConfig;
	readonly project: ProjectConfig;
	readonly torii: ToriiConfig;
}

// Service tags for dependency injection
export class ChainConfigService extends Context.Tag("ChainConfig")<
	ChainConfigService,
	ChainConfig
>() {}

export class AccountConfigService extends Context.Tag("AccountConfig")<
	AccountConfigService,
	AccountConfig
>() {}

export class MarketplaceConfigService extends Context.Tag("MarketplaceConfig")<
	MarketplaceConfigService,
	MarketplaceConfig
>() {}

export class ArcadeConfigService extends Context.Tag("ArcadeConfig")<
	ArcadeConfigService,
	ArcadeConfig
>() {}

export class ProcessingConfigService extends Context.Tag("ProcessingConfig")<
	ProcessingConfigService,
	ProcessingConfig
>() {}

export class WorkerConfigService extends Context.Tag("WorkerConfig")<
	WorkerConfigService,
	WorkerConfig
>() {}

export class MetadataConfigService extends Context.Tag("MetadataConfig")<
	MetadataConfigService,
	MetadataConfig
>() {}

export class MessageConfigService extends Context.Tag("MessageConfig")<
	MessageConfigService,
	MessageConfig
>() {}

export class ProjectConfigService extends Context.Tag("ProjectConfig")<
	ProjectConfigService,
	ProjectConfig
>() {}

export class ToriiConfigService extends Context.Tag("ToriiConfig")<
	ToriiConfigService,
	ToriiConfig
>() {}

export class AppConfigService extends Context.Tag("AppConfig")<
	AppConfigService,
	AppConfig
>() {}

// Custom ConfigProvider that loads from .env files
export const createDotenvConfigProvider = (): ConfigProvider.ConfigProvider => {
	// Try to load env files in order of preference
	const envFiles = [
		path.resolve(process.cwd(), ".env.local"),
		path.resolve(process.cwd(), ".env"),
		path.resolve(__dirname, "../.env.local"),
		path.resolve(__dirname, "../.env"),
	];

	let envVars: Record<string, string> = { ...process.env };

	// Try to load env files in order of preference
	for (const envFile of envFiles) {
		const result = dotenv.config({ path: envFile });
		if (!result.error && result.parsed) {
			envVars = { ...envVars, ...result.parsed };
			break;
		}
	}

	// Create a ConfigProvider from the merged environment variables
	return ConfigProvider.fromMap(new Map(Object.entries(envVars)));
};

// Create configuration layers
export const ChainConfigLive = Layer.effect(
	ChainConfigService,
	Effect.gen(function* () {
		return yield* Effect.configProviderWith((provider) =>
			provider.load(ChainConfig),
		);
	}),
);

export const AccountConfigLive = Layer.effect(
	AccountConfigService,
	Effect.gen(function* () {
		return yield* Effect.configProviderWith((provider) =>
			provider.load(AccountConfig),
		);
	}),
);

export const MarketplaceConfigLive = Layer.effect(
	MarketplaceConfigService,
	Effect.gen(function* () {
		return yield* Effect.configProviderWith((provider) =>
			provider.load(MarketplaceConfig),
		);
	}),
);

export const ArcadeConfigLive = Layer.effect(
	ArcadeConfigService,
	Effect.gen(function* () {
		return yield* Effect.configProviderWith((provider) =>
			provider.load(ArcadeConfig),
		);
	}),
);

export const ProcessingConfigLive = Layer.effect(
	ProcessingConfigService,
	Effect.gen(function* () {
		return yield* Effect.configProviderWith((provider) =>
			provider.load(ProcessingConfig),
		);
	}),
);

export const WorkerConfigLive = Layer.effect(
	WorkerConfigService,
	Effect.gen(function* () {
		return yield* Effect.configProviderWith((provider) =>
			provider.load(WorkerConfig),
		);
	}),
);

export const MetadataConfigLive = Layer.effect(
	MetadataConfigService,
	Effect.gen(function* () {
		return yield* Effect.configProviderWith((provider) =>
			provider.load(MetadataConfig),
		);
	}),
);

export const MessageConfigLive = Layer.effect(
	MessageConfigService,
	Effect.gen(function* () {
		return yield* Effect.configProviderWith((provider) =>
			provider.load(MessageConfig),
		);
	}),
);

export const ProjectConfigLive = Layer.effect(
	ProjectConfigService,
	Effect.gen(function* () {
		return yield* Effect.configProviderWith((provider) =>
			provider.load(ProjectConfig),
		);
	}),
);

export const ToriiConfigLive = Layer.effect(
	ToriiConfigService,
	Effect.gen(function* () {
		return yield* Effect.configProviderWith((provider) =>
			provider.load(ToriiConfig),
		);
	}),
);

export const AppConfigLive = Layer.effect(
	AppConfigService,
	Effect.gen(function* () {
		return yield* Effect.configProviderWith((provider) =>
			provider.load(AppConfig),
		);
	}),
);

// Complete configuration layer that includes dotenv loading
export const ConfigLive = Layer.provide(
	Layer.mergeAll(
		ChainConfigLive,
		AccountConfigLive,
		MarketplaceConfigLive,
		ArcadeConfigLive,
		ProcessingConfigLive,
		WorkerConfigLive,
		MetadataConfigLive,
		MessageConfigLive,
		ProjectConfigLive,
		ToriiConfigLive,
		AppConfigLive,
	),
	Layer.setConfigProvider(createDotenvConfigProvider()),
);

// Helper functions
export const getStarknetChainId = (
	chainId: "SN_MAIN" | "SN_SEPOLIA",
): constants.StarknetChainId => constants.StarknetChainId[chainId];

export const isProduction = (nodeEnv: string) => nodeEnv === "production";
export const isDevelopment = (nodeEnv: string) => nodeEnv === "development";

// Load and validate configuration
export const loadConfig = Effect.gen(function* () {
	const config = yield* Effect.configProviderWith((provider) =>
		provider.load(AppConfig),
	);
	yield* Effect.logInfo("Configuration loaded successfully");
	return config;
}).pipe(
	Effect.catchAll((error) =>
		Effect.gen(function* () {
			yield* Effect.logError("Failed to load configuration");
			yield* Effect.logError(error);
			return yield* Effect.fail(error);
		}),
	),
);

