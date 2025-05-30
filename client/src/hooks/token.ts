import { useCallback, useEffect, useMemo, useState } from "react";
import { useArcade } from "./arcade";
import type { Token, TokenBalance, ToriiClient } from "@dojoengine/torii-wasm";

// Common function to parse token metadata
function parseTokenMetadata(token: Token): Token {
	if (token.metadata && typeof token.metadata === "string") {
		try {
			token.metadata = JSON.parse(token.metadata);
		} catch (error) {
			console.error("Error parsing token metadata:", error);
		}
	}
	return token;
}

// Common function to fetch from all clients with error handling
async function fetchFromAllClients<T>(
	clients: Record<string, any>,
	fetchFn: (client: any, project: string) => Promise<T | null>,
): Promise<T[]> {
	const results: T[] = [];

	await Promise.all(
		Object.keys(clients).map(async (project) => {
			try {
				const result = await fetchFn(clients[project], project);
				if (result) {
					results.push(result);
				}
			} catch (error) {
				console.error(`Error fetching from project ${project}:`, error);
			}
		}),
	);

	return results;
}

// Common function to filter balances with positive amounts
function filterPositiveBalances(balances: TokenBalance[]): TokenBalance[] {
	return balances.filter((balance) => parseInt(balance.balance, 16) > 0);
}

// Common function to get unique contract addresses from balances
function getUniqueContractAddresses(balances: TokenBalance[]): string[] {
	return [...new Set(balances.map((b) => b.contract_address))];
}

// Common function to match tokens with their balances
function matchTokensWithBalances(
	tokens: Token[],
	balances: TokenBalance[],
): Token[] {
	return tokens.filter((token) => {
		const balance = balances.find(
			(b) =>
				b.contract_address === token.contract_address &&
				b.token_id === token.token_id,
		);
		return balance !== undefined;
	});
}

// Common function to fetch token balances for an account
async function fetchTokenBalancesForAccount(
	client: ToriiClient,
	accountAddress: string,
): Promise<TokenBalance[]> {
	const balancesResponse = await client.getTokenBalances(
		[],
		[accountAddress.toLowerCase()],
		[],
	);
	return balancesResponse.items || [];
}

// Common function to fetch tokens by contract addresses and token IDs
async function fetchTokensByAddressesAndIds(
	client: ToriiClient,
	contractAddresses: string[],
	tokenIds: string[],
): Promise<Token[]> {
	const tokensResponse = await client.getTokens(contractAddresses, tokenIds);
	return tokensResponse.items || [];
}

// Hook to get all tokens owned by a specific account
export function useWalletTokens(accountAddress: string) {
	const { clients } = useArcade();
	const [tokens, setTokens] = useState<Token[]>([]);
	const [balances, setBalances] = useState<TokenBalance[]>([]);
	const [loading, setLoading] = useState(false);

	const fetchWalletTokens = useCallback(
		async (address: string) => {
			if (!address) return;

			setLoading(true);
			try {
				const allTokens: Token[] = [];
				const allBalances: TokenBalance[] = [];

				const results = await fetchFromAllClients(clients, async (client) => {
					// Get all token balances for the wallet
					const allBalances = await fetchTokenBalancesForAccount(
						client,
						address,
					);

					if (allBalances.length === 0) {
						return null;
					}

					// Filter to only include tokens with positive balance
					const ownedBalances = filterPositiveBalances(allBalances);

					if (ownedBalances.length === 0) {
						return null;
					}

					// Get unique contract addresses and token IDs
					const tokenIds = ownedBalances.map((b) => b.token_id);
					const contractAddresses = getUniqueContractAddresses(ownedBalances);

					// Fetch the actual tokens
					const tokens = await fetchTokensByAddressesAndIds(
						client,
						contractAddresses,
						tokenIds,
					);

					// Filter tokens that have positive balance and parse metadata
					const ownedTokens = matchTokensWithBalances(
						tokens,
						ownedBalances,
					).map(parseTokenMetadata);

					return {
						tokens: ownedTokens,
						balances: ownedBalances,
					};
				});

				// Flatten results
				results.forEach((result) => {
					if (result) {
						allTokens.push(...result.tokens);
						allBalances.push(...result.balances);
					}
				});

				setTokens(allTokens);
				setBalances(allBalances);
			} catch (error) {
				console.error("Error fetching wallet tokens:", error);
			} finally {
				setLoading(false);
			}
		},
		[clients],
	);

	useEffect(() => {
		if (accountAddress && Object.keys(clients).length > 0) {
			fetchWalletTokens(accountAddress);
		}
	}, [fetchWalletTokens, accountAddress, clients]);

	return {
		tokens,
		balances,
		loading,
		refetch: () => fetchWalletTokens(accountAddress),
	};
}

// Hook to get a specific token by collection address and token ID
export function useToken(
	collectionAddress: string,
	tokenId: string,
	accountAddress: string | undefined,
) {
	const { clients } = useArcade();
	const [token, setToken] = useState<Token | null>(null);
	const [balances, setBalances] = useState<TokenBalance[]>([]);

	const fetchToken = useCallback(
		async (address: string, tokenId: string) => {
			const results = await fetchFromAllClients(clients, async (client) => {
				const tokensResponse = await client.getTokens(
					[address.toLowerCase()],
					[tokenId],
				);
				const balancesResponse = await client.getTokenBalances(
					[address.toLowerCase()],
					[],
					[tokenId],
				);

				if (
					tokensResponse.items.length === 0 ||
					balancesResponse.items.length === 0
				) {
					return null;
				}

				return {
					token: tokensResponse.items[0],
					balances: balancesResponse.items,
				};
			});

			if (results.length === 0) {
				return null;
			}

			return results[0];
		},
		[clients],
	);

	const isOwner = useMemo(() => {
		if (!accountAddress) return false;
		if (token === null && balances.length === 0) return false;
		const balance = balances.find(
			(b) =>
				b.account_address === accountAddress &&
				Number.parseInt(b.balance, 16) > 0,
		);

		return balance !== undefined;
	}, [token, balances, accountAddress]);

	useEffect(() => {
		if (token === null) {
			fetchToken(collectionAddress, tokenId).then((result) => {
				if (result) {
					setToken(parseTokenMetadata(result.token));
					setBalances(result.balances);
				}
			});
		}
	}, [fetchToken, collectionAddress, tokenId, token]);

	return {
		token,
		balances,
		isOwner,
	};
}
