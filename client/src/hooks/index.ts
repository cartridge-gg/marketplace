import { useEffect, useState } from "react";

export * from "./collections";
export * from "./arcade";
export * from "./token";
export * from "./marketplace";

/**
 * Custom hook that manages initialization state
 * @returns A tuple containing the initialization status and setter function
 * - initialized: boolean | undefined - true when initialized, undefined when not yet initialized
 * - setInitialized: function to manually set the initialization state
 */
export function useInitialized(
	dependencyCallback?: () => void | Promise<void>,
): [
	boolean | undefined,
	React.Dispatch<React.SetStateAction<boolean | undefined>>,
] {
	const [initialized, setInitialized] = useState<boolean | undefined>();

	useEffect(() => {
		if (initialized) return;
		async function initialize() {
			if (dependencyCallback) {
				await dependencyCallback();
			}
			setInitialized(true);
		}
		initialize();
	}, [initialized, dependencyCallback]);

	return [initialized, setInitialized];
}
