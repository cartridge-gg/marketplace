import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useCallback, useState } from "react";
import { getChecksumAddress } from "starknet";
import { CollectibleCard, Button } from "@cartridge/ui";
import type { Token } from "@dojoengine/torii-wasm";
import {
	type TokenMetadataUI,
	useCollectionMetadata,
	useCollection,
} from "@cartridge/marketplace-sdk";
import { MetadataFilters } from "../../components/collection/metadata-filters";

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

export const Route = createFileRoute("/collection/$collectionAddress")({
	component: RouteComponent,
	validateSearch: (search: Record<string, unknown>) => {
		return {
			cursor: search?.cursor as string | undefined,
		};
	},
});

function RouteComponent() {
	const { collectionAddress } = Route.useParams();
	const { cursor } = Route.useSearch();
	const navigate = useNavigate({ from: Route.fullPath });

	const { data: collectionMetadata } = useCollectionMetadata(
		collectionAddress,
		import.meta.env.VITE_IDENTITY,
	);
	const [filteredTokenIds, setFilteredTokenIds] = useState<string[]>([]);

	const {
		collection,
		getPrevPage,
		getNextPage,
		hasPrev,
		hasNext,
		isLoading,
		currentPage,
		nextCursor,
		prevCursor,
	} = useCollection(collectionAddress, filteredTokenIds, 50, cursor);

	const handlePrevPage = useCallback(() => {
		if (hasPrev) {
			navigate({
				search: prevCursor ? { cursor: prevCursor } : { cursor: undefined },
				replace: false,
			});
			getPrevPage();
		}
	}, [navigate, getPrevPage, hasPrev, prevCursor]);

	const handleNextPage = useCallback(() => {
		if (hasNext && nextCursor) {
			navigate({
				search: { cursor: nextCursor },
				replace: false,
			});
			getNextPage();
		}
	}, [navigate, getNextPage, hasNext, nextCursor]);

	// Get collection name from the first token
	const collectionName = collection[0]?.name || "Collection";

	const handleFilteredTokensChange = useCallback(
		(filteredTokens: TokenMetadataUI[]) => {
			if (filteredTokens.length === collectionMetadata?.tokens.length) {
				setFilteredTokenIds([]);
				return;
			}
			const tokenIds = filteredTokens.map((token) => token.tokenId);
			setFilteredTokenIds(tokenIds);
		},
		[collectionMetadata, setFilteredTokenIds],
	);

	if (collection.length === 0 && isLoading) {
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
				<div className="flex flex-col lg:flex-row gap-8">
					{collectionMetadata && collectionMetadata.tokens.length > 0 && (
						<aside className="lg:w-80">
							<MetadataFilters
								tokens={collectionMetadata.tokens}
								onFilteredTokensChange={handleFilteredTokensChange}
							/>
						</aside>
					)}
					<div className="flex-1">
						<CollectionGrid
							collection={collection}
							name={collectionName}
							getPrevPage={handlePrevPage}
							getNextPage={handleNextPage}
							hasPrev={hasPrev}
							hasNext={hasNext}
							isLoading={isLoading}
							currentPage={currentPage}
							isFiltered={!!filteredTokenIds}
							totalCount={collection.length}
						/>
					</div>
				</div>
			</div>
		</div>
	);
}

interface CollectionGridProps {
	collection: Token[];
	name: string;
	getPrevPage: () => void;
	getNextPage: () => void;
	hasPrev: boolean;
	hasNext: boolean;
	isLoading: boolean;
	currentPage: number;
	isFiltered?: boolean;
	totalCount?: number;
}

function CollectionGrid({
	collection,
	name,
	getPrevPage,
	getNextPage,
	hasPrev,
	hasNext,
	isLoading,
	currentPage,
	isFiltered,
	totalCount,
}: CollectionGridProps) {
	return (
		<>
			<div className="flex justify-between items-center mb-8">
				<div>
					<h1 className="text-3xl font-bold text-primary-500">{name}</h1>
					{isFiltered && totalCount && (
						<p className="text-sm text-gray-400 mt-1">
							{collection.length} of {totalCount} tokens match your filters
						</p>
					)}
				</div>
				<div className="flex items-center gap-4">
					<span className="text-sm text-gray-500">Page {currentPage}</span>
					<div className="flex gap-2">
						<Button
							onClick={getPrevPage}
							disabled={!hasPrev || isLoading}
							variant="secondary"
						>
							Previous
						</Button>
						<Button
							onClick={getNextPage}
							disabled={!hasNext || isLoading}
							variant="secondary"
						>
							Next
						</Button>
					</div>
				</div>
			</div>
			{isLoading ? (
				<div className="flex items-center justify-center h-64">
					<div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
				</div>
			) : (
				<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
					{collection.map((t) => (
						<Token token={t} key={t.token_id} />
					))}
				</div>
			)}
			{/* Pagination controls at the bottom as well */}
			{collection.length > 0 && (
				<div className="flex justify-center gap-2 mt-8">
					<Button
						onClick={getPrevPage}
						disabled={!hasPrev || isLoading}
						variant="secondary"
					>
						Previous
					</Button>
					<span className="flex items-center px-4 text-gray-500">
						Page {currentPage}
					</span>
					<Button
						onClick={getNextPage}
						disabled={!hasNext || isLoading}
						variant="secondary"
					>
						Next
					</Button>
				</div>
			)}
		</>
	);
}

function Token({ token }: { token: Token }) {
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
		const suffix = parseInt(token.token_id, 16);
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
					tokenId: token.token_id,
				}}
				className="block h-full"
			>
				<div>
					<CollectibleCard
						title=""
						image={imageUrl}
						className="w-full h-auto"
						selectable={false}
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
