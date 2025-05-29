import { KeysClause, ToriiQueryBuilder } from "@dojoengine/sdk";
import { ModelsMapping, OrderCategory } from "../bindings";
import { addAddressPadding } from "starknet";

// ToriiQuery to retrieve all marketplace informations related to input token.
export function getTokenQuery(collectionAddress: string, tokenId: string) {
	return new ToriiQueryBuilder()
		.withClause(
			KeysClause(
				[ModelsMapping.Order],
				[undefined, addAddressPadding(collectionAddress), tokenId, undefined],
			).build(),
		)
		.includeHashedKeys()
		.withEntityModels([ModelsMapping.Order])
		.addOrderBy(ModelsMapping.Order, "expiration", "Asc");
}

// Get orders for given token
export function getTokenOrders(collectionAddress: string, tokenId: string) {
	return new ToriiQueryBuilder()
		.withClause(
			KeysClause(
				[ModelsMapping.Order],
				[
					undefined,
					addAddressPadding(collectionAddress),
					tokenId,
					OrderCategory.Buy.toString(),
				],
			).build(),
		)
		.includeHashedKeys()
		.withEntityModels([ModelsMapping.Order])
		.addOrderBy(ModelsMapping.Order, "expiration", "Asc");
}
