import type { constants } from "starknet";
import { configs } from "../../configs";
import { NAMESPACE } from "../../constants";
import { getContractByName } from "../../provider/helpers";
import { Access } from "./access";
import { Book } from "./book";
import { Order } from "./order";
import { DefaultMarketplaceOptions, type MarketplaceOptions } from "./options";

const CONTRACT_NAME = "Marketplace";
const CONTRACT_TAG = `${NAMESPACE}-${CONTRACT_NAME}`;
const CONTRACT_DESCRIPTION =
	"Marketplace contract to manage asset listings and offers.";

export const getMarketplacePolicies = (
	chainId: constants.StarknetChainId,
	options: MarketplaceOptions = DefaultMarketplaceOptions,
) => {
	const config = configs[chainId];
	const address: string = getContractByName(config.manifest, CONTRACT_TAG);
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
