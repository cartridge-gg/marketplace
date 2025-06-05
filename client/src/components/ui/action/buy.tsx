import { Button } from "@cartridge/ui";
import type { OrderModel } from "@cartridge/marketplace-sdk";
import { WithAccount } from "@dojoengine/sdk/react";
import { useCallback } from "react";
import { constants, type AccountInterface } from "starknet";
import { useMarketplaceActions } from "../../../hooks/marketplace";
import { currencyToDecimal, getCurrencyByAddress } from "../../../currency";

type BuyProps = {
	listing: OrderModel | null;
	account: AccountInterface;
	isListed: boolean;
};
type PriceProps = {
	listing: OrderModel;
};

function Price({ listing }: PriceProps) {
	const currency = getCurrencyByAddress(
		listing.currency,
		constants.StarknetChainId.SN_MAIN,
	);
	if (!currency) {
		return null;
	}
	const price = currencyToDecimal(currency.symbol, listing.price.toString());
	return (
		<>
			{price} {currency.symbol}
		</>
	);
}

function Buy({ isListed, listing, account }: BuyProps) {
	const { executeListing } = useMarketplaceActions();
	const handleBuy = useCallback(async () => {
		if (!account) {
			console.error("Log into controller first");
			return;
		}

		if (!listing) {
			console.error("No listing available");
			return;
		}

		try {
			await executeListing(
				account,
				listing.id,
				listing.collection,
				listing.tokenId,
				listing.quantity,
				true,
			);
		} catch (error) {
			console.error("Failed to buy token", error);
		}
	}, [listing, account, executeListing]);

	if (!isListed || listing === null) {
		return null;
	}

	return (
		<Button variant="primary" onClick={handleBuy}>
			Buy for <Price listing={listing} />
		</Button>
	);
}

export const BuyAction = WithAccount(Buy);
