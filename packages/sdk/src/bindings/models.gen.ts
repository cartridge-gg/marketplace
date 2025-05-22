import type { SchemaType as ISchemaType } from "@dojoengine/sdk";

import { BigNumberish } from "starknet";

// Type definition for `orderbook::models::index::Access` struct
export interface Access {
	address: BigNumberish;
	role: BigNumberish;
}

// Type definition for `orderbook::models::index::AccessValue` struct
export interface AccessValue {
	role: BigNumberish;
}

// Type definition for `orderbook::models::index::Book` struct
export interface Book {
	id: BigNumberish;
	version: BigNumberish;
	paused: boolean;
	counter: BigNumberish;
	fee_num: BigNumberish;
	fee_receiver: BigNumberish;
}

// Type definition for `orderbook::models::index::BookValue` struct
export interface BookValue {
	version: BigNumberish;
	paused: boolean;
	counter: BigNumberish;
	fee_num: BigNumberish;
	fee_receiver: BigNumberish;
}

// Type definition for `orderbook::models::index::Order` struct
export interface Order {
	id: BigNumberish;
	category: BigNumberish;
	status: BigNumberish;
	expiration: BigNumberish;
	collection: BigNumberish;
	token_id: BigNumberish;
	quantity: BigNumberish;
	price: BigNumberish;
	currency: BigNumberish;
	owner: BigNumberish;
}

// Type definition for `orderbook::models::index::OrderValue` struct
export interface OrderValue {
	category: BigNumberish;
	status: BigNumberish;
	expiration: BigNumberish;
	collection: BigNumberish;
	token_id: BigNumberish;
	quantity: BigNumberish;
	price: BigNumberish;
	currency: BigNumberish;
	owner: BigNumberish;
}

// Type definition for `orderbook::events::index::Listing` struct
export interface Listing {
	order_id: BigNumberish;
	order: Order;
	time: BigNumberish;
}

// Type definition for `orderbook::events::index::ListingValue` struct
export interface ListingValue {
	order: Order;
	time: BigNumberish;
}

// Type definition for `orderbook::events::index::Offer` struct
export interface Offer {
	order_id: BigNumberish;
	order: Order;
	time: BigNumberish;
}

// Type definition for `orderbook::events::index::OfferValue` struct
export interface OfferValue {
	order: Order;
	time: BigNumberish;
}

// Type definition for `orderbook::events::index::Sale` struct
export interface Sale {
	order_id: BigNumberish;
	order: Order;
	from: BigNumberish;
	to: BigNumberish;
	time: BigNumberish;
}

// Type definition for `orderbook::events::index::SaleValue` struct
export interface SaleValue {
	order: Order;
	from: BigNumberish;
	to: BigNumberish;
	time: BigNumberish;
}

export interface SchemaType extends ISchemaType {
	orderbook: {
		Access: Access;
		AccessValue: AccessValue;
		Book: Book;
		BookValue: BookValue;
		Order: Order;
		OrderValue: OrderValue;
		Listing: Listing;
		ListingValue: ListingValue;
		Offer: Offer;
		OfferValue: OfferValue;
		Sale: Sale;
		SaleValue: SaleValue;
	};
}
export const schema: SchemaType = {
	orderbook: {
		Access: {
			address: 0,
			role: 0,
		},
		AccessValue: {
			role: 0,
		},
		Book: {
			id: 0,
			version: 0,
			paused: false,
			counter: 0,
			fee_num: 0,
			fee_receiver: 0,
		},
		BookValue: {
			version: 0,
			paused: false,
			counter: 0,
			fee_num: 0,
			fee_receiver: 0,
		},
		Order: {
			id: 0,
			category: 0,
			status: 0,
			expiration: 0,
			collection: 0,
			token_id: 0,
			quantity: 0,
			price: 0,
			currency: 0,
			owner: 0,
		},
		OrderValue: {
			category: 0,
			status: 0,
			expiration: 0,
			collection: 0,
			token_id: 0,
			quantity: 0,
			price: 0,
			currency: 0,
			owner: 0,
		},
		Listing: {
			order_id: 0,
			order: {
				id: 0,
				category: 0,
				status: 0,
				expiration: 0,
				collection: 0,
				token_id: 0,
				quantity: 0,
				price: 0,
				currency: 0,
				owner: 0,
			},
			time: 0,
		},
		ListingValue: {
			order: {
				id: 0,
				category: 0,
				status: 0,
				expiration: 0,
				collection: 0,
				token_id: 0,
				quantity: 0,
				price: 0,
				currency: 0,
				owner: 0,
			},
			time: 0,
		},
		Offer: {
			order_id: 0,
			order: {
				id: 0,
				category: 0,
				status: 0,
				expiration: 0,
				collection: 0,
				token_id: 0,
				quantity: 0,
				price: 0,
				currency: 0,
				owner: 0,
			},
			time: 0,
		},
		OfferValue: {
			order: {
				id: 0,
				category: 0,
				status: 0,
				expiration: 0,
				collection: 0,
				token_id: 0,
				quantity: 0,
				price: 0,
				currency: 0,
				owner: 0,
			},
			time: 0,
		},
		Sale: {
			order_id: 0,
			order: {
				id: 0,
				category: 0,
				status: 0,
				expiration: 0,
				collection: 0,
				token_id: 0,
				quantity: 0,
				price: 0,
				currency: 0,
				owner: 0,
			},
			from: 0,
			to: 0,
			time: 0,
		},
		SaleValue: {
			order: {
				id: 0,
				category: 0,
				status: 0,
				expiration: 0,
				collection: 0,
				token_id: 0,
				quantity: 0,
				price: 0,
				currency: 0,
				owner: 0,
			},
			from: 0,
			to: 0,
			time: 0,
		},
	},
};
export enum ModelsMapping {
	Access = "orderbook-Access",
	AccessValue = "orderbook-AccessValue",
	Book = "orderbook-Book",
	BookValue = "orderbook-BookValue",
	Order = "orderbook-Order",
	OrderValue = "orderbook-OrderValue",
	Listing = "orderbook-Listing",
	ListingValue = "orderbook-ListingValue",
	Offer = "orderbook-Offer",
	OfferValue = "orderbook-OfferValue",
	Sale = "orderbook-Sale",
	SaleValue = "orderbook-SaleValue",
}
