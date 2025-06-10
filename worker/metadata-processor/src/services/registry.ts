import {
	type AccessModel,
	type EditionModel,
	type GameModel,
	type RegistryModel,
} from "@cartridge/arcade";
import {
	type SchemaType as ISchemaType,
	KeysClause,
	type ParsedEntity,
	type SDK,
	ToriiQueryBuilder,
	init as initSDK,
} from "@dojoengine/sdk/node";
import { type constants, shortString } from "starknet";
import { type Logger, createLogger } from "../utils/logger.ts";

// TODO: use imports from Arcade, when rewriting with torii-wasm is done
export const NAMESPACE = "ARCADE";
export enum ModelsMapping {
	Access = "Access",
	Game = "Game",
	Edition = "Edition",
}

/**
 * Arcade schema type definition
 */
export interface ArcadeSchemaType extends ISchemaType {
	ARCADE: {
		Access: {
			[field: string]: any;
		};
		Game: {
			[field: string]: any;
		};
		Edition: {
			[field: string]: any;
		};
	};
}

/**
 * Registry service state
 */
export type RegistryState = {
	sdk: SDK<ArcadeSchemaType> | null;
	logger: Logger;
	chainId: constants.StarknetChainId;
};

/**
 * Registry fetch options
 */
export type FetchOptions = {
	access?: boolean;
	game?: boolean;
	edition?: boolean;
};

/**
 * Torii configuration for different chains
 */
const TORII_CONFIG = {
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
} as const;

/**
 * Creates registry state
 */
export function createRegistryState(
	chainId: constants.StarknetChainId,
): RegistryState {
	return {
		sdk: null,
		logger: createLogger("Registry"),
		chainId,
	};
}

/**
 * Gets torii configuration for chain
 */
export function getToriiConfig(chainId: constants.StarknetChainId) {
	const chainName = chainId === "0x534e5f4d41494e" ? "SN_MAIN" : "SN_SEPOLIA";
	return TORII_CONFIG[chainName];
}

/**
 * Initializes the registry SDK
 */
export async function initRegistry(state: RegistryState): Promise<void> {
	try {
		const config = getToriiConfig(state.chainId);

		state.logger.info("Initializing Registry SDK...");

		state.sdk = await initSDK({
			client: {
				toriiUrl: config.toriiUrl,
				worldAddress: config.worldAddress,
			},
			domain: {
				name: "Arcade",
				version: "1.0",
				chainId: shortString.decodeShortString(state.chainId),
				revision: "1",
			},
		});

		state.logger.info("Registry SDK initialized successfully");
	} catch (error) {
		state.logger.error(error, "Failed to initialize Registry SDK");
		throw error;
	}
}

/**
 * Builds query for fetching registry models
 */
export function buildRegistryQuery(
	options: FetchOptions,
): ToriiQueryBuilder<ArcadeSchemaType> {
	const modelNames: string[] = [];

	if (options.access) {
		modelNames.push(ModelsMapping.Access);
	}
	if (options.game) {
		modelNames.push(ModelsMapping.Game);
	}
	if (options.edition) {
		modelNames.push(ModelsMapping.Edition);
	}

	// Build a query that fetches all entities for these models
	const modelKeys = modelNames.map(
		(model) => `${NAMESPACE}-${model}` as `${string}-${string}`,
	);
	const clause = KeysClause(modelKeys, [undefined], "VariableLen").build();

	return new ToriiQueryBuilder<ArcadeSchemaType>()
		.withClause(clause)
		.includeHashedKeys()
		.withEntityModels(modelKeys);
}

/**
 * Parses entity data into registry models
 */
export function parseRegistryModels(
	entities: ParsedEntity<ArcadeSchemaType>[],
): RegistryModel[] {
	const models: RegistryModel[] = [];

	for (const entity of entities) {
		if (!entity.models || !entity.models.ARCADE) continue;

		const arcadeModels = entity.models.ARCADE;

		try {
			if (arcadeModels.Edition) {
				models.push(arcadeModels.Edition as EditionModel);
			}

			if (arcadeModels.Game) {
				models.push(arcadeModels.Game as GameModel);
			}

			if (arcadeModels.Access) {
				models.push(arcadeModels.Access as AccessModel);
			}
		} catch (error) {
			console.error(
				`Failed to parse models for entity ${entity.entityId}:`,
				error,
			);
		}
	}

	return models;
}

/**
 * Fetches registry models
 */
export async function fetchRegistryModels(
	state: RegistryState,
	options: FetchOptions,
): Promise<RegistryModel[]> {
	if (!state.sdk) {
		throw new Error("Registry SDK not initialized. Call initRegistry first.");
	}

	try {
		const query = buildRegistryQuery(options);

		state.logger.info("Fetching registry models...");

		const result = await state.sdk.getEntities({ query });
		const items = result.getItems();
		const models = parseRegistryModels(items);

		state.logger.info(`Fetched ${models.length} registry models`);

		// Call the callback with the parsed models
		return models;
	} catch (error) {
		state.logger.error(error, "Failed to fetch registry models");
		throw error;
	}
}

/**
 * Helper to check if a model is an EditionModel
 */
export function isEditionModel(model: any): model is EditionModel {
	return model && "config" in model && "world_address" in model;
}

/**
 * Filters and validates edition models
 */
export function filterEditionModels(
	models: RegistryModel[],
	ignoreProjects: string[] = [],
): EditionModel[] {
	return models
		.filter(isEditionModel)
		.filter((edition) => !ignoreProjects.includes(edition.config.project));
}
