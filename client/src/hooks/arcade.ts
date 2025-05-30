import { useContext } from "react";
import { ArcadeContext } from "../contexts";

export function useArcade() {
	const context = useContext(ArcadeContext);

	if (!context) {
		throw new Error(
			"The `useArcade` hook must be used within an `ArcadeProvider`",
		);
	}

	return context;
}
