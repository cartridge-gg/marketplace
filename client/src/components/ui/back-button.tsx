import { Link } from "@tanstack/react-router";
type BackButtonProps = { to: string; params: Record<string, string> };

export function BackButton({
	to,
	params,
	children,
}: React.PropsWithChildren<BackButtonProps>) {
	return (
		<div className="mb-6">
			<Link
				to={to}
				params={params}
				className="text-primary-400 hover:text-primary-500 transition-colors"
			>
				<span className="flex items-center gap-2">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						className="h-5 w-5"
						viewBox="0 0 20 20"
						fill="currentColor"
					>
						<path
							fillRule="evenodd"
							d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
							clipRule="evenodd"
						/>
					</svg>
					{children}
				</span>
			</Link>
		</div>
	);
}
