import { Effect, Stream, Option, Data, Metric, Chunk, Schedule } from "effect";
import type { Token, ToriiClient } from "@dojoengine/torii-wasm/node";
import { DEFAULT_IGNORED_PROJECTS } from "../constants";
import {
	MessageConfigService,
	ProcessingConfigService,
	ProjectConfigService,
} from "../effect-config";
import { createArcadeProjectClient } from "./arcade";
import {
	InvalidContentError,
	processTokenMessages,
	publishMessages,
} from "./message-service";
import type { EditionModel } from "@cartridge/arcade";

// Error types
export class MessageTooLargeError extends Data.TaggedError(
	"MessageTooLarge",
)<{}> {}
export class ProtobufDecodeError extends Data.TaggedError(
	"ProtobufDecodeError",
)<{}> {}

export class InvalidContentTypeError extends Data.TaggedError(
	"InvalidContentTypeError",
) {}

// Metrics for monitoring token processing
export const tokensProcessedCounter = Metric.counter("tokens_processed", {
	description: "Total number of tokens processed",
});

export const messagesGeneratedCounter = Metric.counter("messages_generated", {
	description: "Total number of messages generated",
});

export const messagesBatchedCounter = Metric.counter("messages_batched", {
	description: "Total number of message batches created",
});

export const messagesPublishedCounter = Metric.counter("messages_published", {
	description: "Total number of messages published",
});

// Create Torii client for a project
export const createToriiClient = (project: string, edition: any) =>
	Effect.gen(function* () {
		// const cfg = JSON.parse(edition.config.toString());
		const worldAddress = edition.world_address;

		return yield* Effect.acquireRelease(
			Effect.tryPromise({
				try: () => createArcadeProjectClient(project, worldAddress),
				catch: (error) =>
					new Error(`Failed to create torii client for ${project}: ${error}`),
			}),
			(client) =>
				Effect.sync(() => {
					Effect.logInfo(`Freeing ${project} ToriiClient`);
					client.free();
				}),
		);
	});

// Fetch tokens with error handling
const fetchTokenEffect = (
	client: ToriiClient,
	project: string,
	cursor: string | undefined,
	batchSize: number,
): Effect.Effect<{ items: Token[]; next_cursor?: string }, Error> =>
	Effect.tryPromise({
		try: () => client.getTokens([], [], batchSize, cursor),
		catch: (error) => {
			if (typeof error === "string") {
				if (error.includes("decoded message length too large")) {
					return new MessageTooLargeError();
				}
				if (error.includes("failed to decode Protobuf message")) {
					return new ProtobufDecodeError();
				}
				if (error.includes("invalid content type")) {
					return new InvalidContentTypeError();
				}
			}
			return new Error(`Failed fetching tokens for ${project} batch: ${error}`);
		},
	}).pipe(
		Effect.catchIf(
			(error): error is MessageTooLargeError =>
				error instanceof MessageTooLargeError,
			() =>
				Effect.gen(function* () {
					let newBatchSize = batchSize - 500;

					if (batchSize > 0 && batchSize <= 500) {
						newBatchSize = batchSize - 100;
					}

					// If batch size is still too large, we simply ignore batch and continue further
					if (newBatchSize <= 0) {
						return { items: [], next_cursor: cursor };
					}

					yield* Effect.logDebug(
						`Batch size too large for ${project}, reducing from ${batchSize} to ${newBatchSize}`,
					);
					return yield* fetchTokenEffect(client, project, cursor, newBatchSize);
				}),
		),
		Effect.catchIf(
			(error): error is ProtobufDecodeError =>
				error instanceof ProtobufDecodeError,
			() =>
				Effect.gen(function* () {
					// NOTE: this will occur if studios Torii does not share same grpc server version as marketplace grpc client.
					// Thus we skip those
					yield* Effect.logError(
						`Protobuf decode error for ${project}, skipping batch at cursor: ${cursor}`,
					);
					// Return empty result to skip this batch
					return { items: [], next_cursor: cursor };
				}),
		),
		Effect.catchIf(
			// NOTE: this error is likely due to studio's torii not up to date or down
			(error): error is InvalidContentTypeError =>
				error instanceof InvalidContentTypeError,
			() => Effect.succeed({ items: [], next_cursor: undefined }),
		),
		Effect.tapError((error) =>
			Effect.logError(`Token fetch error for ${project}: ${error}`),
		),
	);

