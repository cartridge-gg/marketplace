import { defineConfig } from "vite";
import wasm from "vite-plugin-wasm";
import react from "@vitejs/plugin-react-swc";
import topLevelAwait from "vite-plugin-top-level-await";
import process from "node:process";
import mkcert from "vite-plugin-mkcert";
import { VitePWA } from "vite-plugin-pwa";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
	root: "./",
	server: {
		port: process.env.NODE_ENV === "development" ? 3003 : undefined,
	},
	resolve: {
		alias: {
			"@": "/src",
		},
	},
	optimizeDeps: {
		include: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime"],
		exclude: ["@dojoengine/sdk"],
	},
	plugins: [
		tailwindcss(),
		TanStackRouterVite({ target: "react", autoCodeSplitting: true }),
		react(),
		wasm(),
		topLevelAwait(),
		mkcert(),
		VitePWA({
			registerType: "autoUpdate",
			includeAssets: ["favicon.svg", "favicon.ico", "robots.txt"],
			workbox: {
				maximumFileSizeToCacheInBytes: 10 * 1024 * 1024, // 10 MB
			},
			manifest: {
				name: "Arcade",
				short_name: "Arcade",
				description:
					"Arcade is a gaming platform to browse through games and players.",
				theme_color: "#FBCB4A",
				background_color: "#161A17",
				display: "standalone",
				orientation: "portrait",
				start_url: "/",
				icons: [
					{
						src: "icons/icon-192x192.png",
						sizes: "192x192",
						type: "image/png",
					},
					{
						src: "icons/icon-512x512.png",
						sizes: "512x512",
						type: "image/png",
					},
					{
						src: "icons/icon-512x512.png",
						sizes: "512x512",
						type: "image/png",
						purpose: "any maskable",
					},
				],
			},
		}),
	],
});
