import { Button } from "@cartridge/ui";
import { type OrderModel, useMarketplaceActions } from "@cartridge/marketplace";
import { WithAccount } from "@dojoengine/sdk/react";
import { useCallback } from "react";
import type { AccountInterface } from "starknet";

type AcceptOfferProps = {
	isOwner: boolean;
	order: OrderModel;
	account: AccountInterface;
};
function AcceptOffer({ isOwner, order, account }: AcceptOfferProps) {
	const { executeOffer } = useMarketplaceActions();
	const handleAcceptOffer = useCallback(async () => {
		if (!account) {
			console.error("Log into controller first");
			return;
		}

		try {
			await executeOffer(
				account,
				order.id,
				order.collection,
				order.tokenId,
				order.quantity,
				true,
				order.currency,
				order.price,
			);
		} catch (error) {
			console.error("Failed to accept offer", error);
		}
	}, [order, account, executeOffer]);

	if (!isOwner) return null;

	return (
		<Button variant="primary" onClick={handleAcceptOffer}>
			Accept Offer
		</Button>
	);
}

export const AcceptOfferAction = WithAccount(AcceptOffer);
