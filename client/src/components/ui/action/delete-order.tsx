import { Button } from "@cartridge/ui";
import type { OrderModel } from "@cartridge/marketplace-sdk";
import { WithAccount } from "@dojoengine/sdk/react";
import { useCallback } from "react";
import type { AccountInterface } from "starknet";
import { useMarketplaceActions } from "../../../hooks/marketplace";

type DeleteOrderProps = {
	order: OrderModel;
	account: AccountInterface;
	onDelete?: () => void;
};

function DeleteOrder({ order, account, onDelete }: DeleteOrderProps) {
	const { remove } = useMarketplaceActions();

	const handleDelete = useCallback(async () => {
		if (!account) {
			console.error("Log into controller first");
			return;
		}

		try {
			await remove(account, order.id, order.collection, order.tokenId);
			onDelete?.();
		} catch (error) {
			console.error("Failed to delete order", error);
		}
	}, [order, account, remove, onDelete]);

	return (
		<Button variant="secondary" onClick={handleDelete}>
			Delete Order
		</Button>
	);
}

export const DeleteOrderAction = WithAccount(DeleteOrder);
