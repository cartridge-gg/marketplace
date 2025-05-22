import { PropsWithChildren } from "react";
import { ArcadeProvider } from "./arcade";
import { MarketplaceProvider } from "./marketplace";

export function Provider({ children }: PropsWithChildren) {

  return (
    <ArcadeProvider>
      <MarketplaceProvider>
        {children}
      </MarketplaceProvider>
    </ArcadeProvider>
  );
}
