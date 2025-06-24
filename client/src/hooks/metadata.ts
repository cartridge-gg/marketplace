import { useCallback, useState, useMemo, useRef, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useDojoSDK } from "@dojoengine/sdk/react";
import {
	getCollectionMetadataQuery,
	transformCollectionMetadataForUI,
	filterMetadataByTraits,
	getMetadataStatistics,
	type TokenMetadataUI,
	type SchemaType,
	setupWorld,
	subscribeToMetadataUpdatesClause,
} from "@cartridge/marketplace-sdk";
import { addAddressPadding } from "starknet";
import type { Subscription } from "@dojoengine/torii-wasm/types";
import type { Clause } from "@dojoengine/torii-wasm/types";

/**
 * Hook to manage subscription lifecycle for metadata updates
 */
function useMetadataSubscription(subscriptionClause: Clause, queryKey: any[]) {
	const { sdk } = useDojoSDK<typeof setupWorld, SchemaType>();
	const subscriptionRef = useRef<Subscription>(null);
	const queryClient = useQueryClient();

	useEffect(() => {
		if (subscriptionRef.current === null) {
			const wrappedCallback = () => {
				queryClient.invalidateQueries({
					queryKey,
				});
			};

			subscriptionRef.current = sdk.client.onEntityUpdated(
				subscriptionClause,
				wrappedCallback,
			);
		}

		return () => {
			if (subscriptionRef.current !== null) {
				subscriptionRef.current.free();
				subscriptionRef.current = null;
			}
		};
	}, [sdk, queryClient, queryKey, subscriptionClause]);
}

/**
 * Hook to fetch collection metadata
 */
export function useCollectionMetadata(
	collectionAddress: string,
	identity?: string,
) {
	const { sdk } = useDojoSDK<typeof setupWorld, SchemaType>();

	const paddedIdentity = useMemo(
		() => identity || addAddressPadding("0x0"),
		[identity],
	);

	const query = useMemo(
		() => getCollectionMetadataQuery(paddedIdentity, collectionAddress),
		[paddedIdentity, collectionAddress],
	);

	const queryKey = useMemo(
		() => [
			"collectionMetadata",
			{ collectionAddress, identity: paddedIdentity },
		],
		[collectionAddress, paddedIdentity],
	);

	const subscriptionClause = useMemo(
		() =>
			subscribeToMetadataUpdatesClause(
				paddedIdentity,
				collectionAddress,
				undefined,
			),
		[paddedIdentity, collectionAddress],
	);

	useMetadataSubscription(subscriptionClause, queryKey);

	return useQuery({
		queryKey,
		queryFn: async () => {
			const response = await sdk.getEntities({ query });
			const entities = response.getItems();
			return transformCollectionMetadataForUI(collectionAddress, entities);
		},
		enabled: !!collectionAddress,
		initialData: null,
	});
}

export function useMetadataFilters(
	tokens: TokenMetadataUI[],
	handleChange: (tokens: TokenMetadataUI[]) => void,
) {
	const [selectedTraits, setSelectedTraits] = useState<
		{ traitType: string; value: string }[]
	>([]);

	useEffect(() => {
		handleChange(filterMetadataByTraits(tokens, selectedTraits));
	}, [tokens, selectedTraits, handleChange]);

	const statistics = getMetadataStatistics(tokens);

	const toggleTrait = useCallback((traitType: string, value: string) => {
		setSelectedTraits((prev) => {
			const exists = prev.some(
				(t) => t.traitType === traitType && t.value === value,
			);

			if (exists) {
				return prev.filter(
					(t) => !(t.traitType === traitType && t.value === value),
				);
			}
			return [...prev, { traitType, value }];
		});
	}, []);

	const clearFilters = useCallback(() => {
		setSelectedTraits([]);
	}, []);

	const isTraitSelected = useCallback(
		(traitType: string, value: string) => {
			return selectedTraits.some(
				(t) => t.traitType === traitType && t.value === value,
			);
		},
		[selectedTraits],
	);

	return {
		selectedTraits,
		statistics,
		filteredTokens: [],
		toggleTrait,
		clearFilters,
		isTraitSelected,
	};
}
