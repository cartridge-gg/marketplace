import { createFileRoute } from "@tanstack/react-router";
import { useMarketplaceActions, useToken } from "../../../hooks";
import { useCallback, useMemo } from "react";
import { CollectibleAsset } from "@cartridge/ui";
import { getChecksumAddress } from "starknet";
import { BackButton } from "../../../components/ui/back-button";
import { TokenActionsPanel } from "../../../components/ui/token-action-panel";
import { useAccount } from "@starknet-react/core";
import { TokenOrdersPanel } from "../../../components/ui/order/list";
import { useIsTokenListed, useTokenOrders } from "../../../queries";
import type { OrderModel } from "@cartridge/marketplace-sdk";

// Define metadata interface based on the expected structure
interface TokenMetadata {
	name?: string;
	image?: string;
	description?: string;
	attributes?: Array<{
		trait_type: string;
		value: string | number;
		trait: string;
	}>;
	[key: string]: any;
}

export const Route = createFileRoute("/token/$collectionAddress/$tokenId")({
	component: RouteComponent,
});

function RouteComponent() {
	const { collectionAddress, tokenId } = Route.useParams();
	const { address, account } = useAccount();
	const { token, isOwner } = useToken(collectionAddress, tokenId, address);

	const { data: orders } = useTokenOrders(collectionAddress, tokenId);
	const {
		data: { isListed, listing },
	} = useIsTokenListed(collectionAddress, tokenId);

	const { executeListing } = useMarketplaceActions();

	const tokenMetadata = useMemo<TokenMetadata>(() => {
		if (!token || !token.metadata) return {};
		// Handle the case where token.metadata might be a string or an object
		if (typeof token.metadata === "string") {
			try {
				return JSON.parse(token.metadata) as TokenMetadata;
			} catch (e) {
				console.error("Failed to parse token metadata:", e);
				return {};
			}
		}
		return token.metadata as TokenMetadata;
	}, [token]);

	const tokenName = useMemo(() => {
		if (!token) return "Loading...";
		const prefix = tokenMetadata.name ?? token.name;
		const suffix = Number.parseInt(token.token_id);
		return `${prefix} #${suffix}`;
	}, [token, tokenMetadata]);

	const imageUrl = useMemo(() => {
		if (!token || !tokenMetadata.image) return "";
		return tokenMetadata.image.replace("ipfs://", "https://ipfs.io/ipfs/");
	}, [token, tokenMetadata]);

	const handleAcceptOffer = useCallback(
		async (order: OrderModel) => {
			if (!account) {
				console.error("Log into controller first");
				return;
			}

			await executeListing(
				account,
				order.id,
				collectionAddress,
				tokenId,
				order.quantity,
				true,
				order.currency,
				order.price,
			);
		},
		[account, collectionAddress, tokenId, executeListing],
	);

	if (!token) {
		return (
			<div className="flex items-center justify-center h-screen">
				<div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
			</div>
		);
	}

	return (
		<div className="container mx-auto px-4 py-8">
			<div className="flex flex-col md:flex-row gap-8">
				{/* Token Image */}
				<div className="w-full md:w-1/2">
					<div className="bg-background-200 rounded-lg overflow-hidden shadow-lg">
						<CollectibleAsset
							title={tokenName}
							image={imageUrl}
							className="w-full h-auto"
						/>
						<TokenActionsPanel
							token={token}
							collectionAddress={collectionAddress}
							tokenId={tokenId}
							isOwner={isOwner}
							isListed={isListed}
							listing={listing}
						/>
						<TokenOrdersPanel
							orders={orders || []}
							isOwner={isOwner}
							onAcceptOffer={handleAcceptOffer}
						/>
					</div>
				</div>

				{/* Token Details */}
				<div className="w-full md:w-1/2">
					<div className="bg-background-200 rounded-lg p-6 shadow-lg">
						<h1 className="text-3xl font-bold mb-4 text-primary-500">
							{tokenName}
						</h1>

						<BackButton
							to="/collection/$collectionAddress"
							params={{
								collectionAddress: getChecksumAddress(token.contract_address),
							}}
						>
							Back to collection
						</BackButton>

						<div className="space-y-4">
							<div>
								<h2 className="text-xl font-semibold mb-2 text-primary-400">
									Token Details
								</h2>
								<div className="grid grid-cols-2 gap-4">
									<div className="bg-background-300 p-3 rounded-md">
										<p className="text-sm text-gray-500">Token ID</p>
										<p className="font-medium">
											{parseInt(token.token_id, 16)}
										</p>
									</div>
									<div className="bg-background-300 p-3 rounded-md">
										<p className="text-sm text-gray-500">Contract</p>
										<p
											className="font-medium truncate"
											title={token.contract_address}
										>
											{token.contract_address.substring(0, 8)}...
											{token.contract_address.substring(
												token.contract_address.length - 6,
											)}
										</p>
									</div>
								</div>
							</div>

							{tokenMetadata && Object.keys(tokenMetadata).length > 0 && (
								<div>
									<h2 className="text-xl font-semibold mb-2 text-primary-400">
										Metadata
									</h2>
									<div className="bg-background-300 p-4 rounded-md">
										{Object.entries(tokenMetadata).map(([key, value]) => {
											// Skip image and attributes as they're displayed separately
											if (key === "image" || key === "attributes") return null;

											return (
												<div key={key} className="mb-2 last:mb-0">
													<p className="text-sm text-gray-500 capitalize">
														{key}
													</p>
													<p className="font-medium break-words">
														{typeof value === "object"
															? JSON.stringify(value)
															: String(value)}
													</p>
												</div>
											);
										})}
									</div>
								</div>
							)}

							{/* Token Attributes/Traits */}
							{tokenMetadata.attributes &&
								tokenMetadata.attributes.length > 0 && (
									<div>
										<h2 className="text-xl font-semibold mb-2 text-primary-400">
											Attributes
										</h2>
										<div className="grid grid-cols-2 gap-2">
											{tokenMetadata.attributes.map(
												(attr: TokenMetadata, index: number) => {
													const traitName = attr.trait_type ?? attr.trait;
													return (
														<div
															key={index}
															className="bg-background-300 p-3 rounded-md"
														>
															<p className="text-sm text-gray-500 capitalize">
																{traitName}
															</p>
															<p className="font-medium">{attr.value}</p>
														</div>
													);
												},
											)}
										</div>
									</div>
								)}
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
