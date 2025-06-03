import {
	AndComposeClause,
	KeysClause,
	MemberClause,
	ToriiQueryBuilder,
} from "@dojoengine/sdk";
import { ModelsMapping, OrderCategory } from "../bindings";
import { addAddressPadding } from "starknet";

function getOrderBaseClause(
	collectionAddress: string,
	tokenId: string | undefined,
	category: OrderCategory,
) {
	return AndComposeClause([
		KeysClause(
			[ModelsMapping.Order],
			[undefined, addAddressPadding(collectionAddress), tokenId, undefined],
			"FixedLen",
		),
		MemberClause(ModelsMapping.Order, "category", "Eq", category.toString()),
	]);
}

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
			getOrderBaseClause(collectionAddress, tokenId, OrderCategory.Buy).build(),
		)
		.addOrderBy(ModelsMapping.Order, "expiration", "Asc")
		.withEntityModels([ModelsMapping.Order])
		.includeHashedKeys();
}

// Get all listed tokens for a collection
export function getListedTokensForCollection(collectionAddress: string) {
	return new ToriiQueryBuilder()
		.withClause(
			getOrderBaseClause(
				collectionAddress,
				undefined,
				OrderCategory.Sell,
			).build(),
		)
		.addOrderBy(ModelsMapping.Order, "expiration", "Asc")
		.withEntityModels([ModelsMapping.Order])
		.includeHashedKeys();
}

// Get token if Listed
export function isTokenListed(collectionAddress: string, tokenId: string) {
	return new ToriiQueryBuilder()
		.withClause(
			getOrderBaseClause(
				collectionAddress,
				tokenId,
				OrderCategory.Sell,
			).build(),
		)
		.withEntityModels([ModelsMapping.Order])
		.includeHashedKeys();
}
