import { NAMESPACE } from "../../constants";
import { getChecksumAddress } from "starknet";
import { SchemaType } from "../../bindings";
import { ParsedEntity } from "@dojoengine/sdk";
import { Category, CategoryType, Status, StatusType } from "../../classes";

const MODEL_NAME = "Order";

export class OrderModel {
	type = MODEL_NAME;

	constructor(
		public identifier: string,
		public id: number,
		public category: Category,
		public status: Status,
		public expiration: number,
		public collection: string,
		public tokenId: number,
		public quantity: number,
		public price: number,
		public currency: string,
		public owner: string,
	) {
		this.identifier = identifier;
		this.id = id;
		this.category = category;
		this.status = status;
		this.expiration = expiration;
		this.collection = collection;
		this.tokenId = tokenId;
		this.quantity = quantity;
		this.price = price;
		this.currency = currency;
		this.owner = owner;
	}

	static from(identifier: string, model: any) {
		if (!model) return OrderModel.default(identifier);
		const id = Number(model.id);
		const category = Category.from(model.category);
		const status = Status.from(model.status);
		const expiration = Number(model.expiration);
		const collection = getChecksumAddress(model.collection);
		const tokenId = Number(model.token_id);
		const quantity = Number(model.quantity);
		const price = Number(model.price);
		const currency = getChecksumAddress(model.currency);
		const owner = getChecksumAddress(model.owner);
		return new OrderModel(
			identifier,
			id,
			category,
			status,
			expiration,
			collection,
			tokenId,
			quantity,
			price,
			currency,
			owner,
		);
	}

	static default(identifier: string) {
		return new OrderModel(
			identifier,
			0,
			new Category(CategoryType.None),
			new Status(StatusType.None),
			0,
			getChecksumAddress("0x0"),
			0,
			0,
			0,
			getChecksumAddress("0x0"),
			getChecksumAddress("0x0"),
		);
	}

	static isType(model: OrderModel) {
		return model.type === MODEL_NAME;
	}

	exists() {
		return this.status.value !== StatusType.None;
	}

	clone(): OrderModel {
		return new OrderModel(
			this.identifier,
			this.id,
			this.category,
			this.status,
			this.expiration,
			this.collection,
			this.tokenId,
			this.quantity,
			this.price,
			this.currency,
			this.owner,
		);
	}
}

export const Order = {
	parse: (entity: ParsedEntity<SchemaType>) => {
		return OrderModel.from(
			entity.entityId,
			entity.models[NAMESPACE]?.[MODEL_NAME],
		);
	},

	getModelName: () => {
		return MODEL_NAME;
	},

	getMethods: () => [
		{ name: "list", entrypoint: "list", description: "List an item." },
		{
			name: "cancel_listing",
			entrypoint: "cancel_listing",
			description: "Cancel a sell order.",
		},
		{
			name: "delete_listing",
			entrypoint: "delete_listing",
			description: "Delete a sell order.",
		},
		{
			name: "execute_listing",
			entrypoint: "execute_listing",
			description: "Execute a sell order.",
		},
		{ name: "offer", entrypoint: "offer", description: "Make an offer." },
		{
			name: "cancel_offer",
			entrypoint: "cancel_offer",
			description: "Cancel a buy order.",
		},
		{
			name: "delete_offer",
			entrypoint: "delete_offer",
			description: "Delete a buy order.",
		},
		{
			name: "execute_offer",
			entrypoint: "execute_offer",
			description: "Execute a buy order.",
		},
	],
};
