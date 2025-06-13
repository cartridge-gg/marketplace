import { createWorker } from "./worker.js";
import { Effect, Cause } from "effect";

// Main entry point
async function main() {
	console.log("Starting metadata processor with Effect...");

	try {
		// Run the worker
		await Effect.runPromise(createWorker());
	} catch (error) {
		console.error("Fatal error:", error);
		if (error instanceof Error) {
			console.error("Error message:", error.message);
			console.error("Stack trace:", error.stack);
		}
		// Log the full error object
		console.error("Full error:", JSON.stringify(error, null, 2));
		process.exit(1);
	}
}

// Run if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
	main().catch(console.error);
}

export { createWorker } from "./worker.js";
export type { Config } from "./config.js";
export type { Token, TokenBatch } from "./token-fetcher.js";
export type { TokenMetadata, MetadataMessage } from "./metadata-processor.js";
export type { TokenUpdate } from "./token-subscription.js";