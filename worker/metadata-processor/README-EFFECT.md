# Metadata Processor - Effect Refactoring

This worker has been refactored to use the Effect library for better error handling, composability, and resource management.

## Architecture

The Effect-based implementation uses a service-layer architecture:

### Services
1. **ConfigService** - Manages environment configuration
2. **TokenFetcher** - Fetches tokens from Torii instances
3. **MetadataProcessor** - Processes token metadata and publishes to the marketplace
4. **TokenSubscription** - Manages real-time token subscriptions

### Layers
Each service has a corresponding layer that handles dependency injection:
- `ConfigLive` - Provides configuration from environment variables
- `TokenFetcherLive` - Depends on ConfigService
- `MetadataProcessorLive` - Depends on ConfigService
- `TokenSubscriptionLive` - Depends on TokenFetcher and MetadataProcessor

### Error Types
Structured error types using `Data.TaggedError`:
- `ConfigError` - Configuration validation errors
- `FetchError` - Token fetching errors
- `ProcessingError` - Metadata processing errors
- `SubscriptionError` - Subscription errors
- `InitializationError` - Service initialization errors

## Running the Worker

### Effect Implementation
```bash
# Development
bun dev:effect

# Production
bun start:effect
```

### Original Implementation
```bash
# Development
bun dev

# Production
bun start
```

## Key Benefits of Effect

1. **Type-safe Error Handling**: All errors are tracked in the type system
2. **Composable Services**: Services can be easily composed and tested
3. **Resource Management**: Automatic cleanup of resources on shutdown
4. **Structured Concurrency**: Better control over concurrent operations
5. **Built-in Logging**: Integrated logging with proper context
6. **Stream Processing**: Efficient streaming of large datasets

## Implementation Details

### Token Processing Flow
1. Initial batch processing of all tokens
2. Real-time subscription to token updates
3. Periodic re-fetching to catch any missed updates

### Concurrency Control
- Token processing is limited by `BATCH_SIZE` configuration
- Streaming APIs prevent memory overload for large datasets
- Concurrent processing of multiple projects

### Error Recovery
- Automatic retries with exponential backoff
- Graceful error handling without crashing the worker
- Detailed error logging with context

## Environment Variables

Same as the original implementation - see `.env.example`

## Testing

The Effect implementation makes testing easier through:
- Mockable service interfaces
- Testable layers
- Pure functional effects

## Future Improvements

1. Implement actual token subscription logic when Torii WebSocket API is available
2. Add metrics and monitoring using Effect's built-in capabilities
3. Implement circuit breakers for external service calls
4. Add more sophisticated retry strategies