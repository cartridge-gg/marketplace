import { Effect } from "effect";
import { ConfigLive, ConfigService } from "./config.js";
import { TokenFetcherLive, TokenFetcher } from "./token-fetcher.js";

const program = Effect.gen(function* () {
	yield* Effect.log("Loading config...");
	const config = yield* ConfigService;
	yield* Effect.log(`Config loaded. Chain: ${config.get().CHAIN_ID}`);
	
	yield* Effect.log("Loading TokenFetcher...");
	const tokenFetcher = yield* TokenFetcher;
	yield* Effect.log("TokenFetcher loaded");
	
	return "Success";
});

const runDebug = async () => {
	try {
		const result = await Effect.runPromise(
			program.pipe(
				Effect.provide(TokenFetcherLive),
				Effect.provide(ConfigLive),
			)
		);
		console.log("Result:", result);
	} catch (error) {
		console.error("Fatal error:", error);
		if (error instanceof Error) {
			console.error("Stack:", error.stack);
		}
	}
};

runDebug();