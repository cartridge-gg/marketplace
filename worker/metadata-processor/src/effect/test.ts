import { Effect } from "effect";

const program = Effect.gen(function* () {
	yield* Effect.log("Testing Effect setup...");
	yield* Effect.succeed("Effect is working!");
});

Effect.runPromise(program)
	.then((result) => console.log("Result:", result))
	.catch((error) => console.error("Error:", error));