import type { ToriiClient } from "@dojoengine/torii-wasm/node";
import { createLogger, type Logger } from "../utils/logger.ts";
import { type Token } from "./token-fetcher.ts";
import { type TaskRunnerState, runTasksForToken } from "../tasks/index.ts";
import { createMarketplaceClient } from "../init.ts";
import { createArcadeProjectClient } from "./arcade.ts";

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
	taskRunnerState: TaskRunnerState;
	subscriptions: Map<string, Subscription>;
	logger: Logger;
};

/**
 * Token subscription options
 */
export type TokenSubscriptionOptions = {
	toriiClients: Map<string, ToriiClient>;
	taskRunnerState: TaskRunnerState;
};

/**
 * Creates token subscription state
 */
export function createTokenSubscriptionState(
	options: TokenSubscriptionOptions,
): TokenSubscriptionState {
	return {
		toriiClients: options.toriiClients,
		taskRunnerState: options.taskRunnerState,
		subscriptions: new Map(),
		logger: createLogger("TokenSubscription"),
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
		const sub = client.onTokenUpdated([], [], async (token: Token) => {
			try {
				// Ignore ack responses from Torii
				if (
					token.contract_address === "0x0" &&
					token.token_id ===
						"0x0000000000000000000000000000000000000000000000000000000000000000"
				) {
					return;
				}

				state.logger.info(
					"Received update for token : %s:%s",
					token.contract_address,
					token.token_id,
				);

				state.taskRunnerState.client = await createMarketplaceClient();
				await runTasksForToken(state.taskRunnerState, token);
			} catch (err) {
				state.logger.error(
					"Failed to update metadata for token : ",
					token.contract_address,
					" ",
					token.token_id,
				);
			}
		});

		state.subscriptions.set(projectId, sub);
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

	async function subscribeToClient([projectId, _client]: [
		string,
		ToriiClient,
	]): Promise<void> {
		try {
			await subscribeToProject(
				state,
				projectId,
				await createArcadeProjectClient(projectId),
			);
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
