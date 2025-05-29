import { useContext } from "react";
import { MarketplaceContext } from "../contexts/marketplace";

function useMarketplce() {
	const ctx = useContext(MarketplaceContext);
	if (ctx === null) {
		throw new Error(
			"useMarketplaceActions must be used within a MarketplaceProvider",
		);
	}

	return ctx;
}

export function useMarketplaceActions() {
	const ctx = useMarketplce();

	const {
		cancelListing,
		cancelOffer,
		deleteListing,
		deleteOffer,
		executeListing,
		executeOffer,
		grantRole,
		list,
		offer,
		pause,
		resume,
		revokeRole,
		setFee,
	} = ctx.actions.Marketplace;
	return {
		cancelListing,
		cancelOffer,
		deleteListing,
		deleteOffer,
		executeListing,
		executeOffer,
		grantRole,
		list,
		offer,
		pause,
		resume,
		revokeRole,
		setFee,
	};
}
export function useOrders() {
	const ctx = useMarketplce();
	return ctx.orders;
}
