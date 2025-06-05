import { useContext, useState, useEffect } from "react";
import { MarketplaceContext } from "../contexts/marketplace";
import type { Account, AccountInterface, BigNumberish } from "starknet";
import { CallData } from "starknet";
import { useDojoSDK } from "@dojoengine/sdk/react";
import { getContractByName } from "@dojoengine/core";
import { NAMESPACE } from "../constants";
import type { OrderModel } from "../modules/marketplace";
import { cairo } from "starknet";

function useMarketplace() {
	const ctx = useContext(MarketplaceContext);
	if (ctx === null) {
		throw new Error(
			"useMarketplaceActions must be used within a MarketplaceProvider",
		);
	}

	return ctx;
}

export function useOrderValidity(order: OrderModel) {
	const [isValid, setIsValid] = useState<boolean | null>(null);
	const { getValidity } = useMarketplaceActions();

	useEffect(() => {
		const checkValidity = async () => {
			try {
				const validity = await getValidity(
					order.id,
					order.collection,
					order.tokenId,
				);
				setIsValid(Boolean(validity));
			} catch (error) {
				console.error("Error checking order validity:", error);
				setIsValid(false);
			}
		};
		checkValidity();
	}, [order, getValidity]);

	return isValid;
}

export function useMarketplaceActions() {
	const { config } = useDojoSDK();
	const ctx = useMarketplace();

	const {
		cancel,
		remove,
		grantRole,
		pause,
		resume,
		revokeRole,
		setFee,
		buildListCalldata,
		buildExecuteCalldata,
		getValidity,
	} = ctx.provider.marketplace;
	// Overidding offer action with approve to currency contract first
	const offer = async (
		snAccount: Account | AccountInterface,
		collection: string,
		tokenId: BigNumberish,
		quantity: BigNumberish,
		price: BigNumberish,
		currency: string,
		expiration: BigNumberish,
	) => {
		try {
			return await ctx.provider.execute(
				snAccount,
				[
					{
						contractAddress: currency,
						entrypoint: "approve",
						calldata: CallData.compile({
							spender: getContractByName(
								config.manifest,
								NAMESPACE,
								"Marketplace",
							).address,
							amount: cairo.uint256(price),
						}),
					},
					{
						contractName: "Marketplace",
						entrypoint: "offer",
						calldata: [
							collection,
							tokenId,
							quantity,
							price,
							currency,
							expiration,
						],
					},
				],
				"MARKETPLACE",
			);
		} catch (error) {
			console.error(error);
			throw error;
		}
	};

	// Overidding list action with set_approval_for_all to marketplace contract first
	const list = async (
		snAccount: Account | AccountInterface,
		collection: string,
		tokenId: BigNumberish,
		quantity: BigNumberish,
		price: BigNumberish,
		currency: string,
		expiration: BigNumberish,
	) => {
		try {
			return await ctx.provider.execute(
				snAccount,
				[
					{
						contractAddress: collection,
						entrypoint: "set_approval_for_all",
						calldata: CallData.compile({
							operator: getContractByName(
								config.manifest,
								NAMESPACE,
								"Marketplace",
							).address,
							approved: true,
						}),
					},
					buildListCalldata(
						collection,
						tokenId,
						quantity,
						price,
						currency,
						expiration,
						true, // royalties
					),
				],
				"MARKETPLACE",
			);
		} catch (error) {
			console.error(error);
			throw error;
		}
	};

	// Overidding list action with set_approval_for_all to marketplace contract first
	const executeOffer = async (
		snAccount: Account | AccountInterface,
		orderId: BigNumberish,
		collection: string,
		tokenId: BigNumberish,
		quantity: BigNumberish,
		royalties: boolean,
		currency: string,
		price: BigNumberish,
	) => {
		try {
			return await ctx.provider.execute(
				snAccount,
				[
					{
						contractAddress: currency,
						entrypoint: "approve",
						calldata: CallData.compile({
							spender: getContractByName(
								config.manifest,
								NAMESPACE,
								"Marketplace",
							).address,
							amount: cairo.uint256(price),
						}),
					},
					buildExecuteCalldata(
						orderId,
						collection,
						tokenId,
						tokenId,
						quantity,
						royalties,
					),
				],
				"MARKETPLACE",
			);
		} catch (error) {
			console.error(error);
			throw error;
		}
	};

	// Overidding list action with set_approval_for_all to marketplace contract first
	const executeListing = async (
		snAccount: Account | AccountInterface,
		orderId: BigNumberish,
		collection: string,
		tokenId: BigNumberish,
		quantity: BigNumberish,
		royalties: boolean,
		currency: string,
		price: BigNumberish,
	) => {
		try {
			return await ctx.provider.execute(
				snAccount,
				[
					{
						contractAddress: currency,
						entrypoint: "approve",
						calldata: CallData.compile({
							spender: getContractByName(
								config.manifest,
								NAMESPACE,
								"Marketplace",
							).address,
							amount: cairo.uint256(price),
						}),
					},
					buildExecuteCalldata(
						orderId,
						collection,
						tokenId,
						tokenId,
						quantity,
						royalties,
					),
				],
				"MARKETPLACE",
			);
		} catch (error) {
			console.error(error);
			throw error;
		}
	};

	return {
		cancel,
		remove,
		executeListing,
		executeOffer,
		grantRole,
		list,
		offer,
		pause,
		resume,
		revokeRole,
		setFee,
		getValidity,
	};
}

export function useOrders() {
	const ctx = useMarketplace();
	return ctx.orders;
}
