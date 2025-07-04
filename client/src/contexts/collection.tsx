import {
	createContext,
	type ReactNode,
	useContext,
	useEffect,
	useState,
} from "react";

import { ArcadeContext } from "./arcade";
import type { Token } from "@dojoengine/torii-client";
import { Marketplace } from "@cartridge/marketplace";

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
		Marketplace.fetchCollections(clients).then((collections) => {
			setCollections(deduplicateCollections(collections));
		});
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
