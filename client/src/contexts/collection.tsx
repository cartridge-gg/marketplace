import {
	createContext,
	ReactNode,
	useContext,
	useEffect,
	useState,
} from "react";

import { ArcadeContext } from "./arcade";
import { Token } from "@dojoengine/torii-client";
import { getChecksumAddress } from "starknet";

export type WithCount<T> = T & { count: number };
export type Collection = Record<string, WithCount<Token>>;
export type Collections = Record<string, Collection>;

/**
 * Interface defining the shape of the Collection context.
 */
interface CollectionContextType {
	/** The Collection client instance */
	collections: Collections;
}
/**
 * React context for sharing Collection-related data throughout the application.
 */
export const CollectionContext = createContext<CollectionContextType | null>(
	null,
);

function deduplicateCollections(collections: Collections): Collections {
	const hasContract = (res: Collections, contract: string): boolean => {
		for (const project in res) {
			for (const c in res[project]) {
				if (c === contract) {
					return true;
				}
			}
		}
		return false;
	};

	const res: Collections = {};
	for (const project in collections) {
		res[project] = {};
		for (const contract in collections[project]) {
			if (hasContract(res, contract)) {
				continue;
			}
			res[project][contract] = collections[project][contract];
		}
	}
	return res;
}

/**
 * Provider component that makes Collection context available to child components.
 *
 * @param props.children - Child components that will have access to the Collection context
 * @throws {Error} If CollectionProvider is used more than once in the component tree
 */
export const CollectionProvider = ({ children }: { children: ReactNode }) => {
	const currentValue = useContext(CollectionContext);

	if (currentValue) {
		throw new Error("CollectionProvider can only be used once");
	}

	const context = useContext(ArcadeContext);

	if (!context) {
		throw new Error("CollectionProvider must be used within ArcadeProvider");
	}

	const [collections, setCollections] = useState<Collections>({});
	const { clients } = context;

	useEffect(() => {
		if (!clients || Object.keys(clients).length === 0) return;
		const fetchCollections = async () => {
			const collections: Collections = {};
			await Promise.all(
				Object.keys(clients).map(async (project) => {
					const client = clients[project];
					try {
						let tokens = await client.getTokens([], [], 5000);
						const allTokens = [...tokens.items];

						while (tokens.next_cursor) {
							tokens = await client.getTokens([], [], 5000, tokens.next_cursor);
							allTokens.push(...tokens.items);
						}

						const filtereds = allTokens.filter((token) => !!token.metadata);
						if (filtereds.length === 0) return;

						const collection: Record<
							string,
							WithCount<Token>
						> = filtereds.reduce(
							(acc: Record<string, WithCount<Token>>, curr: Token) => {
								const checksumAddress = getChecksumAddress(
									curr.contract_address,
								);

								if (Object.hasOwn(acc, checksumAddress)) {
									acc[checksumAddress].count += 1;
									return acc;
								}

								acc[checksumAddress] = {
									...curr,
									contract_address: checksumAddress,
									count: 1,
								};

								return acc;
							},
							{},
						);

						collections[project] = collection;
						return;
					} catch (error) {
						console.error("Error fetching tokens:", error, project);
						return;
					}
				}),
			);
			setCollections(deduplicateCollections(collections));
		};
		fetchCollections();
	}, [clients]);

	return (
		<CollectionContext.Provider
			value={{
				collections,
			}}
		>
			{children}
		</CollectionContext.Provider>
	);
};
