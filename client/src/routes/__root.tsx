import { createRootRoute, Link, Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { Connection } from "../components/ui/connection";

export const Route = createRootRoute({
	component: () => (
		<>
			<div className="p-2 flex justify-between gap-2">
				<Link to="/" className="[&.active]:font-bold">
					Home
				</Link>{" "}
				<Connection />
			</div>
			<hr />
			<Outlet />
			<TanStackRouterDevtools />
		</>
	),
});
