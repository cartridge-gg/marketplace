import { Button } from "@cartridge/ui";
import { useMarketplaceActions } from "@cartridge/marketplace-sdk";
import type { TokenDetailsActionProps } from ".";
import { useCallback } from "react";
import { useAccount } from "@starknet-react/core";
import { getCurrencyAddress, amountToCurrencyBigInt } from "../../../currency";
import { constants } from "starknet";
import { ActionForm, type ActionFormData } from "../action-form";

/**
 * Adds a specified number of days to a given date
 * @param date - The base date (Date object or date string)
 * @param days - Number of days to add (can be negative to subtract days)
 * @returns A new Date object with the days added
 */
function addDays(date: Date | string, days: number): number {
	const baseDate = new Date(date);

	const result = new Date(baseDate);
	result.setDate(result.getDate() + days);

	return Math.floor(result.getTime() / 1000);
}

interface ListTokenActionProps extends TokenDetailsActionProps {
	showForm: boolean;
	onShowForm: () => void;
	onHideForm: () => void;
}

export function ListTokenAction({
	collectionAddress,
	tokenId,
	isOwner,
	showForm,
	onShowForm,
	onHideForm,
}: ListTokenActionProps) {
	const { list } = useMarketplaceActions();
	const { account } = useAccount();

	const handleSubmit = useCallback(
		async (formData: ActionFormData) => {
			if (!account) {
				console.error("Not connected");
				return;
			}

			const currencyAddress = getCurrencyAddress(
				formData.currency,
				constants.StarknetChainId.SN_MAIN,
			);
			if (!currencyAddress) {
				console.error(`${formData.currency} currency not found`);
				return;
			}

			const priceInWei = amountToCurrencyBigInt(
				parseFloat(formData.price),
				formData.currency,
			);

			await list(
				account,
				collectionAddress,
				tokenId,
				parseInt(formData.quantity),
				priceInWei,
				currencyAddress,
				addDays(new Date(), parseInt(formData.expirationDays)),
			);

			onHideForm();
		},
		[list, account, collectionAddress, tokenId, onHideForm],
	);

	if (!isOwner) return null;

	if (showForm) {
		return (
			<ActionForm
				title="List Token"
				submitLabel="List Token"
				defaultValues={{ expirationDays: "7" }}
				maxExpirationDays={90}
				onSubmit={handleSubmit}
				onCancel={onHideForm}
			/>
		);
	}

	return (
		<Button onClick={onShowForm} variant="secondary">
			List Token
		</Button>
	);
}
