import { DojoProvider, DojoCall } from "@dojoengine/core";
import { Account, AccountInterface, BigNumberish, CairoOption, CairoCustomEnum, ByteArray } from "starknet";
import * as models from "./models.gen";

export function setupWorld(provider: DojoProvider) {

	const build_Marketplace_cancelListing_calldata = (orderId: BigNumberish): DojoCall => {
		return {
			contractName: "Marketplace",
			entrypoint: "cancel_listing",
			calldata: [orderId],
		};
	};

	const Marketplace_cancelListing = async (snAccount: Account | AccountInterface, orderId: BigNumberish) => {
		try {
			return await provider.execute(
				snAccount,
				build_Marketplace_cancelListing_calldata(orderId),
				"MARKETPLACE",
			);
		} catch (error) {
			console.error(error);
			throw error;
		}
	};

	const build_Marketplace_cancelOffer_calldata = (orderId: BigNumberish): DojoCall => {
		return {
			contractName: "Marketplace",
			entrypoint: "cancel_offer",
			calldata: [orderId],
		};
	};

	const Marketplace_cancelOffer = async (snAccount: Account | AccountInterface, orderId: BigNumberish) => {
		try {
			return await provider.execute(
				snAccount,
				build_Marketplace_cancelOffer_calldata(orderId),
				"MARKETPLACE",
			);
		} catch (error) {
			console.error(error);
			throw error;
		}
	};

	const build_Marketplace_deleteListing_calldata = (orderId: BigNumberish): DojoCall => {
		return {
			contractName: "Marketplace",
			entrypoint: "delete_listing",
			calldata: [orderId],
		};
	};

	const Marketplace_deleteListing = async (snAccount: Account | AccountInterface, orderId: BigNumberish) => {
		try {
			return await provider.execute(
				snAccount,
				build_Marketplace_deleteListing_calldata(orderId),
				"MARKETPLACE",
			);
		} catch (error) {
			console.error(error);
			throw error;
		}
	};

	const build_Marketplace_deleteOffer_calldata = (orderId: BigNumberish): DojoCall => {
		return {
			contractName: "Marketplace",
			entrypoint: "delete_offer",
			calldata: [orderId],
		};
	};

	const Marketplace_deleteOffer = async (snAccount: Account | AccountInterface, orderId: BigNumberish) => {
		try {
			return await provider.execute(
				snAccount,
				build_Marketplace_deleteOffer_calldata(orderId),
				"MARKETPLACE",
			);
		} catch (error) {
			console.error(error);
			throw error;
		}
	};

	const build_Marketplace_executeListing_calldata = (orderId: BigNumberish, quantity: BigNumberish, royalties: boolean): DojoCall => {
		return {
			contractName: "Marketplace",
			entrypoint: "execute_listing",
			calldata: [orderId, quantity, royalties],
		};
	};

	const Marketplace_executeListing = async (snAccount: Account | AccountInterface, orderId: BigNumberish, quantity: BigNumberish, royalties: boolean) => {
		try {
			return await provider.execute(
				snAccount,
				build_Marketplace_executeListing_calldata(orderId, quantity, royalties),
				"MARKETPLACE",
			);
		} catch (error) {
			console.error(error);
			throw error;
		}
	};

	const build_Marketplace_executeOffer_calldata = (orderId: BigNumberish, quantity: BigNumberish, royalties: boolean): DojoCall => {
		return {
			contractName: "Marketplace",
			entrypoint: "execute_offer",
			calldata: [orderId, quantity, royalties],
		};
	};

	const Marketplace_executeOffer = async (snAccount: Account | AccountInterface, orderId: BigNumberish, quantity: BigNumberish, royalties: boolean) => {
		try {
			return await provider.execute(
				snAccount,
				build_Marketplace_executeOffer_calldata(orderId, quantity, royalties),
				"MARKETPLACE",
			);
		} catch (error) {
			console.error(error);
			throw error;
		}
	};

	const build_Marketplace_grantRole_calldata = (account: string, roleId: BigNumberish): DojoCall => {
		return {
			contractName: "Marketplace",
			entrypoint: "grant_role",
			calldata: [account, roleId],
		};
	};

	const Marketplace_grantRole = async (snAccount: Account | AccountInterface, account: string, roleId: BigNumberish) => {
		try {
			return await provider.execute(
				snAccount,
				build_Marketplace_grantRole_calldata(account, roleId),
				"MARKETPLACE",
			);
		} catch (error) {
			console.error(error);
			throw error;
		}
	};

	const build_Marketplace_list_calldata = (collection: string, tokenId: BigNumberish, quantity: BigNumberish, price: BigNumberish, currency: string, expiration: BigNumberish): DojoCall => {
		return {
			contractName: "Marketplace",
			entrypoint: "list",
			calldata: [collection, tokenId, quantity, price, currency, expiration],
		};
	};

	const Marketplace_list = async (snAccount: Account | AccountInterface, collection: string, tokenId: BigNumberish, quantity: BigNumberish, price: BigNumberish, currency: string, expiration: BigNumberish) => {
		try {
			return await provider.execute(
				snAccount,
				build_Marketplace_list_calldata(collection, tokenId, quantity, price, currency, expiration),
				"MARKETPLACE",
			);
		} catch (error) {
			console.error(error);
			throw error;
		}
	};

	const build_Marketplace_offer_calldata = (collection: string, tokenId: BigNumberish, quantity: BigNumberish, price: BigNumberish, currency: string, expiration: BigNumberish): DojoCall => {
		return {
			contractName: "Marketplace",
			entrypoint: "offer",
			calldata: [collection, tokenId, quantity, price, currency, expiration],
		};
	};

	const Marketplace_offer = async (snAccount: Account | AccountInterface, collection: string, tokenId: BigNumberish, quantity: BigNumberish, price: BigNumberish, currency: string, expiration: BigNumberish) => {
		try {
			return await provider.execute(
				snAccount,
				build_Marketplace_offer_calldata(collection, tokenId, quantity, price, currency, expiration),
				"MARKETPLACE",
			);
		} catch (error) {
			console.error(error);
			throw error;
		}
	};

	const build_Marketplace_pause_calldata = (): DojoCall => {
		return {
			contractName: "Marketplace",
			entrypoint: "pause",
			calldata: [],
		};
	};

	const Marketplace_pause = async (snAccount: Account | AccountInterface) => {
		try {
			return await provider.execute(
				snAccount,
				build_Marketplace_pause_calldata(),
				"MARKETPLACE",
			);
		} catch (error) {
			console.error(error);
			throw error;
		}
	};

	const build_Marketplace_resume_calldata = (): DojoCall => {
		return {
			contractName: "Marketplace",
			entrypoint: "resume",
			calldata: [],
		};
	};

	const Marketplace_resume = async (snAccount: Account | AccountInterface) => {
		try {
			return await provider.execute(
				snAccount,
				build_Marketplace_resume_calldata(),
				"MARKETPLACE",
			);
		} catch (error) {
			console.error(error);
			throw error;
		}
	};

	const build_Marketplace_revokeRole_calldata = (account: string): DojoCall => {
		return {
			contractName: "Marketplace",
			entrypoint: "revoke_role",
			calldata: [account],
		};
	};

	const Marketplace_revokeRole = async (snAccount: Account | AccountInterface, account: string) => {
		try {
			return await provider.execute(
				snAccount,
				build_Marketplace_revokeRole_calldata(account),
				"MARKETPLACE",
			);
		} catch (error) {
			console.error(error);
			throw error;
		}
	};

	const build_Marketplace_setFee_calldata = (feeNum: BigNumberish, feeReceiver: string): DojoCall => {
		return {
			contractName: "Marketplace",
			entrypoint: "set_fee",
			calldata: [feeNum, feeReceiver],
		};
	};

	const Marketplace_setFee = async (snAccount: Account | AccountInterface, feeNum: BigNumberish, feeReceiver: string) => {
		try {
			return await provider.execute(
				snAccount,
				build_Marketplace_setFee_calldata(feeNum, feeReceiver),
				"MARKETPLACE",
			);
		} catch (error) {
			console.error(error);
			throw error;
		}
	};



	return {
		Marketplace: {
			cancelListing: Marketplace_cancelListing,
			buildCancelListingCalldata: build_Marketplace_cancelListing_calldata,
			cancelOffer: Marketplace_cancelOffer,
			buildCancelOfferCalldata: build_Marketplace_cancelOffer_calldata,
			deleteListing: Marketplace_deleteListing,
			buildDeleteListingCalldata: build_Marketplace_deleteListing_calldata,
			deleteOffer: Marketplace_deleteOffer,
			buildDeleteOfferCalldata: build_Marketplace_deleteOffer_calldata,
			executeListing: Marketplace_executeListing,
			buildExecuteListingCalldata: build_Marketplace_executeListing_calldata,
			executeOffer: Marketplace_executeOffer,
			buildExecuteOfferCalldata: build_Marketplace_executeOffer_calldata,
			grantRole: Marketplace_grantRole,
			buildGrantRoleCalldata: build_Marketplace_grantRole_calldata,
			list: Marketplace_list,
			buildListCalldata: build_Marketplace_list_calldata,
			offer: Marketplace_offer,
			buildOfferCalldata: build_Marketplace_offer_calldata,
			pause: Marketplace_pause,
			buildPauseCalldata: build_Marketplace_pause_calldata,
			resume: Marketplace_resume,
			buildResumeCalldata: build_Marketplace_resume_calldata,
			revokeRole: Marketplace_revokeRole,
			buildRevokeRoleCalldata: build_Marketplace_revokeRole_calldata,
			setFee: Marketplace_setFee,
			buildSetFeeCalldata: build_Marketplace_setFee_calldata,
		},
	};
}