import { Data } from "effect";

export class ConfigError extends Data.TaggedError("ConfigError")<{
	readonly message: string;
}> {}

export class FetchError extends Data.TaggedError("FetchError")<{
	readonly message: string;
	readonly projectId?: string;
}> {}

export class ProcessingError extends Data.TaggedError("ProcessingError")<{
	readonly message: string;
	readonly tokenKey?: string;
}> {}

export class SubscriptionError extends Data.TaggedError("SubscriptionError")<{
	readonly message: string;
	readonly projectId?: string;
}> {}

export class InitializationError extends Data.TaggedError("InitializationError")<{
	readonly message: string;
}> {}