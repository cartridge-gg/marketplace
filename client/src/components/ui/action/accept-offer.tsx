import { Button } from "@cartridge/ui";
import type { OrderModel } from "@cartridge/marketplace-sdk";
import { WithAccount } from "@dojoengine/sdk/react";
import { useCallback } from "react";
import type { AccountInterface } from "starknet";
import { useMarketplaceActions } from "../../../hooks/marketplace";

type AcceptOfferProps = {
	isOwner: boolean;
	order: OrderModel;
	account: AccountInterface;
};
function AcceptOffer({ isOwner, order, account }: AcceptOfferProps) {
	const { execute } = useMarketplaceActions();
	const handleAcceptOffer = useCallback(async () => {
		if (!account) {
			console.error("Log into controller first");
			return;
		}

		try {
			await execute(
				account,
				order.id,
				order.collection,
				order.tokenId,
				order.quantity,
				true,
			);
		} catch (error) {
			console.error("Failed to accept offer", error);
		}
	}, [order, account, execute]);

	if (!isOwner) return null;

	return (
		<Button variant="primary" onClick={handleAcceptOffer}>
			Accept Offer
		</Button>
	);
}

export const AcceptOfferAction = WithAccount(AcceptOffer);
