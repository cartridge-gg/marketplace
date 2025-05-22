import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  ArcadeProvider as ExternalProvider,
  Registry,
  GameModel,
  RegistryModel,
  RegistryOptions,
  EditionModel,
} from "@cartridge/arcade";
import {
  constants,
  RpcProvider,
  shortString,
} from "starknet";
import { Chain } from "@starknet-react/chains";

const CHAIN_ID = constants.StarknetChainId.SN_MAIN;

export interface ProjectProps {
  namespace: string;
  project: string;
}

/**
 * Interface defining the shape of the Arcade context.
 */
interface ArcadeContextType {
  /** The Arcade client instance */
  chainId: string;
  provider: ExternalProvider;
  games: GameModel[];
  editions: EditionModel[];
  chains: Chain[];
}

/**
 * React context for sharing Arcade-related data throughout the application.
 */
export const ArcadeContext = createContext<ArcadeContextType | null>(null);

/**
 * Provider component that makes Arcade context available to child components.
 *
 * @param props.children - Child components that will have access to the Arcade context
 * @throws {Error} If ArcadeProvider is used more than once in the component tree
 */
export const ArcadeProvider = ({ children }: { children: ReactNode }) => {
  const currentValue = useContext(ArcadeContext);
  const [games, setGames] = useState<{ [gameId: string]: GameModel }>({});
  const [editions, setEditions] = useState<{
    [editionId: string]: EditionModel;
  }>({});
  const [chains, setChains] = useState<Chain[]>([]);
  const [initialized, setInitialized] = useState<boolean>(false);

  useEffect(() => {
    async function getChains() {
      const chains: Chain[] = await Promise.all(
        Object.values(editions).map(async (edition) => {
          const provider = new RpcProvider({ nodeUrl: edition.config.rpc });
          let id = "0x0";
          try {
            id = await provider.getChainId();
          } catch (e) {
            // Skip
          }
          return {
            id: BigInt(id),
            name: shortString.decodeShortString(id),
            network: id,
            rpcUrls: {
              default: { http: [edition.config.rpc] },
              public: { http: [edition.config.rpc] },
            },
            nativeCurrency: {
              address: "0x0",
              name: "Ether",
              symbol: "ETH",
              decimals: 18,
            },
          };
        }),
      );
      // Deduplicate chains
      const uniques = chains.filter(
        (chain, index) =>
          chain.id !== 0n &&
          index === chains.findIndex((t) => t.id === chain.id),
      );
      setChains(uniques);
    }
    getChains();
  }, [editions]);

  if (currentValue) {
    throw new Error("ArcadeProvider can only be used once");
  }

  const provider = useMemo(
    // TODO: Update here to select either Mainnet or Sepolia
    () => new ExternalProvider(CHAIN_ID),
    [],
  );

  const handleRegistryModels = useCallback((models: RegistryModel[]) => {
    models.forEach(async (model: RegistryModel) => {
      if (GameModel.isType(model as GameModel)) {
        const game = model as GameModel;
        if (!game.exists()) {
          setGames((prevGames) => {
            const newGames = { ...prevGames };
            delete newGames[game.identifier];
            return newGames;
          });
          return;
        }
        setGames((prevGames) => ({
          ...prevGames,
          [game.identifier]: game,
        }));
      } else if (EditionModel.isType(model as EditionModel)) {
        const edition = model as EditionModel;
        if (!edition.exists()) {
          setEditions((prevEditions) => {
            const newEditions = { ...prevEditions };
            delete newEditions[edition.identifier];
            return newEditions;
          });
          return;
        }
        setEditions((prevEditions) => ({
          ...prevEditions,
          [edition.identifier]: edition,
        }));
      }
    });
  }, []);

  useEffect(() => {
    if (initialized) return;
    const initialize = async () => {
      await Registry.init(CHAIN_ID);
      setInitialized(true);
    };
    initialize();
  }, [initialized, setInitialized]);

  useEffect(() => {
    if (!initialized) return;
    const options: RegistryOptions = {
      access: false,
      game: true,
      edition: true,
    };
    Registry.fetch(handleRegistryModels, options);
    Registry.sub(handleRegistryModels, options);
    return () => {
      Registry.unsub();
    };
  }, [initialized, handleRegistryModels]);

  const sortedGames = useMemo(() => {
    return Object.values(games).sort((a, b) => a.name.localeCompare(b.name));
  }, [games]);

  const sortedEditions = useMemo(() => {
    return Object.values(editions)
      .sort((a, b) => a.id - b.id)
      .sort((a, b) => b.priority - a.priority);
  }, [editions, sortedGames]);

  return (
    <ArcadeContext.Provider
      value={{
        chainId: CHAIN_ID,
        provider,
        games: sortedGames,
        editions: sortedEditions,
        chains,
      }}
    >
      {children}
    </ArcadeContext.Provider>
  );
};
