import { useState, useCallback, useEffect, useRef } from "react";
import type { Token, ToriiClient } from "@dojoengine/torii-wasm";
import { addAddressPadding } from "starknet";
import { useArcade } from "./arcade";
import {
	useQuery,
	useInfiniteQuery,
	keepPreviousData,
	type UseQueryResult,
	type UseInfiniteQueryResult,
	type InfiniteData,
} from "@tanstack/react-query";

async function fetchCollectionFromClient(
	clients: { [key: string]: ToriiClient },
	client: string,
	address: string,
	count: number,
	cursor: string | undefined,
	tokenIds: string[],
): Promise<{
	items: Token[];
	cursor: string | undefined;
	client: string | undefined;
}> {
	try {
		const tokens = await clients[client].getTokens(
			[address],
			tokenIds.map((t) => addAddressPadding(t)),
			count,
			cursor,
		);
		if (tokens.items.length !== 0) {
			return {
				items: tokens.items,
				cursor: tokens.next_cursor,
				client: client,
			};
		}
		return { items: [], cursor: undefined, client: undefined };
	} catch (err) {
		console.error(err);
		return { items: [], cursor: undefined, client: undefined };
	}
}

async function fetchCollectionData(
	clients: { [key: string]: ToriiClient },
	collectionAddress: string,
	pageSize: number,
	cursor: string | undefined,
	tokenIds: string[],
	specificClient?: string,
): Promise<{
	items: Token[];
	cursor: string | undefined;
	client: string | undefined;
}> {
	if (specificClient && clients[specificClient]) {
		const result = await fetchCollectionFromClient(
			clients,
			specificClient,
			collectionAddress,
			pageSize,
			cursor,
			tokenIds,
		);
		if (result.items.length > 0) {
			return {
				items: result.items.map((item: Token) => {
					try {
						item.metadata = JSON.parse(item.metadata);
						return item;
					} catch (_err) {
						console.error(item, _err);
						return item;
					}
				}),
				cursor: result.cursor,
				client: result.client,
			};
		}
	}

	const collections = await Promise.all(
		Object.keys(clients).map(async (project) => {
			try {
				return await fetchCollectionFromClient(
					clients,
					project,
					collectionAddress,
					pageSize,
					cursor,
					tokenIds,
				);
			} catch (err) {
				console.error(err);
				return { items: [], cursor: undefined, client: undefined };
			}
		}),
	);

	const validCollection = collections.find(
		(c) => c?.items && c.items.length > 0,
	);

	if (!validCollection) {
		return { items: [], cursor: undefined, client: undefined };
	}

	return {
		items: validCollection.items.map((item: Token) => {
			try {
				item.metadata = JSON.parse(item.metadata);
				return item;
			} catch (_err) {
				console.error(item, _err);
				return item;
			}
		}),
		cursor: validCollection.cursor,
		client: validCollection.client,
	};
}

