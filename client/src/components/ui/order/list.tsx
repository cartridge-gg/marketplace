import { useMemo } from "react";
import { currencyToDecimal, getCurrencyByAddress } from "../../../currency.ts";
import { constants } from "starknet";
import { AcceptOfferAction } from "../action/accept-offer.tsx";
import { DeleteOrderAction } from "../action/delete-order.tsx";
import { useOrderValidity } from "../../../hooks/marketplace";
import type { OrderModel } from "@cartridge/marketplace-sdk";

interface OrderItemProps {
	order: OrderModel;
	isOwner: boolean;
	onAcceptOffer?: (order: OrderModel) => void;
}

function OrderSkeleton() {
	return (
		<div className="bg-background-200 p-3 rounded-md animate-pulse">
			<div className="flex justify-between items-center">
				<div className="space-y-2">
					<div className="h-4 w-16 bg-gray-300 rounded" />
					<div className="h-5 w-24 bg-gray-300 rounded" />
				</div>
				<div className="space-y-2">
					<div className="h-4 w-16 bg-gray-300 rounded" />
					<div className="h-5 w-32 bg-gray-300 rounded" />
				</div>
				<div className="h-8 w-24 bg-gray-300 rounded" />
			</div>
		</div>
	);
}

export function OrderItem({ order, isOwner }: OrderItemProps) {
	const isValid = useOrderValidity(order);
	const currency = useMemo(
		() =>
			getCurrencyByAddress(order.currency, constants.StarknetChainId.SN_MAIN),
		[order],
	);

	if (!currency) {
		return null;
	}

	if (isValid === null) {
		return <OrderSkeleton />;
	}

	return (
		<div className="bg-background-200 p-3 rounded-md">
			<div className="flex justify-between items-center">
				<div>
					<p className="text-sm text-gray-500">Price</p>
					<p className="font-medium">
						{currencyToDecimal(currency.symbol, order.price.toString())} STRK
					</p>
				</div>
				<div>
					<p className="text-sm text-gray-500">By</p>
					<p className="font-medium truncate" title={order.owner}>
						{order.owner.substring(0, 8)}...
						{order.owner.substring(order.owner.length - 6)}
					</p>
				</div>
				{isValid ? (
					<AcceptOfferAction order={order} isOwner={isOwner} />
				) : (
					<DeleteOrderAction order={order} />
				)}
			</div>
		</div>
	);
}

interface TokenOrdersPanelProps {
	orders: OrderModel[];
	isOwner: boolean;
	onAcceptOffer?: (order: OrderModel) => void;
}

export function TokenOrdersPanel({
	orders,
	isOwner,
	onAcceptOffer,
}: TokenOrdersPanelProps) {
	if (!orders || orders.length === 0) return null;

	return (
		<div className="mt-4 p-4 bg-background-300 rounded-lg">
			<h2 className="text-xl font-semibold mb-4 text-primary-400">
				Active Orders
			</h2>
			<div className="space-y-3">
				{orders.map((order, index) => (
					<OrderItem
						key={`${order.id}-${index}`}
						order={order}
						isOwner={isOwner}
						onAcceptOffer={onAcceptOffer}
					/>
				))}
			</div>
		</div>
	);
}
