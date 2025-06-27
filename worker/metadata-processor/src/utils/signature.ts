import type { Message } from "@dojoengine/torii-wasm/types";
import type { AccountInterface, TypedData } from "starknet";

/**
 * Creates a signed message by signing typed data with an account and formatting it for use with Torii.
 *
 * This function takes typed data (following EIP-712 standard), signs it using the provided account,
 * and returns a Message object that can be used with the Torii system. The signature is normalized
 * to always be an array format, regardless of the original signature format returned by the account.
 *
 * @param account - The StarkNet account interface used to sign the message
 * @param typedData - The structured data to be signed, following the TypedData format
 * @returns A Promise that resolves to a Message object containing the stringified typed data and normalized signature
 *
 * @example
 * ```typescript
 * const account = new Account(provider, address, privateKey);
 * const typedData = {
 *   types: { ... },
 *   primaryType: "MyMessage",
 *   domain: { ... },
 *   message: { ... }
 * };
 *
 * const signedMessage = await createSignedMessage(account, typedData);
 * // signedMessage.message contains the JSON string of typedData
 * // signedMessage.signature contains the signature as an array of strings
 * ```
 */
export async function createSignedMessage(
	account: AccountInterface,
	typedData: TypedData,
): Promise<Message> {
	const sig = await account.signMessage(typedData);

	return {
		message: JSON.stringify(typedData),
		signature: Array.isArray(sig) ? sig : [sig.r.toString(), sig.s.toString()],
	};
}
