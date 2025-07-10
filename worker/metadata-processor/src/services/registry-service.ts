import { Effect } from "effect";
import type { EditionModel, RegistryModel } from "@cartridge/arcade";
import {
	buildArcadeRegistryQuery,
	type FetchOptions,
	parseArcadeRegistryModels,
} from "./arcade";
import { ArcadeSDK } from "./sdk-services";
import { ProjectConfigService } from "../effect-config";
import { DEFAULT_IGNORED_PROJECTS } from "../constants";

// Type guard for edition models
export function isEditionModel(model: any): model is EditionModel {
	return model && "config" in model && "world_address" in model;
}

// Filter edition models by ignored projects
export function filterEditionModels(
	models: RegistryModel[],
	ignoreProjects: string[] = [],
): EditionModel[] {
	return models
		.filter(isEditionModel)
		.filter((edition) => !ignoreProjects.includes(edition.config.project));
}

// Handle arcade registry models and return a map of editions
export function handleArcadeRegistryModels(models: RegistryModel[]) {
	return Effect.gen(function* () {
		yield* Effect.logDebug(`Handling ${models.length} registry models`);

		// Log first model to debug structure
		if (models.length > 0) {
			yield* Effect.logDebug(
				`First model structure: ${JSON.stringify(Object.keys(models[0]))}`,
			);
			yield* Effect.logDebug(`Model type: ${(models[0] as EditionModel).type}`);
		}

		const res: Map<string, EditionModel> = new Map();

		const projectConfig = yield* ProjectConfigService;
		const ignoredProjects =
			projectConfig.ignoredProjects.length > 0
				? projectConfig.ignoredProjects
				: DEFAULT_IGNORED_PROJECTS;
		const editions = filterEditionModels(models, ignoredProjects as string[]);
		yield* Effect.logDebug(`Filtered to ${editions.length} editions`);

		// Store valid editions
		for (const edition of editions) {
			if (!edition.config) {
				continue;
			}

			const cfg = JSON.parse(edition.config.toString() as string);
			res.set(cfg.project, edition);
		}
		return res;
	});
}

// Fetch arcade registry models
export function fetchArcadeRegistryModels(
	options: FetchOptions,
): Effect.Effect<RegistryModel[], Error, ArcadeSDK> {
	return Effect.gen(function* () {
		const query = buildArcadeRegistryQuery(options);

		yield* Effect.logDebug("Fetching arcade registry models...");
		const { sdk } = yield* ArcadeSDK;

		// Wrap the async SDK operations in Effect.tryPromise
		const models = yield* Effect.tryPromise({
			try: async () => {
				const result = await sdk.getEntities({ query });
				const items = result.getItems();
				return parseArcadeRegistryModels(items);
			},
			catch: (error) => new Error(`Failed to fetch registry models: ${error}`),
		});

		yield* Effect.logDebug(`Fetched ${models.length} arcade registry models`);

		return models;
	});
}

// Fetch editions from the arcade registry
export const fetchEditions = Effect.gen(function* () {
	yield* Effect.log("Starting edition fetching...");
	const models = yield* fetchArcadeRegistryModels({
		access: false,
		game: true,
		edition: true,
	});

	yield* Effect.logDebug(`Found ${models.length} models`);
	const editions = yield* handleArcadeRegistryModels(models);
	yield* Effect.log(`Processed ${editions.size} editions`);

	return editions;
});

