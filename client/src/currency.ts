import { constants } from "starknet";

export interface Currency {
	symbol: string;
	name: string;
	decimals: number;
	address?: string;
}

export const CURRENCIES: Record<string, Currency> = {
	STRK: {
		symbol: "STRK",
		name: "Starknet Token",
		decimals: 18,
	},
	ETH: {
		symbol: "ETH",
		name: "Ethereum",
		decimals: 18,
	},
	USDC: {
		symbol: "USDC",
		name: "USD Coin",
		decimals: 6,
	},
	LORDS: {
		symbol: "LORDS",
		name: "Lords",
		decimals: 18,
	},
};

// Contract addresses
const ETH_MAINNET =
	"0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7";
const STRK_MAINNET =
	"0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d";
const USDC_MAINNET =
	"0x053c91253bc9682c04929ca02ed00b3e423f6710d2ee7e0d5ebb06f3ecf368a8";
const LORDS_MAINNET =
	"0x0124aeb495b947201f5fac96fd1138e326ad86195b98df6dec9009158a533b49";

const ETH_SEPOLIA =
	"0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7";
const STRK_SEPOLIA =
	"0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d";
const USDC_SEPOLIA =
	"0x005a643907b9a4bc6a55e9069c4fd5fd1f5c79a22470690f75556c4736e34426";
const LORDS_SEPOLIA =
	"0x019c92fa87f4d5e3be25c3dd6a284f30282a07e87cd782f5fd387b82c8142017";

// Contract addresses by chain ID
export const CURRENCY_ADDRESSES: Record<string, Record<string, Currency>> = {
	[constants.StarknetChainId.SN_MAIN]: {
		// ETH on Starknet Mainnet
		[ETH_MAINNET]: {
			...CURRENCIES.ETH,
			address: ETH_MAINNET,
		},
		// STRK on Starknet Mainnet
		[STRK_MAINNET]: {
			...CURRENCIES.STRK,
			address: STRK_MAINNET,
		},
		// USDC on Starknet Mainnet
		[USDC_MAINNET]: {
			...CURRENCIES.USDC,
			address: USDC_MAINNET,
		},
		// LORDS on Starknet Mainnet
		[LORDS_MAINNET]: {
			...CURRENCIES.LORDS,
			address: LORDS_MAINNET,
		},
	},
	[constants.StarknetChainId.SN_SEPOLIA]: {
		// ETH on Starknet Sepolia
		[ETH_SEPOLIA]: {
			...CURRENCIES.ETH,
			address: ETH_SEPOLIA,
		},
		// STRK on Starknet Sepolia
		[STRK_SEPOLIA]: {
			...CURRENCIES.STRK,
			address: STRK_SEPOLIA,
		},
		// USDC on Starknet Sepolia (testnet address)
		[USDC_SEPOLIA]: {
			...CURRENCIES.USDC,
			address: USDC_SEPOLIA,
		},
		// LORDS on Starknet Sepolia (testnet address)
		[LORDS_SEPOLIA]: {
			...CURRENCIES.LORDS,
			address: LORDS_SEPOLIA,
		},
	},
};

export const SUPPORTED_CURRENCIES = Object.keys(CURRENCIES);

/**
 * Retrieves a currency object by its symbol
 * @param symbol - The currency symbol (case-insensitive)
 * @returns The currency object if found, undefined otherwise
 */
export function getCurrency(symbol: string): Currency | undefined {
	return CURRENCIES[symbol.toUpperCase()];
}

/**
 * Retrieves a currency object by its contract address and chain ID
 * @param address - The contract address
 * @param chainId - The chain ID
 * @returns The currency object if found, undefined otherwise
 */
export function getCurrencyByAddress(
	address: string,
	chainId: string,
): Currency | undefined {
	const chainCurrencies = CURRENCY_ADDRESSES[chainId];
	if (!chainCurrencies) return undefined;
	return chainCurrencies[address.toLowerCase()];
}

/**
 * Retrieves the contract address for a currency on a specific chain
 * @param symbol - The currency symbol (case-insensitive)
 * @param chainId - The chain ID
 * @returns The contract address if found, undefined otherwise
 */
