import { StrictMode } from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider, createRouter } from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Import the generated route tree
import { routeTree } from "./routeTree.gen";
import { Provider } from "./contexts";

import "./index.css";
import { DojoSdkProvider } from "@dojoengine/sdk/react";
import { initSDK, configs, setupWorld } from "@cartridge/marketplace";
import { constants } from "starknet";

// Create a new router instance
const router = createRouter({ routeTree });

// Register the router instance for type safety
declare module "@tanstack/react-router" {
	interface Register {
		router: typeof router;
	}
}

const queryClient = new QueryClient();

async function main() {
	const chainId = constants.StarknetChainId.SN_MAIN;
	const dojoConfig = configs[chainId];
	const sdk = await initSDK(chainId);

	const rootElement = document.getElementById("root")!;
	if (!rootElement.innerHTML) {
		const root = ReactDOM.createRoot(rootElement);
		root.render(
			<StrictMode>
				<QueryClientProvider client={queryClient}>
					<DojoSdkProvider
						// @ts-ignore
						sdk={sdk}
						dojoConfig={dojoConfig}
						clientFn={setupWorld}
					>
						<Provider>
							<RouterProvider router={router} />
						</Provider>
					</DojoSdkProvider>
				</QueryClientProvider>
			</StrictMode>,
		);
	}
}

main().catch((err) => console.error("failed to render app", err));
