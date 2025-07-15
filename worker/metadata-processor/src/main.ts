import { Effect, Fiber, Layer } from "effect";
import { program } from "./effect";
import { ConfigLive } from "./effect-config";
import {
	ArcadeSDKLive,
	MarketplaceSDKLive,
	MarketplaceAccountLive,
} from "./services/sdk-services";
import { BunRuntime } from "@effect/platform-bun";

const AppServices = Layer.mergeAll(
	ArcadeSDKLive,
	MarketplaceSDKLive,
	MarketplaceAccountLive,
);

const AllServices = AppServices.pipe(Layer.provideMerge(ConfigLive));

Effect.scoped(program).pipe(Effect.provide(AllServices), BunRuntime.runMain);
