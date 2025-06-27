import { initializeWorker } from "./init.ts";
import { startWorker, setupGracefulShutdown } from "./worker.ts";
import { createLogger } from "./utils/logger.ts";

// Re-export types and functions for external use
export type { WorkerState } from "./init.ts";
export { initializeWorker, createWorkerState } from "./init.ts";
export {
	startWorker,
	stopWorker,
	processAllTokensFromFetcher,
	setupGracefulShutdown,
} from "./worker.ts";

/**
 * Main entry point
 */
async function main() {
	const logger = createLogger("Main");

	try {
		// Initialize worker
		const state = await initializeWorker();

		// Start worker
		await startWorker(state);

		// Set up graceful shutdown
		setupGracefulShutdown(state);

		// Keep the process running
		state.logger.info(
			"Metadata processor worker is running. Press Ctrl+C to stop.",
		);
	} catch (error) {
		logger.error(error, "Fatal error");
		process.exit(1);
	}
}

// Run the worker if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
	main().catch(console.error);
}
