import { Effect, Stream, Fiber, Chunk, FiberSet } from "effect";
import type { Token } from "@dojoengine/torii-wasm/node";
import type { EditionModel } from "@cartridge/arcade";
import { ProjectConfigService } from "../effect-config";
import { DEFAULT_IGNORED_PROJECTS } from "../constants";
import { createToriiClient, processTokens } from "./token-processor";

// Subscribe to token updates for a project
export const subscribeToTokenUpdated = (
	project: string,
	edition: EditionModel,
) =>
	Effect.gen(function* () {
		// Skip ignored projects
		const projectConfig = yield* ProjectConfigService;
		const ignoredProjects =
			projectConfig.ignoredProjects.length > 0
				? projectConfig.ignoredProjects
				: DEFAULT_IGNORED_PROJECTS;
		if (ignoredProjects.includes(project)) {
			yield* Effect.logInfo(
				`Skipping subscription for ignored project: ${project}`,
			);
			return;
		}

		yield* Effect.logInfo(
			`Setting up token subscription for project: ${project}`,
		);

		// Create Torii client
		const client = yield* createToriiClient(project, edition);

		// Create stream from token updates
		const tokenStream = Stream.async<Token, Error>((emit) => {
			const subscription = client.onTokenUpdated([], [], (token: Token) => {
				// Ignore ACK responses (same as in token-subscription.ts)
				if (
					token.contract_address === "0x0" &&
					token.token_id ===
						"0x0000000000000000000000000000000000000000000000000000000000000000"
				) {
					return;
				}

				// Emit the token to the stream
				emit(Effect.succeed(Chunk.of(token)));
			});

			// Return cleanup function
			return Effect.sync(() => {
				Effect.logDebug(
					`Cleaning up subscription for project: ${project}`,
				).pipe(Effect.runSync);
				if (subscription?.cancel) {
					subscription.cancel();
				}
			});
		});

		// Process the token stream with interruption handling
		yield* tokenStream.pipe(
			Stream.tap((token) =>
				Effect.logInfo(
					`Received update for token: ${token.contract_address}:${token.token_id}`,
				),
			),
			Stream.grouped(1), // Process tokens individually as they come
			Stream.runForEach((tokens) =>
				processTokens(project)(Chunk.toArray(tokens)),
			),
			Effect.onInterrupt(() =>
				Effect.logDebug(
					`Token subscription interrupted for project: ${project}`,
				),
			),
		);
	}).pipe(
		Effect.catchAll((error) =>
			Effect.logError(`Error in token subscription for ${project}: ${error}`),
		),
	);

// Token metadata updater - manages subscriptions for all projects
export const tokenMetadataUpdater = (editions: Map<string, EditionModel>) =>
	Effect.gen(function* () {
		const fibers = yield* FiberSet.make();

		for (const [project, edition] of editions) {
			yield* FiberSet.run(fibers, subscribeToTokenUpdated(project, edition));
		}

		yield* FiberSet.awaitEmpty(fibers);

		return editions;
	});