export function useCollection(
	collectionAddress: string,
	tokenIds: string[],
	pageSize = 50,
	initialCursor?: string,
) {
	const { clients } = useArcade();
	const [cursor, setCursor] = useState<string | undefined>(initialCursor);
	const [prevCursors, setPrevCursors] = useState<string[]>([]);
	const [client, setClient] = useState<string | undefined>(undefined);
	const [collection, setCollection] = useState<Token[]>([]);
	const [isLoading, setIsLoading] = useState<boolean>(false);
	const [currentPage, setCurrentPage] = useState<number>(1);
	const [currentCursor, setCurrentCursor] = useState<string | undefined>(
		initialCursor,
	);
	const hasHadTokenIds = useRef(false);

	const fetchCollection = useCallback(
		async (
			address: string,
			count: number,
			cursor: string | undefined,
			tokenIds: string[],
		) => {
			if (client) {
				return await fetchCollectionFromClient(
					clients,
					client,
					address,
					count,
					cursor,
					tokenIds,
				);
			}

			const collections = await Promise.all(
				Object.keys(clients).map(async (project) => {
					try {
						return await fetchCollectionFromClient(
							clients,
							project,
							address,
							count,
							cursor,
							tokenIds,
						);
					} catch (err) {
						console.error(err);
					}
				}),
			);
			const filteredCollections = collections.filter(
				(c) => c && c.items && c.items.length > 0,
			);

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

	const loadPage = useCallback(
		async (pageNumber: number, tokenIds: string[], newCursor?: string) => {
			setIsLoading(true);
			try {
				const {
					items,
					cursor: nextCursor,
					client: fetchedClient,
				} = await fetchCollection(
					collectionAddress,
					pageSize,
					newCursor,
					tokenIds,
				);
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
					setCursor(nextCursor);
					setCurrentCursor(newCursor);
					setClient(fetchedClient);
					setCurrentPage(pageNumber);
				}
			} finally {
				setIsLoading(false);
			}
		},
		[fetchCollection, collectionAddress, pageSize],
	);

	const getPrevPage = useCallback(() => {
		if (currentPage > 1 && prevCursors.length > 0) {
			const newPrevCursors = [...prevCursors];
			const prevCursor = newPrevCursors.pop() || undefined;
			setPrevCursors(newPrevCursors);
			loadPage(currentPage - 1, tokenIds, prevCursor);
		}
	}, [currentPage, prevCursors, loadPage, tokenIds]);

	const getNextPage = useCallback(() => {
		if (cursor) {
			if (currentCursor) {
				setPrevCursors([...prevCursors, currentCursor]);
			}
			loadPage(currentPage + 1, tokenIds, cursor);
		}
	}, [cursor, prevCursors, currentPage, loadPage, currentCursor, tokenIds]);

	// Handle initial load and cursor changes from URL
	useEffect(() => {
		if (!isLoading) {
			// Track if tokenIds has ever had values
			if (tokenIds.length > 0) {
				hasHadTokenIds.current = true;
				loadPage(currentPage, tokenIds, cursor);
			} else if (hasHadTokenIds.current && tokenIds.length === 0) {
				// tokenIds was cleared after having values, load initial page
				loadPage(1, tokenIds, undefined);
			}

			if (initialCursor !== currentCursor) {
				// URL cursor changed, load the page with new cursor
				if (initialCursor) {
					// Navigate to specific cursor
					loadPage(currentPage, tokenIds, initialCursor);
				} else {
					// No cursor means first page
					setCurrentPage(1);
					setCursor(undefined);
					setPrevCursors([]);
					loadPage(1, tokenIds, undefined);
				}
			} else if (collection.length === 0) {
				// Initial load with tokenIds
				loadPage(1, tokenIds, initialCursor);
			}
		}
	}, [initialCursor, collectionAddress, clients, tokenIds]); // React to cursor and address changes

	return {
		collection,
		getPrevPage,
		getNextPage,
		hasPrev: currentPage > 1,
		hasNext: !!cursor,
		isLoading,
		currentPage,
		nextCursor: cursor,
		prevCursor:
			prevCursors.length > 0 ? prevCursors[prevCursors.length - 1] : undefined,
	};
}

interface CollectionQueryResult {
	items: Token[];
	hasMore: boolean;
	client: string | undefined;
}

export function useCollectionQuery(
	collectionAddress: string,
	tokenIds: string[],
	page = 1,
	pageSize = 50,
): UseQueryResult<CollectionQueryResult> {
	const { clients } = useArcade();

	return useQuery({
		queryKey: ["collection", collectionAddress, tokenIds, page, pageSize],
		queryFn: async (): Promise<CollectionQueryResult> => {
			let currentCursor: string | undefined = undefined;
			let items: Token[] = [];
			let client: string | undefined = undefined;

			for (let i = 1; i <= page; i++) {
				const result = await fetchCollectionData(
					clients,
					collectionAddress,
					pageSize,
					currentCursor,
					tokenIds,
					client,
				);

				if (i === page) {
					items = result.items;
					client = result.client;
				}

				currentCursor = result.cursor;
				if (i < page && !currentCursor) {
					break;
				}
			}

			return {
				items,
				hasMore: !!currentCursor,
				client,
			};
		},
		placeholderData: keepPreviousData,
		enabled: !!collectionAddress && Object.keys(clients).length > 0,
	});
}

interface InfiniteCollectionPage {
	items: Token[];
	cursor: string | undefined;
	client: string | undefined;
}

export function useInfiniteCollectionQuery(
	collectionAddress: string,
	tokenIds: string[],
	pageSize = 50,
): UseInfiniteQueryResult<InfiniteData<InfiniteCollectionPage>, Error> {
	const { clients } = useArcade();
	const [client, setClient] = useState<string>("");

	return useInfiniteQuery<
		InfiniteCollectionPage,
		Error,
		InfiniteData<InfiniteCollectionPage>,
		(string | number | string[])[],
		string | undefined
	>({
		queryKey: ["collection-infinite", collectionAddress, tokenIds, pageSize],
		queryFn: async ({ pageParam }): Promise<InfiniteCollectionPage> => {
			const result = await fetchCollectionData(
				clients,
				collectionAddress,
				pageSize,
				pageParam,
				tokenIds,
				client === "" ? undefined : client,
			);

			if (client === "" && result.client) {
				setClient(result.client);
			}

			return {
				items: result.items,
				cursor: result.cursor,
				client: result.client,
			};
		},
		initialPageParam: undefined,
		getNextPageParam: (lastPage) => lastPage.cursor,
		enabled: !!collectionAddress && Object.keys(clients).length > 0,
	});
}
