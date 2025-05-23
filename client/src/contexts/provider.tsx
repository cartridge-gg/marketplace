import { PropsWithChildren } from "react";
import { ArcadeProvider } from "./arcade";
import { MarketplaceProvider } from "./marketplace";
import { CollectionProvider } from "./collection";

export function Provider({ children }: PropsWithChildren) {

  return (
    <ArcadeProvider>
      <MarketplaceProvider>
        <CollectionProvider>
          {children}
        </CollectionProvider>
      </MarketplaceProvider>
    </ArcadeProvider>
  );
}
