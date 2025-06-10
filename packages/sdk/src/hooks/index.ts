export * from "./token";
export * from "./marketplace";
import type { constants } from "starknet";
import { configs } from "../configs";

export function useConfig(chainId: constants.StarknetChainId) {
	return configs[chainId];
}
