import { useEffect } from "react";
import { MarketplaceFilters, MarketplacePropertyFilter } from "@cartridge/ui";
import { useMetadataFilters } from "../../hooks/metadata";
import type { TokenMetadataUI } from "@cartridge/marketplace-sdk";

interface MetadataFiltersProps {
	tokens: TokenMetadataUI[];
	onFilteredTokensChange: (tokens: TokenMetadataUI[]) => void;
}

export function MetadataFilters({
	tokens,
	onFilteredTokensChange,
}: MetadataFiltersProps) {
	const {
		statistics,
		filteredTokens,
		toggleTrait,
		clearFilters,
		isTraitSelected,
		selectedTraits,
	} = useMetadataFilters(tokens);

	useEffect(() => {
		onFilteredTokensChange(filteredTokens);
	}, [filteredTokens, onFilteredTokensChange]);

	console.log(statistics);
	if (statistics.length === 0) {
		return null;
	}

	return (
		<div className="w-full">
			<div className="mb-4 flex items-center justify-between">
				<h3 className="text-lg font-semibold text-primary-500">Filters</h3>
				{selectedTraits.length > 0 && (
					<button
						onClick={clearFilters}
						className="text-sm text-primary-400 hover:text-primary-500 transition-colors"
					>
						Clear all ({selectedTraits.length})
					</button>
				)}
			</div>

			<MarketplaceFilters className="space-y-6 bg-background-200 rounded-lg p-4">
				{statistics.map(({ traitType, values }) => (
					<div key={traitType} className="space-y-2">
						<h4 className="text-sm font-medium text-gray-300 mb-3">
							{traitType}
						</h4>
						<div className="space-y-1 max-h-64 overflow-y-auto">
							{values.map(({ value, count }) => {
								const isSelected = isTraitSelected(traitType, value);
								return (
									<MarketplacePropertyFilter
										key={`${traitType}-${value}`}
										label={value}
										count={count}
										value={isSelected}
										setValue={() => toggleTrait(traitType, value)}
									/>
								);
							})}
						</div>
					</div>
				))}
			</MarketplaceFilters>
		</div>
	);
}
