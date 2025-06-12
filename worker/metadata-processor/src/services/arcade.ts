import type {
	AccessModel,
	EditionModel,
	GameModel,
	RegistryModel,
} from "@cartridge/arcade";
import {
	type SchemaType as ISchemaType,
	KeysClause,
	type ParsedEntity,
	type SDK,
	ToriiQueryBuilder,
	init as initSDK,
} from "@dojoengine/sdk/node";
import { ToriiClient } from "@dojoengine/torii-wasm/node";
import { type constants, shortString } from "starknet";
import { type Logger, createLogger } from "../utils/logger.ts";
import type { TokenFetcherState } from "./token-fetcher.ts";
import { env } from "../env.ts";

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
 * Arcade registry service state
 */
export type ArcadeRegistryState = {
	sdk: SDK<ArcadeSchemaType> | null;
	logger: Logger;
	chainId: constants.StarknetChainId;
};

/**
 * Arcade registry fetch options
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
 * Creates arcade registry state
 */
export function createArcadeRegistryState(
	chainId: constants.StarknetChainId,
): ArcadeRegistryState {
	return {
		sdk: null,
		logger: createLogger("ArcadeRegistry"),
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
 * Initializes the arcade registry SDK
 */
export async function initArcadeRegistry(
	state: ArcadeRegistryState,
): Promise<void> {
	try {
		const config = getToriiConfig(state.chainId);

		state.logger.info("Initializing Arcade Registry SDK...");

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

		state.logger.info("Arcade Registry SDK initialized successfully");
	} catch (error) {
		state.logger.error(error, "Failed to initialize Arcade Registry SDK");
		throw error;
	}
}

/**
 * Fetches all editions from the arcade registry
 */
export async function fetchEditions(state: TokenFetcherState): Promise<void> {
	function handleArcadeRegistryModels(models: RegistryModel[]): void {
		try {
			// Filter and process edition models
			const editions = filterEditionModels(models, state.ignoreProjects);

			// Store valid editions
			for (const edition of editions) {
				if (!edition.config) {
					continue;
				}

				const cfg = JSON.parse(edition.config.toString() as string);
				state.editions.set(cfg.project, edition);
			}
		} catch (error) {}
	}

	const res = await fetchArcadeRegistryModels(state.registryState, {
		access: false,
		game: true,
		edition: true,
	});
	handleArcadeRegistryModels(res);
}

/**
 * Creates Torii clients for all editions
 */
export async function createToriiClients(
	state: TokenFetcherState,
): Promise<void> {
	async function createClientForEdition(edition: EditionModel): Promise<void> {
		const cfg = JSON.parse(edition.config.toString());
		const project = cfg.project;
		try {
			const url = `https://api.cartridge.gg/x/${project}/torii`;
			const client = await new ToriiClient({
				toriiUrl: url,
				relayUrl: "",
				worldAddress: env.MARKETPLACE_ADDRESS,
			});
			state.toriiClients.set(project, client);
			state.logger.info(`Created Torii client for project: ${project}`);
		} catch (error) {
			state.logger.error(error, `Failed to create Torii client for ${project}`);
		}
	}

	const clientPromises = Array.from(state.editions.values()).map(
		createClientForEdition,
	);
	await Promise.all(clientPromises);
}

/**
 * Builds query for fetching arcade registry models
 */
export function buildArcadeRegistryQuery(
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
 * Parses entity data into arcade registry models
 */
export function parseArcadeRegistryModels(
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
 * Fetches arcade registry models
 */
export async function fetchArcadeRegistryModels(
	state: ArcadeRegistryState,
	options: FetchOptions,
): Promise<RegistryModel[]> {
	if (!state.sdk) {
		throw new Error(
			"Arcade Registry SDK not initialized. Call initArcadeRegistry first.",
		);
	}

	try {
		const query = buildArcadeRegistryQuery(options);

		state.logger.info("Fetching arcade registry models...");

		const result = await state.sdk.getEntities({ query });
		const items = result.getItems();
		const models = parseArcadeRegistryModels(items);

		state.logger.info(`Fetched ${models.length} arcade registry models`);

		// Call the callback with the parsed models
		return models;
	} catch (error) {
		state.logger.error(error, "Failed to fetch arcade registry models");
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
