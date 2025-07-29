import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { useWalletTokens } from "../../hooks/token";
import { getChecksumAddress } from "starknet";
import { CollectibleAssetCard } from "@cartridge/ui";
import type { Token } from "@dojoengine/torii-wasm";

// Define metadata interface based on the expected structure
interface TokenMetadata {
	name?: string;
	image?: string;
	description?: string;
	attributes?: Array<{
		trait_type: string;
		value: string | number;
	}>;
	[key: string]: any;
}

export const Route = createFileRoute("/wallet/$address")({
	component: RouteComponent,
});

function RouteComponent() {
	const { address } = Route.useParams();
	const { tokens, loading } = useWalletTokens(address);

	if (loading) {
		return (
			<div className="flex items-center justify-center h-screen bg-background-100">
				<div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
			</div>
		);
	}

	return (
		<div className="bg-background-100 min-h-screen w-full overflow-y-auto pb-12">
			<div className="container mx-auto px-4 py-8">
				<div className="mb-6">
					<Link
						to="/"
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
							Back to Collections
						</span>
					</Link>
				</div>
				<WalletTokensGrid tokens={tokens} address={address} />
			</div>
		</div>
	);
}

interface WalletTokensGridProps {
	tokens: Token[];
	address: string;
}

function WalletTokensGrid({ tokens, address }: WalletTokensGridProps) {
	// Group tokens by collection
	const tokensByCollection = useMemo(() => {
		const grouped: { [contractAddress: string]: Token[] } = {};
		tokens.forEach((token) => {
			const key = token.contract_address;
			if (!grouped[key]) {
				grouped[key] = [];
			}
			grouped[key].push(token);
		});
		return grouped;
	}, [tokens]);

	const truncatedAddress = `${address.slice(0, 6)}...${address.slice(-4)}`;

	return (
		<>
			<h1 className="text-3xl font-bold mb-2 text-primary-500">
				Wallet: {truncatedAddress}
			</h1>
			<p className="text-gray-400 mb-8">
				{tokens.length} token{tokens.length !== 1 ? "s" : ""} found
			</p>

			{tokens.length === 0 ? (
				<div className="text-center py-12">
					<p className="text-gray-500 text-lg">
						No tokens found in this wallet
					</p>
				</div>
			) : (
				<div className="space-y-8">
					{Object.entries(tokensByCollection).map(
						([contractAddress, collectionTokens]) => (
							<div key={contractAddress}>
								<h2 className="text-xl font-semibold mb-4 text-primary-400">
									{collectionTokens[0]?.name || "Unknown Collection"}
									<span className="text-sm text-gray-500 ml-2">
										({collectionTokens.length} token
										{collectionTokens.length !== 1 ? "s" : ""})
									</span>
								</h2>
								<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
									{collectionTokens.map((token) => (
										<TokenCard
											token={token}
											key={`${token.contract_address}-${token.token_id}`}
										/>
									))}
								</div>
							</div>
						),
					)}
				</div>
			)}
		</>
	);
}

function TokenCard({ token }: { token: Token }) {
	const tokenMetadata = useMemo<TokenMetadata>(() => {
		if (!token.metadata) return {};

		if (typeof token.metadata === "string") {
			try {
				return JSON.parse(token.metadata);
			} catch (error) {
				console.error("Error parsing metadata:", error);
				return {};
			}
		}

		return token.metadata as TokenMetadata;
	}, [token]);

	const tokenName = useMemo(() => {
		const prefix = tokenMetadata.name ?? token.name;
		const suffix = Number.parseInt(token.token_id ?? "0x0", 16);
		return `${prefix} #${suffix}`;
	}, [token, tokenMetadata]);

	const imageUrl = useMemo(() => {
		if (!tokenMetadata.image) return "";
		return tokenMetadata.image.replace("ipfs://", "https://ipfs.io/ipfs/");
	}, [tokenMetadata]);

	return (
		<div className="bg-background-200 rounded-lg overflow-hidden shadow-lg transition-transform hover:scale-[1.02] hover:shadow-xl">
			<Link
				to="/token/$collectionAddress/$tokenId"
				params={{
					collectionAddress: getChecksumAddress(token.contract_address),
					tokenId: token.token_id ?? "0x0",
				}}
				className="block h-full"
			>
				<div>
					<CollectibleAssetCard
						title=""
						description=""
						image={imageUrl}
						className="w-full h-auto"
					/>
				</div>
				<div className="p-4">
					<h3 className="text-lg font-semibold text-primary-500 mb-1">
						{tokenName}
					</h3>

					{/* Display a few attributes if available */}
					{tokenMetadata.attributes && tokenMetadata.attributes.length > 0 && (
						<div className="mt-2 flex flex-wrap gap-1">
							{tokenMetadata.attributes.slice(0, 3).map((attr, index) => (
								<span
									key={index}
									className="bg-background-300 text-xs px-2 py-1 rounded-md"
								>
									{attr.trait_type}: {attr.value}
								</span>
							))}
							{tokenMetadata.attributes.length > 3 && (
								<span className="bg-background-300 text-xs px-2 py-1 rounded-md">
									+{tokenMetadata.attributes.length - 3} more
								</span>
							)}
						</div>
					)}
				</div>
			</Link>
		</div>
	);
}
