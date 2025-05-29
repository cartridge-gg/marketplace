import { Button } from "@cartridge/ui";
import { TokenDetailsActionProps } from ".";
import { useMarketplaceActions } from "../../../hooks";
import { useCallback } from "react";
import { useAccount } from "@starknet-react/core";

const STRK_ADDRESS =
	"0x04718f5a0Fc34cC1AF16A1cdee98fFB20C31f5cD61D6Ab07201858f4287c938D";

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

export function MakeOfferAction({
	collectionAddress,
	tokenId,
}: TokenDetailsActionProps) {
	const { offer } = useMarketplaceActions();
	const { account } = useAccount();

	const handleMakeOffer = useCallback(async () => {
		// Logic to accept the offer
		if (!account) {
			console.error("Not connected");
			return;
		}
		await offer(
			account,
			collectionAddress,
			tokenId,
			1,
			10000000000000000000n,
			STRK_ADDRESS,
			addDays(new Date(), 1),
		);
	}, [offer, account, collectionAddress, tokenId]);

	return (
		<Button variant="secondary" onClick={handleMakeOffer}>
			Make Offer
		</Button>
	);
}
