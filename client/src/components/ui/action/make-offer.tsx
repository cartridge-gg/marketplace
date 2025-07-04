import { Button } from "@cartridge/ui";
import type { TokenDetailsActionProps } from ".";
import { useMarketplaceActions } from "@cartridge/marketplace";
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

	return result.getTime();
}

interface MakeOfferActionProps extends TokenDetailsActionProps {
	showForm: boolean;
	onShowForm: () => void;
	onHideForm: () => void;
}

export function MakeOfferAction({
	collectionAddress,
	tokenId,
	showForm,
	onShowForm,
	onHideForm,
}: MakeOfferActionProps) {
	const { offer } = useMarketplaceActions();
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
				Number.parseFloat(formData.price),
				formData.currency,
			);

			await offer(
				account,
				collectionAddress,
				tokenId,
				Number.parseInt(formData.quantity),
				priceInWei,
				currencyAddress,
				addDays(new Date(), Number.parseInt(formData.expirationDays)),
			);

			onHideForm();
		},
		[offer, account, collectionAddress, tokenId, onHideForm],
	);

	if (showForm) {
		return (
			<ActionForm
				title="Make an Offer"
				submitLabel="Submit Offer"
				defaultValues={{ expirationDays: "1" }}
				maxExpirationDays={30}
				onSubmit={handleSubmit}
				onCancel={onHideForm}
			/>
		);
	}

	return (
		<Button variant="secondary" onClick={onShowForm}>
			Make Offer
		</Button>
	);
}
