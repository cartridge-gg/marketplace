import { useQuery } from "@tanstack/react-query";
import { useDojoSDK } from "@dojoengine/sdk/react";
import {
	getTokenQuery,
	getTokenOrders,
	getListedTokensForCollection,
	isTokenListed,
	SDKOrder,
	SchemaType,
	setupWorld,
	OrderModel,
} from "@cartridge/marketplace-sdk";

/**
 * Hook to fetch all marketplace information for a specific token
 */
export function useTokenQuery(collectionAddress: string, tokenId: string) {
	const { sdk } = useDojoSDK<typeof setupWorld, SchemaType>();

	return useQuery({
		queryKey: ["token", collectionAddress, tokenId],
		queryFn: async () => {
			const res = await sdk.getEntities({
				query: getTokenQuery(collectionAddress, tokenId),
			});
			return res.getItems().map((i) => SDKOrder.parse(i));
		},
		enabled: !!collectionAddress && !!tokenId,
	});
}

/**
 * Hook to fetch all buy orders for a specific token
 */
export function useTokenOrders(collectionAddress: string, tokenId: string) {
	const { sdk } = useDojoSDK<typeof setupWorld, SchemaType>();

	return useQuery({
		queryKey: ["tokenOrders", collectionAddress, tokenId],
		queryFn: async () => {
			const res = await sdk.getEntities({
				query: getTokenOrders(collectionAddress, tokenId),
			});
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

	return useQuery({
		queryKey: ["listedTokens", collectionAddress],
		queryFn: async () => {
			const res = await sdk.getEntities({
				query: getListedTokensForCollection(collectionAddress),
			});
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

	return useQuery({
		queryKey: ["isTokenListed", collectionAddress, tokenId],
		queryFn: async () => {
			const res = await sdk.getEntities({
				query: isTokenListed(collectionAddress, tokenId),
			});
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
