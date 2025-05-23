import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";

import { ArcadeContext } from "./arcade";
import { Token } from "@dojoengine/torii-client";

export interface Collections { [key: string] : Token[] };

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
export const CollectionContext = createContext<CollectionContextType | null>(null);

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
      await Promise.all(Object.keys(clients).map(async (project) => {
        const client = clients[project];
        try {
          const tokens = await client.getTokens(undefined, undefined, 100000);
          const filtereds = tokens.items.filter((token) => !!token.metadata);
          if (filtereds.length === 0) return;
          collections[project] = filtereds;
          return;
        } catch (error) {
          console.error("Error fetching tokens:", error, project);
          return;
        }
      }));
      setCollections(collections);
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
