import { Effect, Fiber, FiberSet } from "effect";
import type { EditionModel } from "@cartridge/arcade";
import { fetchEditions } from "./services/registry-service";
import { handleSingleEdition } from "./services/token-processor";
import { tokenMetadataUpdater } from "./services/subscription-service";

// Process token metadata for all editions
const processTokenMetadata = (editions: Map<string, EditionModel>) =>
	Effect.gen(function* () {
		const fibers = yield* FiberSet.make();

		for (const [project, edition] of editions) {
			yield* FiberSet.run(fibers, handleSingleEdition(project, edition));
		}

		yield* FiberSet.awaitEmpty(fibers);

		return editions;
	});

// Main program logic
export const program = Effect.gen(function* () {
	// Run the main program
	const editions = yield* fetchEditions;
	yield* Effect.all(
		[processTokenMetadata(editions), tokenMetadataUpdater(editions)],
		{
			concurrency: "unbounded",
		},
	);

	return editions;
}).pipe(
	Effect.tapError((error) =>
		Effect.logError(`Error occurred: ${error.message}`),
	),
	Effect.onInterrupt(() =>
		Effect.logInfo("Main program interrupted, cleaning up..."),
	),
);
