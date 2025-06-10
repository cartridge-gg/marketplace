import type { ToriiClient } from "@dojoengine/torii-wasm/node";
import { createLogger, type Logger } from "../utils/logger.ts";
import { type Token } from "./token-fetcher.ts";
import {
	type MetadataProcessorState,
	processTokens,
	isTokenProcessed,
	getTokenKey,
} from "./metadata-processor.ts";

/**
 * Subscription type
 */
export type Subscription = any; // Replace with actual subscription type from torii

/**
 * Token update handler type
 */
export type TokenUpdateHandler = (
	projectId: string,
	update: any,
) => Promise<void>;

/**
 * Token subscription state
 */
export type TokenSubscriptionState = {
	toriiClients: Map<string, ToriiClient>;
	metadataProcessorState: MetadataProcessorState;
	subscriptions: Map<string, Subscription>;
	logger: Logger;
};

/**
 * Token subscription options
 */
export type TokenSubscriptionOptions = {
	toriiClients: Map<string, ToriiClient>;
	metadataProcessorState: MetadataProcessorState;
};

/**
 * Creates token subscription state
 */
export function createTokenSubscriptionState(
	options: TokenSubscriptionOptions,
): TokenSubscriptionState {
	return {
		toriiClients: options.toriiClients,
		metadataProcessorState: options.metadataProcessorState,
		subscriptions: new Map(),
		logger: createLogger("TokenSubscription"),
	};
}

/**
 * Parses token information from an update event
 */
export function parseTokenFromUpdate(
	projectId: string,
	update: any,
): Token | null {
	try {
		// This needs to be implemented based on the actual update structure
		// Extract collection address, token ID, and owner from the update

		// Placeholder implementation
		if (update.entity && update.entity.models) {
			// Parse the token data from the entity models
			return {
				collection: "", // Extract from update
				tokenId: "", // Extract from update
				owner: "", // Extract from update
				projectId,
			};
		}

		return null;
	} catch (error) {
		// Log error (no logger available in this pure function)
		return null;
	}
}

/**
 * Handles token metadata update for existing tokens
 */
export async function handleTokenMetadataUpdate(
	state: TokenSubscriptionState,
	token: Token,
): Promise<void> {
	// Check if metadata has actually changed
	// This might involve comparing with cached metadata

	// If metadata has changed, reprocess it
	state.logger.info(
		`Reprocessing metadata for updated token: ${getTokenKey(token)}`,
	);
	await processTokens(state.metadataProcessorState, [token]);
}

/**
 * Handles token update events
 */
export function createTokenUpdateHandler(
	state: TokenSubscriptionState,
): TokenUpdateHandler {
	return async function handleTokenUpdate(
		projectId: string,
		update: any,
	): Promise<void> {
		try {
			// Parse the update to extract token information
			const token = parseTokenFromUpdate(projectId, update);

			if (!token) {
				state.logger.debug("Update does not contain valid token data");
				return;
			}

			// Check if this is a new token or an update to existing token
			const isNewToken = !isTokenProcessed(state.metadataProcessorState, token);

			if (isNewToken) {
				state.logger.info(`New token detected: ${getTokenKey(token)}`);
				// Process the new token's metadata
				await processTokens(state.metadataProcessorState, [token]);
			} else {
				state.logger.info(`Token update detected: ${getTokenKey(token)}`);
				// For updates, we might want to reprocess the metadata
				await handleTokenMetadataUpdate(state, token);
			}
		} catch (error) {
			state.logger.error(
				error,
				`Error handling token update from ${projectId}`,
			);
		}
	};
}

/**
 * Subscribes to token updates for a specific project
 */
export async function subscribeToProject(
	state: TokenSubscriptionState,
	projectId: string,
	client: ToriiClient,
): Promise<void> {
	try {
		// Subscribe to entity updates
		// This needs to be adapted based on the actual token model structure
		// For now, log a warning as we need specific model information
		state.logger.warn(
			`Token subscription not yet implemented for project: ${projectId}`,
		);

		// In a real implementation, you would:
		// 1. Create a subscription clause for the token models
		// 2. Subscribe using client.onEntityUpdated()
		// 3. Handle updates in the callback

		// Placeholder subscription entry
		state.subscriptions.set(projectId, null);
	} catch (error) {
		state.logger.error(error, `Error subscribing to project ${projectId}`);
		throw error;
	}
}

/**
 * Subscribes to token updates from all Torii instances
 */
export async function subscribeToAllTokens(
	state: TokenSubscriptionState,
): Promise<void> {
	state.logger.info("Setting up subscriptions for all Torii instances...");

	const updateHandler = createTokenUpdateHandler(state);

	async function subscribeToClient([projectId, client]: [
		string,
		ToriiClient,
	]): Promise<void> {
		try {
			await subscribeToProject(state, projectId, client);
			state.logger.info(
				`Subscribed to token updates for project: ${projectId}`,
			);
		} catch (error) {
			state.logger.error(error, `Failed to subscribe to ${projectId}`);
		}
	}

	const subscriptionPromises = Array.from(state.toriiClients.entries()).map(
		subscribeToClient,
	);
	await Promise.all(subscriptionPromises);

	state.logger.info(`Active subscriptions: ${state.subscriptions.size}`);
}

/**
 * Unsubscribes from a single subscription
 */
export async function unsubscribeFromProject(
	state: TokenSubscriptionState,
	projectId: string,
	subscription: Subscription,
): Promise<void> {
	try {
		if (subscription && subscription.cancel) {
			await subscription.cancel();
		}
		state.logger.debug(`Unsubscribed from project: ${projectId}`);
	} catch (error) {
		state.logger.error(error, `Error unsubscribing from ${projectId}`);
	}
}

/**
 * Unsubscribes from all active subscriptions
 */
export async function unsubscribeAll(
	state: TokenSubscriptionState,
): Promise<void> {
	state.logger.info("Unsubscribing from all token updates...");

	for (const [projectId, subscription] of state.subscriptions) {
		await unsubscribeFromProject(state, projectId, subscription);
	}

	state.subscriptions.clear();
	state.logger.info("All subscriptions cancelled");
}

/**
 * Gets the number of active subscriptions
 */
export function getActiveSubscriptionCount(
	state: TokenSubscriptionState,
): number {
	return state.subscriptions.size;
}
