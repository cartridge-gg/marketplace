import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useDojoSDK } from "@dojoengine/sdk/react";
import {
	subscribeToTokenUpdatesClause,
	getTokenQuery,
	getTokenOrders,
	getListedTokensForCollection,
	isTokenListed,
	SDKOrder,
	type SchemaType,
	type setupWorld,
	type OrderModel,
	ModelsMapping,
} from "@cartridge/marketplace-sdk";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Subscription } from "@dojoengine/torii-wasm/types";
import {
	KeysClause,
	StandardizedQueryResult,
	SubscriptionCallbackArgs,
} from "@dojoengine/sdk";
import { addAddressPadding } from "starknet";
import { useInitialized } from "../hooks";

/**
 * Hook to fetch all buy orders for a specific token
 */
export function useTokenOrders(collectionAddress: string, tokenId: string) {
	const { sdk } = useDojoSDK<typeof setupWorld, SchemaType>();
	const subscriptionRef = useRef<Subscription>(null);
	const [initialized, _setInitialized] = useInitialized();

	const q = useMemo(
		() => getTokenOrders(collectionAddress, tokenId),
		[collectionAddress, tokenId],
	);
	const queryKey = useMemo(
		() => ["tokenOrders", { collectionAddress, tokenId }],
		[collectionAddress, tokenId],
	);
	const queryClient = useQueryClient();

	useEffect(() => {
		if (!initialized && subscriptionRef.current === null) return;

		const wrappedCallback = () => {
			queryClient.invalidateQueries({
				queryKey,
			});
		};

		subscriptionRef.current = sdk.client.onEntityUpdated(
			subscribeToTokenUpdatesClause(collectionAddress, tokenId),
			wrappedCallback,
		);

		return () => {
			if (subscriptionRef.current !== null) {
				subscriptionRef.current.free();
				subscriptionRef.current = null;
			}
		};
	}, [initialized, q, sdk, queryClient, queryKey, collectionAddress, tokenId]);

	return useQuery({
		queryKey,
		queryFn: async () => {
			const res = await sdk.getEntities({ query: q });
			return res.getItems().map((i) => SDKOrder.parse(i));
		},
		enabled: !!collectionAddress && !!tokenId,
	});
}

/**
 * Hook to fetch all listed tokens for a collection
 */
export function useListedTokensForCollection(collectionAddress: string) {
	const { sdk } = useDojoSDK<typeof setupWorld, SchemaType>();
	const subscriptionRef = useRef<Subscription>(null);
	const [initialized, _setInitialized] = useInitialized();

	const q = useMemo(
		() => getListedTokensForCollection(collectionAddress),
		[collectionAddress],
	);
	const queryKey = useMemo(
		() => ["listedTokens", collectionAddress],
		[collectionAddress],
	);
	const queryClient = useQueryClient();

	useEffect(() => {
		if (!initialized && subscriptionRef.current === null) return;

		const wrappedCallback = () => {
			queryClient.invalidateQueries({
				queryKey,
			});
		};

		subscriptionRef.current = sdk.client.onEntityUpdated(
			subscribeToTokenUpdatesClause(collectionAddress, undefined),
			wrappedCallback,
		);

		return () => {
			if (subscriptionRef.current !== null) {
				subscriptionRef.current.free();
				subscriptionRef.current = null;
			}
		};
	}, [initialized, q, sdk, queryClient, queryKey, collectionAddress]);

	return useQuery({
		queryKey,
		queryFn: async () => {
			const res = await sdk.getEntities({ query: q });
			return res.getItems().map((i) => SDKOrder.parse(i));
		},
		enabled: !!collectionAddress,
	});
}

/**
 * Hook to check if a specific token is listed and fetch its listing details
 */
export function useIsTokenListed(collectionAddress: string, tokenId: string) {
	const { sdk } = useDojoSDK<typeof setupWorld, SchemaType>();
	const subscriptionRef = useRef<Subscription>(null);
	const [initialized, _setInitialized] = useInitialized();

	const q = useMemo(
		() => isTokenListed(collectionAddress, tokenId),
		[collectionAddress, tokenId],
	);
	const queryKey = useMemo(
		() => ["isTokenListed", collectionAddress, tokenId],
		[collectionAddress, tokenId],
	);
	const queryClient = useQueryClient();

	useEffect(() => {
		if (!initialized && subscriptionRef.current === null) return;

		const wrappedCallback = () => {
			queryClient.invalidateQueries({
				queryKey,
			});
		};

		subscriptionRef.current = sdk.client.onEntityUpdated(
			subscribeToTokenUpdatesClause(collectionAddress, tokenId),
			wrappedCallback,
		);

		return () => {
			if (subscriptionRef.current !== null) {
				subscriptionRef.current.free();
				subscriptionRef.current = null;
			}
		};
	}, [initialized, q, sdk, queryClient, queryKey, collectionAddress, tokenId]);

	return useQuery({
		queryKey,
		queryFn: async () => {
			const res = await sdk.getEntities({ query: q });
			const items = res.getItems().map((i) => SDKOrder.parse(i));
			return {
				isListed: items.length > 0,
				listing: items[0] || null,
			};
		},
		enabled: !!collectionAddress && !!tokenId,
		initialData: { isListed: false, listing: null } as {
			isListed: boolean;
			listing: OrderModel | null;
		},
	});
}
