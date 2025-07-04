import { type Chain, mainnet, sepolia } from "@starknet-react/chains";
import { jsonRpcProvider, StarknetConfig, voyager } from "@starknet-react/core";
import { type PropsWithChildren, useContext, useMemo, useRef } from "react";
import { constants } from "starknet";
import ControllerConnector from "@cartridge/connector/controller";
import type {
	KeychainOptions,
	ProfileOptions,
	ProviderOptions,
} from "@cartridge/controller";
import { getMarketplacePolicies } from "@cartridge/marketplace";
import { DEFAULT_PRESET, DEFAULT_PROJECT } from "../constants";
import { ArcadeContext } from "./arcade";

const CHAIN_ID = constants.StarknetChainId.SN_MAIN;
const RPC_URL = "https://api.cartridge.gg/x/starknet/mainnet";

const keychain: KeychainOptions = {
	policies: {
		contracts: {
			...getMarketplacePolicies(CHAIN_ID).contracts,
		},
	},
};

const profile: ProfileOptions = {
	preset: DEFAULT_PRESET,
	slot: DEFAULT_PROJECT,
	tokens: {
		erc20: ["eth", "strk", "usdc", "usdt"],
	},
};

export function StarknetProvider({ children }: PropsWithChildren) {
	const context = useContext(ArcadeContext);

	if (!context) {
		throw new Error(
			"The `useArcade` hook must be used within a `ArcadeProvider`",
		);
	}

	const { chains } = context;
	const controllerRef = useRef<ControllerConnector | null>(null);

	const jsonProvider = useMemo(() => {
		return jsonRpcProvider({
			rpc: (chain: Chain) => {
				switch (chain) {
					case mainnet:
					default:
						return { nodeUrl: RPC_URL };
				}
			},
		});
	}, [chains]);

	const provider: ProviderOptions | null = useMemo(() => {
		if (!chains.length)
			return {
				defaultChainId: constants.StarknetChainId.SN_MAIN,
				chains: [
					{
						rpcUrl: RPC_URL,
					},
				],
			};
		return {
			defaultChainId: CHAIN_ID,
			chains: chains.map((chain) => ({ rpcUrl: chain.rpcUrls.public.http[0] })),
		};
	}, [chains]);

	const controller = useMemo(() => {
		if (!provider) return null;
		if (controllerRef.current) return controllerRef.current;
		controllerRef.current = new ControllerConnector({
			...provider,
			...keychain,
			...profile,
		});
		return controllerRef.current;
	}, [controllerRef, provider]);

	return (
		<StarknetConfig
			autoConnect
			chains={[mainnet, sepolia]}
			connectors={!controller ? [] : [controller]}
			explorer={voyager}
			provider={jsonProvider}
		>
			{children}
		</StarknetConfig>
	);
}
