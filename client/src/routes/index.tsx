import { createFileRoute, Link } from "@tanstack/react-router";
import { useCollections, type Collection as CollectionType } from "../hooks";
import { CollectibleCard } from "@cartridge/ui";
import { Token } from "@dojoengine/torii-client";
import { useMemo } from "react";
import { getChecksumAddress } from "starknet";

// Define metadata interface based on the expected structure
interface CollectionMetadata {
	name?: string;
	image?: string;
	description?: string;
	[key: string]: any;
}

export const Route = createFileRoute("/")({
	component: Index,
});

function Index() {
	const { collections } = useCollections();

	if (Object.keys(collections).length === 0) {
		return (
			<div className="flex items-center justify-center h-screen bg-background-100">
				<div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
			</div>
		);
	}

	return (
		<div className="bg-background-100 min-h-screen w-full overflow-y-auto pb-12">
			<div className="container mx-auto px-4 py-8">
				<div className="flex justify-between items-center mb-8">
					<h1 className="text-3xl font-bold text-primary-500">
						NFT Collections
					</h1>
				</div>

				{Object.keys(collections).map((project) => (
					<Project key={project} collection={collections[project] || []} />
				))}
			</div>
		</div>
	);
}

function Project({ collection }: { collection: CollectionType }) {
	return (
		<div className="mb-12">
			<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
				{Object.keys(collection).map((contract) => (
					<Collection key={contract} collection={collection[contract]} />
				))}
			</div>
		</div>
	);
}

function Collection({ collection }: { collection: Token }) {
	const metadata = useMemo<CollectionMetadata>(() => {
		if (!collection.metadata) return {};

		if (typeof collection.metadata === "string") {
			try {
				return JSON.parse(collection.metadata);
			} catch (error) {
				console.error("Error parsing metadata:", error);
				return {};
			}
		}

		return collection.metadata as CollectionMetadata;
	}, [collection]);

	const imageUrl = useMemo(() => {
		if (!metadata.image) return "";
		return metadata.image.replace("ipfs://", "https://ipfs.io/ipfs/");
	}, [metadata]);

	return (
		<div className="bg-background-200 rounded-lg overflow-hidden shadow-lg transition-transform hover:scale-[1.02] hover:shadow-xl">
			<Link
				to="/collection/$collectionAddress"
				params={{
					collectionAddress: getChecksumAddress(collection.contract_address),
				}}
				search={{ cursor: undefined }}
				className="block h-full"
			>
				<div className="relative">
					<CollectibleCard
						title=""
						image={imageUrl}
						// @ts-expect-error
						count={collection.count}
						className="w-full h-auto"
						selectable={false}
					/>
					{/* @ts-expect-error */}
					{collection.count && (
						<div className="absolute bottom-2 right-2 bg-primary-500 text-white px-2 py-1 rounded-md text-sm font-medium">
							{/* @ts-expect-error */}
							{collection.count} items
						</div>
					)}
				</div>
				<div className="p-4">
					<h3 className="text-lg font-semibold text-primary-500 mb-1">
						{collection.name}
					</h3>
					{metadata.description && (
						<p className="text-sm text-gray-500 line-clamp-2">
							{metadata.description}
						</p>
					)}
				</div>
			</Link>
		</div>
	);
}
