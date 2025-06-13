import { Effect } from "effect";
import { ConfigLive } from "./config.js";

const program = Effect.gen(function* () {
	yield* Effect.log("Starting debug...");
	yield* Effect.log("Config layer created");
	return "Done";
});

const runDebug = async () => {
	try {
		const result = await Effect.runPromise(
			program.pipe(Effect.provide(ConfigLive))
		);
		console.log("Success:", result);
	} catch (error) {
		console.error("Error:", error);
		if (error instanceof Error) {
			console.error("Stack:", error.stack);
		}
	}
};

runDebug();