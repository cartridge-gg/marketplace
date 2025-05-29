import { useContext, useState, useCallback, useEffect } from "react";
import { CollectionContext } from "../contexts";
import { useArcade } from "./arcade";
import { Token, ToriiClient } from "@dojoengine/torii-wasm";
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
async function fetchCollectionFromClient(
	clients: { [key: string]: ToriiClient },
	client: string,
	address: string,
	count: number,
	cursor: string | undefined,
): Promise<{
	items: Token[];
	cursor: string | undefined;
	client: string | undefined;
}> {
	const tokens = await clients[client].getTokens([address], [], count, cursor);
	if (tokens.items.length !== 0) {
		return {
			items: tokens.items,
			cursor: tokens.next_cursor,
			client: client,
		};
	}
	return { items: [], cursor: undefined, client: undefined };
}

export function useCollection(
	collectionAddress: string,
	pageSize: number = 50,
) {
	const { clients } = useArcade();
	const [cursor, setCursor] = useState<string | undefined>(undefined);
	const [client, setClient] = useState<string | undefined>(undefined);
	const [collection, setCollection] = useState<Token[]>([]);

	const fetchCollection = useCallback(
		async (address: string, count: number, cursor: string | undefined) => {
			if (client) {
				return await fetchCollectionFromClient(
					clients,
					client,
					address,
					count,
					cursor,
				);
			}

			const collections = await Promise.all(
				Object.keys(clients).map(async (project) => {
					return await fetchCollectionFromClient(
						clients,
						project,
						address,
						count,
						cursor,
					);
				}),
			);
			const filteredCollections = collections.filter(Boolean);
			if (filteredCollections.length === 0) {
				return { items: [], cursor: undefined, client: undefined };
			}
			return (
				filteredCollections[0] ?? {
					items: [],
					cursor: undefined,
					client: undefined,
				}
			);
		},
		[clients, client],
	);

	const getPrevPage = useCallback(() => {}, []);
	const getNextPage = useCallback(() => {}, []);

	useEffect(() => {
		if (collection.length === 0) {
			fetchCollection(collectionAddress, pageSize, cursor).then(
				({ items, cursor, client }) => {
					if (items.length > 0) {
						setCollection(
							items.map((i: Token) => {
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
