import { useContext, useState, useCallback, useEffect } from "react";
import { CollectionContext } from "../contexts";
import { useArcade } from "./arcade";
export type { Collection, Collections } from "../contexts/collection";

/**
 * Custom hook to access the Arcade context and account information.
 * Must be used within a ArcadeProvider component.
 *
 * @returns An object containing:
 * - chainId: The chain id
 * - provider: The Arcade provider instance
 * - pins: All the existing pins
 * - games: The registered games
 * - chains: The chains
 * @throws {Error} If used outside of a ArcadeProvider context
 */
export const useCollections = () => {
	const context = useContext(CollectionContext);

	if (!context) {
		throw new Error(
			"The `useCollections` hook must be used within a `CollectionProvider`",
		);
	}

	const { collections } = context;

	return { collections };
};

export function useCollection(
	collectionAddress: string,
	pageSize: number = 50,
	direction: string = "Forward",
) {
	const { clients } = useArcade();
	const [cursor, setCursor] = useState<string | undefined>(undefined);
	const [client, setClient] = useState<string | undefined>(undefined);
	const [collection, setCollection] = useState<Token[]>([]);

	const fetchCollection = useCallback(
		async (address: string, count: number, dir: string) => {
			const collections = await Promise.all(
				Object.keys(clients).map(async (project) => {
					const tokens = await clients[project].getTokens(
						[address],
						[],
						count,
						cursor,
					);
					if (tokens.items.length !== 0) {
						return {
							items: tokens.items,
							cursor: tokens.next_cursor,
							client: project,
						};
					}
				}),
			);
			const filteredCollections = collections.filter(Boolean);
			if (filteredCollections.length === 0) {
				return [];
			}
			return filteredCollections[0] ?? [];
		},
		[clients, cursor],
	);

	const getPrevPage = useCallback(() => {});
	const getNextPage = useCallback(() => {});

	useEffect(() => {
		if (collection.length === 0) {
			fetchCollection(collectionAddress, pageSize, cursor).then(
				({ items, cursor, client }) => {
					if (items) {
						setCollection(
							items.map((i) => {
								try {
									i.metadata = JSON.parse(i.metadata);
									return i;
								} catch (_err) {
									console.error(i, _err);
									return i;
								}
							}),
						);
						setCursor(cursor);
						setClient(client);
					}
				},
			);
		}
	}, [fetchCollection, collectionAddress, collection, cursor, pageSize]);

	return {
		collection,
		getPrevPage,
		getNextPage,
	};
}
