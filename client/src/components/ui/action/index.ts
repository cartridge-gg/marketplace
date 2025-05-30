import type { Token } from "@dojoengine/torii-wasm/types";
export type TokenDetailsActionProps = {
	token: Token;
	collectionAddress: string;
	tokenId: string;
	isOwner: boolean;
};