export function getCurrencyAddress(
	symbol: string,
	chainId: string,
): string | undefined {
	const chainCurrencies = CURRENCY_ADDRESSES[chainId];
	if (!chainCurrencies) return undefined;

	const upperSymbol = symbol.toUpperCase();
	for (const [address, currency] of Object.entries(chainCurrencies)) {
		if (currency.symbol === upperSymbol) {
			return address;
		}
	}
	return undefined;
}

/**
 * Gets all supported currencies for a specific chain
 * @param chainId - The chain ID
 * @returns Array of currency objects for the chain
 */
export function getCurrenciesForChain(chainId: string): Currency[] {
	const chainCurrencies = CURRENCY_ADDRESSES[chainId];
	if (!chainCurrencies) return [];
	return Object.values(chainCurrencies);
}

/**
 * Checks if a currency symbol is supported
 * @param symbol - The currency symbol to check (case-insensitive)
 * @returns True if the currency is supported, false otherwise
 */
export function isSupportedCurrency(symbol: string): boolean {
	return SUPPORTED_CURRENCIES.includes(symbol.toUpperCase());
}

/**
 * Converts a currency amount from its smallest unit (wei-like) to a human-readable decimal string
 *
 * @param symbol - The currency symbol (e.g., "ETH", "STRK", "USDC", "LORDS")
 * @param amount - The amount in the currency's smallest unit as a bigint
 * @returns A string representation of the amount in decimal format
 *
 * @throws {Error} If the currency symbol is not supported
 *
 * @example
 * // Convert 1.5 ETH (1500000000000000000 wei) to decimal
 * currencyToDecimal("ETH", 1500000000000000000n) // Returns "1.5"
 *
 * @example
 * // Convert 100.25 USDC (100250000 micro-USDC) to decimal
 * currencyToDecimal("USDC", 100250000n) // Returns "100.25"
 *
 * @example
 * // Convert whole amounts without fractional part
 * currencyToDecimal("STRK", 5000000000000000000n) // Returns "5"
 */
export function currencyToDecimal(symbol: string, amount: string): string {
	const currency = getCurrency(symbol);
	if (!currency) {
		throw new Error(`Unsupported currency: ${symbol}`);
	}

	const amountBigInt = BigInt(Number.parseInt(amount));
	const divisor = BigInt(10 ** currency.decimals);
	const wholePart = amountBigInt / divisor;
	const fractionalPart = amountBigInt % divisor;

	if (fractionalPart === 0n) return wholePart.toString();

	const fractionalStr = fractionalPart
		.toString()
		.padStart(currency.decimals, "0")
		.replace(/0+$/, "");
	return `${wholePart}.${fractionalStr}`;
}

/**
 * Converts a decimal currency amount to its smallest unit (wei-like) as a bigint
 *
 * @param amount - The amount in decimal format (e.g., 1.5 for 1.5 ETH)
 * @param symbol - The currency symbol (e.g., "ETH", "STRK", "USDC", "LORDS")
 * @returns The amount in the currency's smallest unit as a bigint
 *
 * @throws {Error} If the currency symbol is not supported
 *
 * @example
 * // Convert 1.5 ETH to wei
 * amountToCurrencyBigInt(1.5, "ETH") // Returns 1500000000000000000n
 *
 * @example
 * // Convert 100.25 USDC to micro-USDC
 * amountToCurrencyBigInt(100.25, "USDC") // Returns 100250000n
 *
 * @example
 * // Convert whole amounts
 * amountToCurrencyBigInt(5, "STRK") // Returns 5000000000000000000n
 */
export function amountToCurrencyBigInt(amount: number, symbol: string): bigint {
	const currency = getCurrency(symbol);
	if (!currency) {
		throw new Error(`Unsupported currency: ${symbol}`);
	}

	const multiplier = BigInt(10 ** currency.decimals);
	const amountStr = amount.toFixed(currency.decimals);
	const [wholePart, fractionalPart = ""] = amountStr.split(".");

	const wholePartBigInt = BigInt(wholePart);
	const fractionalPartBigInt = BigInt(
		fractionalPart.padEnd(currency.decimals, "0"),
	);

	return wholePartBigInt * multiplier + fractionalPartBigInt;
}
