import { Button } from "@cartridge/ui";
import { TokenDetailsActionProps } from ".";

export function AcceptOfferAction({
	token,
	collectionAddress,
	tokenId,
	isOwner,
}: TokenDetailsActionProps) {
	const handleAcceptOffer = () => {
		// Logic to accept the offer
		console.log(token);
		console.log(
			`Accepting offer for token ${tokenId} from collection ${collectionAddress}`,
		);
	};

	if (!isOwner) return null;

	return (
		<Button variant="secondary" onClick={handleAcceptOffer}>
			Accept Offer
		</Button>
	);
}
