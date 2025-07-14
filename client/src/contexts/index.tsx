import type { RegistryModel } from "@cartridge/arcade";
import type { MarketplaceModel } from "@cartridge/marketplace";

type SDKModel = RegistryModel | MarketplaceModel;
type ExtractModel<T extends SDKModel> = T;
export type IsTypeFn<T extends SDKModel> = (model: ExtractModel<T>) => boolean;

export type MarketplaceStateInnerType<T extends SDKModel> = {
	[key: string]: ExtractModel<T>;
};

/**
 * Helper function to hydrate a model into the state
 */
export function hydrateModel<T extends SDKModel>(
	model: ExtractModel<T>,
	modelClassTypeCheckFn: IsTypeFn<T>,
	setModel: React.Dispatch<React.SetStateAction<MarketplaceStateInnerType<T>>>,
) {
	if (modelClassTypeCheckFn(model)) {
		const m = model as ExtractModel<T>;
		if (!m.exists()) {
			setModel((prevs) => {
				const news = { ...prevs };
				delete news[m.identifier];
				return news;
			});
			return;
		}
		setModel((prevs) => ({ ...prevs, [m.identifier]: m }));
	}
}

export { ArcadeContext } from "./arcade";
export { MarketplaceContext } from "./marketplace";
export { CollectionContext } from "./collection";
export { Provider } from "./provider";
