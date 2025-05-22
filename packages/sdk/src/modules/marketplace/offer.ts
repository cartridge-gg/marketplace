import { NAMESPACE } from "../../constants";
import type { SchemaType } from "../../bindings";
import type { ParsedEntity } from "@dojoengine/sdk";
import { OrderModel } from "..";

const MODEL_NAME = "Offer";

export class OfferEvent {
	type = MODEL_NAME;

	constructor(
		public identifier: string,
		public id: number,
		public order: OrderModel,
		public time: number,
	) {
		this.identifier = identifier;
		this.id = id;
		this.order = order;
		this.time = time;
	}

	static from(identifier: string, model: any) {
		if (!model) return OfferEvent.default(identifier);
		const id = Number(model.id);
		const order = OrderModel.from(identifier, model.order);
		const time = Number(model.time);
		return new OfferEvent(identifier, id, order, time);
	}

	static default(identifier: string) {
		return new OfferEvent(identifier, 0, OrderModel.default(identifier), 0);
	}

	static isType(model: OfferEvent) {
		return model.type === MODEL_NAME;
	}

	exists() {
		return this.time !== 0;
	}

	clone(): OfferEvent {
		return new OfferEvent(
			this.identifier,
			this.id,
			this.order.clone(),
			this.time,
		);
	}
}

export const Offer = {
	parse: (entity: ParsedEntity<SchemaType>) => {
		return OfferEvent.from(
			entity.entityId,
			entity.models[NAMESPACE]?.[MODEL_NAME],
		);
	},

	getModelName: () => {
		return MODEL_NAME;
	},

	getMethods: () => [],
};
