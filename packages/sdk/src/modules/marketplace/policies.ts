import type { constants } from "starknet";
import { configs } from "../../configs";
import { NAMESPACE } from "../../constants";
import { getContractByName } from "@dojoengine/core";
import { Access } from "./access";
import { Book } from "./book";
import { Order } from "./order";
import { DefaultMarketplaceOptions, type MarketplaceOptions } from "./options";

const CONTRACT_NAME = "Marketplace";
const CONTRACT_DESCRIPTION =
	"Marketplace contract to manage asset listings and offers.";

export const getMarketplacePolicies = (
	chainId: constants.StarknetChainId,
	options: MarketplaceOptions = DefaultMarketplaceOptions,
) => {
	const config = configs[chainId];
	const address: string = getContractByName(
		config.manifest,
		NAMESPACE,
		CONTRACT_NAME,
	);
	return {
		contracts: {
			[address]: {
				name: CONTRACT_NAME,
				description: CONTRACT_DESCRIPTION,
				methods: [
					...(options.access ? Access.getMethods() : []),
					...(options.book ? Book.getMethods() : []),
					...(options.order ? Order.getMethods() : []),
				],
			},
		},
	};
};
