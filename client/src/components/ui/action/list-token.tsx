import { Button } from "@cartridge/ui";
import { TokenDetailsActionProps } from ".";

export function ListTokenAction({
	token,
	collectionAddress,
	tokenId,
	isOwner,
}: TokenDetailsActionProps) {
	const handleListToken = () => {
		// Logic to list the token
		console.log(
			`Listing token ${tokenId} from collection ${collectionAddress}`,
		);
	};

	if (!isOwner) return null;

	return (
		<Button onClick={handleListToken} variant="secondary">
			List Token
		</Button>
	);
}
