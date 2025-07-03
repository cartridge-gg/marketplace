import { Button } from "@cartridge/ui";
import { type OrderModel, useMarketplaceActions } from "@cartridge/marketplace";
import { WithAccount } from "@dojoengine/sdk/react";
import { useCallback } from "react";
import type { AccountInterface } from "starknet";

type CancelOrderProps = {
	order: OrderModel;
	account: AccountInterface;
	onCancel?: () => void;
};

function CancelOrder({ order, account, onCancel }: CancelOrderProps) {
	const { cancel } = useMarketplaceActions();

	const handleCancel = useCallback(async () => {
		if (!account) {
			console.error("Log into controller first");
			return;
		}

		try {
			await cancel(account, order.id, order.collection, order.tokenId);
			onCancel?.();
		} catch (error) {
			console.error("Failed to cancel order", error);
		}
	}, [order, account, cancel, onCancel]);

	return (
		<Button
			variant="ghost"
			size="icon"
			onClick={handleCancel}
			className="hover:text-red-500"
		>
			<svg
				width="16"
				height="16"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
			>
				<path d="M3 6h18" />
				<path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
				<path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
				<line x1="10" y1="11" x2="10" y2="17" />
				<line x1="14" y1="11" x2="14" y2="17" />
			</svg>
		</Button>
	);
}

export const CancelOrderAction = WithAccount(CancelOrder);
