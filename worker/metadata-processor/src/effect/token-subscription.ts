import { Context, Effect, Layer, Stream, Queue, Fiber } from "effect";
import type { ToriiClient } from "@dojoengine/torii-wasm/node";
import { TokenFetcher, type Token } from "./token-fetcher.js";
import { MetadataProcessor } from "./metadata-processor.js";
import { SubscriptionError } from "./errors.js";

// Types
export type Subscription = any; // Placeholder for actual subscription type

export type TokenUpdate = {
	projectId: string;
	token: Token;
};

// Service interface
export class TokenSubscription extends Context.Tag("TokenSubscription")<
	TokenSubscription,
	{
		readonly subscribeToAll: () => Effect.Effect<void, SubscriptionError>;
		readonly unsubscribeAll: () => Effect.Effect<void, SubscriptionError>;
		readonly getActiveSubscriptionCount: () => number;
		readonly tokenUpdates: Stream.Stream<TokenUpdate, SubscriptionError>;
	}
>() {}

// Internal state
type SubscriptionState = {
	subscriptions: Map<string, Subscription>;
	updateQueue: Queue.Queue<TokenUpdate>;
	subscriptionFibers: Map<string, Fiber.RuntimeFiber<void, SubscriptionError>>;
};

// Parse token from update event
const parseTokenFromUpdate = (
	projectId: string,
	update: any,
): Effect.Effect<Token | null, never> =>
	Effect.sync(() => {
		// TODO: Implement proper parsing once we understand the update structure
		// For now, return null until we can properly parse the update
		return null;
	});

// Create service implementation
const makeTokenSubscription = (
	state: SubscriptionState,
	tokenFetcher: TokenFetcher["Type"],
	metadataProcessor: MetadataProcessor["Type"],
): TokenSubscription["Type"] => {
	const subscribeToProject = (
		projectId: string,
		client: ToriiClient,
	): Effect.Effect<void, SubscriptionError> =>
		Effect.gen(function* () {
			// TODO: Implement actual subscription logic
			// For now, we'll create a placeholder
			state.subscriptions.set(projectId, null);
			
			// In a real implementation:
			// 1. Create subscription to entity updates
			// 2. Parse updates and queue them
			// 3. Store subscription for cleanup
			
			yield* Effect.logWarning(
				`Token subscription not yet implemented for project: ${projectId}`,
			);
		});

	return {
		subscribeToAll: () =>
			Effect.gen(function* () {
				const toriiClients = tokenFetcher.getToriiClients();
				
				yield* Effect.logInfo(
					`Setting up subscriptions for ${toriiClients.size} Torii instances...`,
				);

				// Subscribe to each client
				yield* Effect.forEach(
					Array.from(toriiClients.entries()),
					([projectId, client]) =>
						subscribeToProject(projectId, client).pipe(
							Effect.catchAll((error) =>
								Effect.logError(`Failed to subscribe to ${projectId}: ${error.message}`),
							),
						),
					{ concurrency: "unbounded" },
				);

				yield* Effect.logInfo(`Active subscriptions: ${state.subscriptions.size}`);
			}),

		unsubscribeAll: () =>
			Effect.gen(function* () {
				yield* Effect.logInfo("Unsubscribing from all token updates...");

				// Cancel all subscription fibers
				yield* Effect.forEach(
					Array.from(state.subscriptionFibers.values()),
					(fiber) => Fiber.interrupt(fiber),
					{ concurrency: "unbounded" },
				);

				// Clear subscriptions
				state.subscriptions.clear();
				state.subscriptionFibers.clear();

				yield* Effect.logInfo("All subscriptions cancelled");
			}),

		getActiveSubscriptionCount: () => state.subscriptions.size,

		tokenUpdates: Stream.fromQueue(state.updateQueue),
	};
};

// Initialize token subscription
const initializeTokenSubscription = Effect.gen(function* () {
	const tokenFetcher = yield* TokenFetcher;
	const metadataProcessor = yield* MetadataProcessor;

	const updateQueue = yield* Queue.unbounded<TokenUpdate>();

	const state: SubscriptionState = {
		subscriptions: new Map(),
		updateQueue,
		subscriptionFibers: new Map(),
	};

	// Handle token update function
	const handleTokenUpdate = (update: TokenUpdate) =>
		Effect.gen(function* () {
			const { token } = update;
			
			// Check if this is a new token
			const isProcessed = yield* metadataProcessor.isTokenProcessed(token);
			
			if (!isProcessed) {
				yield* Effect.logInfo(`New token detected: ${token.contract_address}-${token.token_id}`);
				yield* metadataProcessor.processToken(token);
			} else {
				// For updates, we might want to reprocess the metadata
				yield* Effect.logInfo(`Token update detected: ${token.contract_address}-${token.token_id}`);
				yield* metadataProcessor.processToken(token);
			}
		});

	const service = makeTokenSubscription(state, tokenFetcher, metadataProcessor);

	// Start processing token updates
	yield* Stream.runForEach(
		service.tokenUpdates,
		(update) =>
			handleTokenUpdate(update).pipe(
				Effect.catchAll((error) =>
					Effect.logError(`Error processing token update: ${error.message}`),
				),
			),
	).pipe(
		Effect.forkDaemon,
	);

	return service;
});

// Create the layer
export const TokenSubscriptionLive = Layer.effect(
	TokenSubscription,
	initializeTokenSubscription,
);