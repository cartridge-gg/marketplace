import { Effect, Fiber } from "effect";
import type { EditionModel } from "@cartridge/arcade";
import { fetchEditions } from "./services/registry-service";
import { handleSingleEdition } from "./services/token-processor";
import { tokenMetadataUpdater } from "./services/subscription-service";

// Process token metadata for all editions
const processTokenMetadata = (editions: Map<string, EditionModel>) =>
	Effect.gen(function* () {
		const fibers: Fiber.RuntimeFiber<void, Error>[] = [];

		for (const [project, edition] of editions) {
			const fiber = yield* Effect.fork(handleSingleEdition(project, edition));
			fibers.push(fiber);
		}

		// Wait for all fibers to complete
		yield* Effect.all(
			fibers.map((fiber) => Fiber.join(fiber)),
			{
				concurrency: "unbounded",
			},
		);

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
