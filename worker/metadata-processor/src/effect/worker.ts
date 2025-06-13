import { Effect, Layer, Schedule, Stream, Fiber, Duration, Exit } from "effect";
import { ConfigService, ConfigLive } from "./config.js";
import { TokenFetcher, TokenFetcherLive } from "./token-fetcher.js";
import { MetadataProcessor, MetadataProcessorLive } from "./metadata-processor.js";
import { TokenSubscription, TokenSubscriptionLive } from "./token-subscription.js";

// Worker program
const workerProgram = Effect.gen(function* () {
	yield* Effect.log("Loading services...");
	
	const config = yield* ConfigService;
	yield* Effect.log("Config service loaded");
	
	const tokenFetcher = yield* TokenFetcher;
	yield* Effect.log("TokenFetcher service loaded");
	
	const metadataProcessor = yield* MetadataProcessor;
	yield* Effect.log("MetadataProcessor service loaded");
	
	const tokenSubscription = yield* TokenSubscription;
	yield* Effect.log("TokenSubscription service loaded");

	const { FETCH_INTERVAL, TOKEN_FETCH_BATCH_SIZE } = config.get();

	yield* Effect.logInfo("Starting metadata processor worker...");

	// Process all tokens initially
	yield* Effect.logInfo("Performing initial token fetch and processing...");
	const tokenStream = tokenFetcher.fetchAllBatches(TOKEN_FETCH_BATCH_SIZE);
	
	yield* Stream.runForEach(
		tokenStream,
		({ projectId, tokens }) =>
			Effect.gen(function* () {
				yield* Effect.logInfo(
					`Processing ${tokens.length} tokens from project ${projectId}`,
				);
				yield* metadataProcessor.processTokens(tokens);
			}),
	);

	const processedCount = metadataProcessor.getProcessedCount();
	yield* Effect.logInfo(`Initial processing complete. Processed ${processedCount} tokens`);

	// Set up subscriptions for real-time updates
	yield* Effect.logInfo("Setting up real-time subscriptions...");
	yield* tokenSubscription.subscribeToAll();

	// Set up periodic token fetching
	const periodicFetch = Effect.repeat(
		Effect.gen(function* () {
			yield* Effect.logInfo("Running periodic token fetch...");
			
			const tokenStream = tokenFetcher.fetchAllBatches(TOKEN_FETCH_BATCH_SIZE);
			yield* Stream.runForEach(
				tokenStream,
				({ projectId, tokens }) =>
					Effect.gen(function* () {
						yield* Effect.logInfo(
							`Processing ${tokens.length} tokens from project ${projectId}`,
						);
						yield* metadataProcessor.processTokens(tokens);
					}),
			);
			
			const count = metadataProcessor.getProcessedCount();
			yield* Effect.logInfo(`Periodic fetch complete. Total processed: ${count}`);
		}),
		Schedule.spaced(Duration.minutes(FETCH_INTERVAL)),
	);

	// Fork the periodic fetch
	const periodicFiber = yield* Effect.forkDaemon(periodicFetch);

	yield* Effect.logInfo("Worker started successfully");

	// Keep the worker running
	yield* Effect.never;
});

// Graceful shutdown
const shutdownProgram = Effect.gen(function* () {
	yield* Effect.logInfo("Shutting down worker...");
	
	const tokenSubscription = yield* TokenSubscription;
	yield* tokenSubscription.unsubscribeAll();
	
	yield* Effect.logInfo("Worker stopped");
});

// Create the worker with all layers
export const createWorker = () => {
	// Compose layers with proper dependencies
	const BaseLayer = ConfigLive;
	
	const ServicesLayer = Layer.merge(
		TokenFetcherLive.pipe(Layer.provide(BaseLayer)),
		MetadataProcessorLive.pipe(Layer.provide(BaseLayer))
	);
	
	const AppLive = Layer.merge(
		ServicesLayer,
		TokenSubscriptionLive.pipe(
			Layer.provide(ServicesLayer),
			Layer.provide(BaseLayer)
		)
	);

	return workerProgram.pipe(
		Effect.provide(AppLive),
		Effect.provide(BaseLayer),
	);
};

// Run the worker
export const runWorker = () =>
	Effect.runPromise(createWorker()).catch((error) => {
		console.error("Fatal error:", error);
		process.exit(1);
	});

// Export for testing
export { workerProgram, shutdownProgram };