// Fetch paginated tokens as a stream
export const fetchPaginatedTokens = (
	client: ToriiClient,
	project: string,
	batchSize = 5000,
) =>
	Stream.unfoldEffect(
		Option.some<string | undefined>(undefined),
		(maybeCursor) =>
			Option.match(maybeCursor, {
				onNone: () => Effect.succeed(Option.none()),
				onSome: (cursor) =>
					Effect.gen(function* () {
						yield* Effect.logDebug(
							`Fetching tokens for ${project}, cursor: ${cursor || "initial"}`,
						);

						const response = yield* fetchTokenEffect(
							client,
							project,
							cursor,
							batchSize,
						);

						const tokensWithMetadata = response.items.filter(
							(t: Token) => !!t.metadata,
						);

						if (response.next_cursor) {
							return Option.some([
								tokensWithMetadata,
								Option.some(response.next_cursor),
							] as const);
						}

						if (tokensWithMetadata.length > 0) {
							return Option.some([tokensWithMetadata, Option.none()] as const);
						}

						return Option.none();
					}),
			}),
	).pipe(
		Stream.filter((tokens) => tokens.length > 0),
		Stream.tapError((error) =>
			Effect.logError(`Error in token fetch: ${error}`),
		),
	);

// Process tokens for a project
export const processTokens = (project: string) => (tokens: Token[]) =>
	Effect.gen(function* () {
		yield* Effect.log(`Processing ${tokens.length} tokens from ${project}`);

		// Track tokens being processed
		yield* tokensProcessedCounter(Effect.succeed(tokens.length));

		// Create a stream of messages from all tokens
		const messageStream = Stream.fromIterable(tokens).pipe(
			Stream.mapEffect((token) => processTokenMessages(token)),
			Stream.flatMap((messages) => Stream.fromIterable(messages)),
			Stream.filter((message) => message !== undefined && message !== null),
			Stream.tap(() => messagesGeneratedCounter(Effect.succeed(1))),
		);

		const messageConfig = yield* MessageConfigService;
		// Group messages into batches and publish each batch
		yield* messageStream.pipe(
			Stream.grouped(messageConfig.batchSize),
			Stream.tap((n) => messagesBatchedCounter(Effect.succeed(n.length))),
			Stream.filter((batch) => batch.length > 0),
			Stream.runForEach((batch) =>
				Effect.gen(function* () {
					const messages = Chunk.toArray(batch);
					yield* publishMessages(messages);
					yield* messagesPublishedCounter(Effect.succeed(messages.length));
				}),
			),
		);

		// Get metrics summary for logging
		const [processed, generated, batched, published] = yield* Effect.all([
			Metric.value(tokensProcessedCounter),
			Metric.value(messagesGeneratedCounter),
			Metric.value(messagesBatchedCounter),
			Metric.value(messagesPublishedCounter),
		]);

		yield* Effect.logDebug(
			`Completed ${project} - Tokens: ${processed}, Messages: ${generated}, Batches: ${batched}, Published: ${published}`,
		);
	});

// Fetch and process tokens for a project
export const fetchProjectToken = (client: ToriiClient, project: string) =>
	Effect.gen(function* () {
		const processingConfig = yield* ProcessingConfigService;
		const result = yield* Effect.retry(
			Stream.runForEach(
				fetchPaginatedTokens(
					client,
					project,
					processingConfig.tokenFetchBatchSize,
				),
				processTokens(project),
			),
			Schedule.addDelay(
				Schedule.recurs(processingConfig.retryAttempts),
				() => `${processingConfig.retryDelay} millis`,
			),
		);

		yield* Effect.log(`Completed token fetch for project: ${project}`);
		return result;
	});

// Handle a single edition
export const handleSingleEdition = (project: string, edition: EditionModel) =>
	Effect.gen(function* () {
		yield* Effect.logDebug(`Starting to process project: ${project}`);
		yield* Effect.logDebug(
			`Edition data: ${JSON.stringify({
				world_address: edition.worldAddress,
				config: edition.config?.toString(),
				published: edition.published,
			})}`,
		);

		const projectConfig = yield* ProjectConfigService;
		const ignoredProjects =
			projectConfig.ignoredProjects.length > 0
				? projectConfig.ignoredProjects
				: DEFAULT_IGNORED_PROJECTS;
		if (ignoredProjects.includes(project)) {
			return;
		}

		const client = yield* createToriiClient(project, edition);

		yield* fetchProjectToken(client, project);
	}).pipe(
		Effect.catchAll((error) =>
			Effect.logError(`Error processing project ${project}: ${error}`),
		),
	);
