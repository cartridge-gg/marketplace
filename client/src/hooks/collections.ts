import { useContext } from "react";
import { CollectionContext } from "../contexts";

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

  const { collections, } = context;

  return { collections, };
};
