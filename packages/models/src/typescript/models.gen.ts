import type { SchemaType as ISchemaType } from "@dojoengine/sdk";

import { BigNumberish } from 'starknet';

// Type definition for `contracts::models::CollectionStat` struct
export interface CollectionStat {
	identity: string;
	collection: string;
	floor_price: BigNumberish;
	daily_volume: BigNumberish;
	total_volume: BigNumberish;
	owners: BigNumberish;
	listed: BigNumberish;
	daily_sales: BigNumberish;
}

// Type definition for `contracts::models::CollectionStatValue` struct
export interface CollectionStatValue {
	floor_price: BigNumberish;
	daily_volume: BigNumberish;
	total_volume: BigNumberish;
	owners: BigNumberish;
	listed: BigNumberish;
	daily_sales: BigNumberish;
}

// Type definition for `executor::models::index::Executor` struct
export interface Executor {
	id: BigNumberish;
	status: BigNumberish;
	token: BigNumberish;
	admin: BigNumberish;
}

// Type definition for `executor::models::index::ExecutorValue` struct
export interface ExecutorValue {
	status: BigNumberish;
	token: BigNumberish;
	admin: BigNumberish;
}

// Type definition for `executor::models::index::Fee` struct
export interface Fee {
	id: BigNumberish;
	role: BigNumberish;
	numerator: BigNumberish;
	denominator: BigNumberish;
	receiver: BigNumberish;
}

// Type definition for `executor::models::index::FeeValue` struct
export interface FeeValue {
	numerator: BigNumberish;
	denominator: BigNumberish;
	receiver: BigNumberish;
}

export interface SchemaType extends ISchemaType {
	contracts: {
		CollectionStat: CollectionStat,
		CollectionStatValue: CollectionStatValue,
	},
	executor: {
		Executor: Executor,
		ExecutorValue: ExecutorValue,
		Fee: Fee,
		FeeValue: FeeValue,
	},
}
export const schema: SchemaType = {
	contracts: {
		CollectionStat: {
			identity: "",
			collection: "",
			floor_price: 0,
			daily_volume: 0,
			total_volume: 0,
			owners: 0,
			listed: 0,
			daily_sales: 0,
		},
		CollectionStatValue: {
			floor_price: 0,
			daily_volume: 0,
			total_volume: 0,
			owners: 0,
			listed: 0,
			daily_sales: 0,
		},
		Executor: {
			id: 0,
			status: 0,
			token: 0,
			admin: 0,
		},
		ExecutorValue: {
			status: 0,
			token: 0,
			admin: 0,
		},
		Fee: {
			id: 0,
			role: 0,
			numerator: 0,
			denominator: 0,
			receiver: 0,
		},
		FeeValue: {
			numerator: 0,
			denominator: 0,
			receiver: 0,
		},
	},
};
export enum ModelsMapping {
	CollectionStat = 'contracts-CollectionStat',
	CollectionStatValue = 'contracts-CollectionStatValue',
	Executor = 'executor-Executor',
	ExecutorValue = 'executor-ExecutorValue',
	Fee = 'executor-Fee',
	FeeValue = 'executor-FeeValue',
}