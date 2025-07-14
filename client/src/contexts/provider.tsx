import { PropsWithChildren } from "react";
import { ArcadeProvider } from "@cartridge/marketplace";
import { MarketplaceProvider } from "./marketplace";
import { CollectionProvider } from "./collection";
import { StarknetProvider } from "./starknet";

export function Provider({ children }: PropsWithChildren) {
	return (
		<ArcadeProvider>
			<StarknetProvider>
				<MarketplaceProvider>
					<CollectionProvider>{children}</CollectionProvider>
				</MarketplaceProvider>
			</StarknetProvider>
		</ArcadeProvider>
	);
}
