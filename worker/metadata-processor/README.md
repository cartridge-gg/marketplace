# Metadata Processor Worker

A background worker that indexes token metadata from all Torii instances tracked by the Arcade SDK and stores them as `MetadataAttribute` models in the marketplace. Built with Effect for robust error handling and concurrent processing.

## Overview

This worker:
1. Fetches all tokens from all Torii instances indexed by Arcade SDK
2. Retrieves metadata for each token (name, description, image, attributes)
3. Creates OffchainMessages based on the `MetadataAttribute` model
4. Subscribes to token updates to process new tokens and metadata changes in real-time
5. Processes tokens concurrently with automatic retry and error recovery

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

The worker uses Effect's configuration system with validation and type safety. All configuration is loaded from environment variables.

### Required Environment Variables

| Variable | Description |
|----------|-------------|
| `ACCOUNT_ADDRESS` | Account address for sending transactions |
| `ACCOUNT_PRIVATE_KEY` | Private key for the account |
| `MARKETPLACE_ADDRESS` | Address of the marketplace contract |
| `ARCADE_ADDRESS` | Address of the arcade contract |
| `RPC_URL` | StarkNet RPC endpoint |

### Optional Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `CHAIN_ID` | StarkNet chain ID (SN_MAIN or SN_SEPOLIA) | SN_MAIN |
| `MARKETPLACE_TORII_URL` | Marketplace Torii URL | https://api.cartridge.gg/x/marketplace-mainnet/torii |
| `BATCH_SIZE` | Number of tokens to process in parallel | 10 |
| `TOKEN_FETCH_BATCH_SIZE` | Number of tokens to fetch per batch from Torii | 5000 |
| `RETRY_ATTEMPTS` | Number of retry attempts for failed operations | 3 |
| `RETRY_DELAY` | Delay between retries in milliseconds | 5000 |
| `MESSAGE_BATCH_SIZE` | Number of messages to send in a single batch | 500 |
| `LOG_LEVEL` | Log level (trace, debug, info, warn, error, fatal) | info |
| `NODE_ENV` | Node environment (development, production, test) | development |
| `METADATA_FETCH_TIMEOUT` | Timeout for metadata fetching (ms) | 30000 |
| `IPFS_GATEWAY` | IPFS gateway URL | https://ipfs.io/ipfs/ |
| `IGNORED_PROJECTS` | Comma-separated list of projects to ignore | |

## Running

### Development
```bash
pnpm run:effect
```

### Production
```bash
pnpm run:effect
```

## Architecture

The worker is built using Effect, a powerful TypeScript library for building robust applications with strong error handling and concurrency support.

### Project Structure

```
src/
├── main.ts                     # Entry point with signal handling
├── effect.ts                   # Main program logic
├── effect-config.ts            # Configuration system
├── constants/
│   └── index.ts               # Constants and configuration helpers
├── services/
│   ├── arcade.ts              # Arcade SDK types and client creation
│   ├── sdk-services.ts        # SDK initialization and services
│   ├── registry-service.ts    # Registry and edition management
│   ├── token-processor.ts     # Token fetching and processing logic
│   ├── message-service.ts     # Message creation and publishing
│   └── subscription-service.ts # Real-time token subscriptions
├── tasks/
│   └── process-metadata.ts    # Metadata processing logic
└── utils/
    └── signature.ts           # Message signing utilities
```

### Core Components

#### Configuration (`effect-config.ts`)
- Effect-based configuration system with validation
- Type-safe environment variable loading
- Supports `.env` files with fallback to environment variables
- Configuration services available through dependency injection

#### SDK Services (`services/sdk-services.ts`)
- `ArcadeSDK`: Manages connection to Arcade registry
- `MarketplaceSDK`: Handles marketplace interactions
- `MarketplaceAccount`: Provides account for transaction signing
- All services are provided as Effect layers

#### Registry Service (`services/registry-service.ts`)
- Fetches and manages arcade editions
- Filters out ignored projects
- Handles registry model parsing and validation

#### Token Processor (`services/token-processor.ts`)
- Fetches tokens in paginated batches
- Handles errors with automatic retry
- Processes tokens concurrently with metrics tracking
- Adaptive batch size for large responses

#### Message Service (`services/message-service.ts`)
- Creates signed messages from token metadata
- Batches messages for efficient publishing
- Handles metadata attribute extraction

#### Subscription Service (`services/subscription-service.ts`)
- Sets up real-time token update subscriptions
- Manages subscription lifecycle
- Processes updates as they arrive

### Data Flow

1. **Initialization**: Load configuration and initialize SDKs
2. **Edition Fetching**: Get all arcade editions from registry
3. **Token Processing**: 
   - Fetch existing tokens from each edition's Torii
   - Extract metadata and create signed messages
   - Publish messages in batches
4. **Subscriptions**: Set up real-time monitoring for new tokens
5. **Graceful Shutdown**: Clean up resources on SIGINT/SIGTERM

### Error Handling

The worker uses Effect's error handling capabilities:
- Automatic retry with exponential backoff
- Error recovery for specific error types (e.g., message too large)
- Graceful degradation for problematic projects
- Comprehensive error logging

### Metrics

The worker tracks:
- Total tokens processed
- Messages generated and published
- Batch processing statistics
- Error rates by project

## Extending

To adapt this worker for different token models:

1. Update token fetching in `services/token-processor.ts`
2. Modify metadata extraction in `tasks/process-metadata.ts`
3. Adjust subscription handling in `services/subscription-service.ts`
4. Update typed data structure in `constants/index.ts`

## Development Tips

1. **Debugging**: Set `LOG_LEVEL=debug` for detailed logging
2. **Testing**: Use `SN_SEPOLIA` chain for testing
3. **Performance**: Adjust `TOKEN_FETCH_BATCH_SIZE` based on token density
4. **Monitoring**: Watch logs for processing rates and errors

## Troubleshooting

### Common Issues

1. **"Service not found" error**: Ensure all required environment variables are set
2. **"Protobuf decode error"**: Version mismatch between Torii instances - these are automatically skipped
3. **"Message too large"**: Batch size automatically reduced for large responses
4. **High memory usage**: Reduce `BATCH_SIZE` or `TOKEN_FETCH_BATCH_SIZE`

### Logs

The worker uses structured logging with levels:
- `trace`: Very detailed debugging information
- `debug`: Debugging information
- `info`: General information (default)
- `warn`: Warning messages
- `error`: Error messages
- `fatal`: Fatal errors that cause shutdown