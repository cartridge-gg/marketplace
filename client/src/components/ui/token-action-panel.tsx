import { useState } from "react";
import { ListTokenAction } from "./action/list-token";
import { MakeOfferAction } from "./action/make-offer";
import { BuyAction } from "./action/buy";
import type { Token } from "@dojoengine/torii-wasm/types";
import type { OrderModel } from "@cartridge/marketplace-sdk";

interface TokenActionsPanelProps {
	token: Token;
	collectionAddress: string;
	tokenId: string;
	isOwner: boolean;
	isListed: boolean;
	listing: OrderModel | null;
}

type ActiveForm = "list" | "offer" | null;

export function TokenActionsPanel({
	token,
	collectionAddress,
	tokenId,
	isOwner,
	isListed,
	listing,
}: TokenActionsPanelProps) {
	const [activeForm, setActiveForm] = useState<ActiveForm>(null);

	return (
		<div className="p-4 border-t border-background-300">
			<h3 className="text-lg font-semibold mb-4 text-primary-400">Actions</h3>
			<div className="space-y-3">
				<ListTokenAction
					token={token}
					collectionAddress={collectionAddress}
					tokenId={tokenId}
					isOwner={isOwner}
					showForm={activeForm === "list"}
					onShowForm={() => setActiveForm("list")}
					onHideForm={() => setActiveForm(null)}
				/>
				<MakeOfferAction
					token={token}
					collectionAddress={collectionAddress}
					tokenId={tokenId}
					isOwner={isOwner}
					showForm={activeForm === "offer"}
					onShowForm={() => setActiveForm("offer")}
					onHideForm={() => setActiveForm(null)}
				/>
				<BuyAction isListed={isListed} listing={listing} />
			</div>
		</div>
	);
}
