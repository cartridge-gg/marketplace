# Metadata Processor Worker

A background worker that indexes token metadata from all Torii instances tracked by the Arcade SDK and stores them as `MetadataAttribute` models in the marketplace.

## Overview

This worker:
1. Fetches all tokens from all Torii instances indexed by Arcade SDK
2. Retrieves metadata for each token (name, description, image, attributes)
3. Creates OffchainMessages based on the `MetadataAttribute` model
4. Subscribes to token updates to process new tokens and metadata changes in real-time
5. Periodically re-fetches all tokens to catch any missed updates

## Setup

1. Install dependencies:
```bash
pnpm install
```

2. Configure environment variables:
```bash
cp .env.example .env.local
# Edit .env.local with your configuration
```

The worker supports multiple environment file locations in order of preference:
- `.env.local` (recommended for local development)
- `.env`
- `../env.local` (relative to src directory)
- `../.env` (relative to src directory)

## Configuration

Environment variables are validated using Zod schemas to ensure type safety and provide helpful error messages for missing or invalid configuration.

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `CHAIN_ID` | StarkNet chain ID (SN_MAIN or SN_SEPOLIA) | SN_MAIN | No |
| `RPC_URL` | StarkNet RPC endpoint | https://api.cartridge.gg/rpc/starknet-mainnet | No |
| `ACCOUNT_ADDRESS` | Account address for sending transactions | - | Yes |
| `ACCOUNT_PRIVATE_KEY` | Private key for the account | - | Yes |
| `MARKETPLACE_ADDRESS` | Address of the marketplace contract | - | Yes |
| `BATCH_SIZE` | Number of tokens to process in parallel | 10 | No |
| `RETRY_ATTEMPTS` | Number of retry attempts for failed operations | 3 | No |
| `RETRY_DELAY` | Delay between retries in milliseconds | 5000 | No |
| `FETCH_INTERVAL` | Interval for periodic token fetching (minutes) | 60 | No |
| `LOG_LEVEL` | Log level (trace, debug, info, warn, error, fatal) | info | No |
| `NODE_ENV` | Node environment (development, production, test) | development | No |
| `METADATA_FETCH_TIMEOUT` | Timeout for metadata fetching (ms) | 30000 | No |
| `IPFS_GATEWAY` | IPFS gateway URL | https://ipfs.io/ipfs/ | No |

If any required environment variables are missing or invalid, the worker will fail to start with a detailed error message showing what needs to be fixed.

## Running

### Development
```bash
pnpm dev
```

### Production
```bash
pnpm start
```

## Architecture

The worker uses a functional approach with TypeScript types for constraints and immutable state management.

### Core Functions

1. **Token Fetcher** (`token-fetcher.ts`):
   - `initializeTokenFetcher`: Creates and initializes the token fetcher state
   - `fetchAllTokens`: Fetches tokens from all Torii instances
   - `fetchTokensFromProject`: Fetches tokens from a specific project
   - Uses immutable state pattern with `TokenFetcherState` type

2. **Metadata Processor** (`metadata-processor.ts`):
   - `createMetadataProcessorState`: Creates the processor state
   - `processTokens`: Processes token metadata in batches
   - `fetchTokenMetadata`: Fetches metadata from token URIs
   - `createMetadataMessages`: Creates messages for the marketplace
   - State management through `MetadataProcessorState` type

3. **Token Subscription** (`token-subscription.ts`):
   - `createTokenSubscriptionState`: Creates subscription state
   - `subscribeToAllTokens`: Sets up real-time token monitoring
   - `createTokenUpdateHandler`: Creates handlers for token updates
   - Manages subscriptions through `TokenSubscriptionState` type

### Data Flow

1. Initial fetch: Get all existing tokens from all Torii instances
2. Process metadata: Fetch and store metadata attributes
3. Subscribe: Listen for new tokens and updates
4. Periodic refresh: Re-fetch all tokens periodically

## Extending

To adapt this worker for different token models:

1. Update `fetchTokensFromProject()` in `token-fetcher.ts` to match your token model structure
2. Modify `getTokenURI()` in `metadata-processor.ts` to call the correct contract method
3. Adjust `parseTokenFromUpdate()` in `token-subscription.ts` to extract token data from updates
4. Update the subscription clause in `subscribeToProject()` in `token-subscription.ts`

### Type Safety

All functions use TypeScript types to ensure:
- Input validation through function parameter types
- State immutability through type constraints
- Predictable function outputs with explicit return types
- Compile-time safety for state management

## Monitoring

The worker logs all operations with timestamps and context. Monitor logs for:
- Number of tokens processed
- Failed metadata fetches
- Transaction errors
- Subscription status