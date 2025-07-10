import { Effect, Fiber } from "effect";
import { program } from "./effect";
import { ConfigLive } from "./effect-config";
import {
	ArcadeSDKLive,
	MarketplaceSDKLive,
	MarketplaceAccountLive,
} from "./services/sdk-services";

// Run the program with proper scope and signal handling
Effect.runPromise(
	Effect.scoped(
		Effect.gen(function* () {
			// Run the program in a forked fiber
			const fiber = yield* Effect.fork(program);

			// Setup graceful shutdown handlers
			const shutdown = () => {
				console.log("Shutting down gracefully...");
				Effect.runFork(Fiber.interrupt(fiber));
			};

			process.on("SIGINT", shutdown);
			process.on("SIGTERM", shutdown);

			// Wait for the fiber to complete
			const exit = yield* Fiber.await(fiber);

			if (exit._tag === "Success") {
				console.log("Program completed successfully");
				return exit.value;
			}
			throw new Error(`Program failed: ${JSON.stringify(exit.cause)}`);
		}),
	),
)
	.then(() => {
		process.exit(0);
	})
	.catch((error) => {
		console.error("Program failed:", error);
		process.exit(1);
	});
