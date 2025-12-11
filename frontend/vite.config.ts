/// <reference types="vitest/config" />
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";
import { defineConfig, loadEnv, ProxyOptions } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import {
  hashEdificeBootstrap,
  queryHashVersion,
} from "./plugins/vite-plugin-edifice";

export default ({ mode }: { mode: string }) => {
  // Checking environement files
  const envFile = loadEnv(mode, process.cwd());
  const envs = { ...process.env, ...envFile };
  const hasEnvFile = Object.keys(envFile).length;

  // Proxy variables
  const headers = hasEnvFile
    ? {
        "set-cookie": [
          `oneSessionId=${envs.VITE_ONE_SESSION_ID}`,
          `XSRF-TOKEN=${envs.VITE_XSRF_TOKEN}`,
        ],
        "Cache-Control": "public, max-age=300",
      }
    : {};

  const proxyObj: ProxyOptions = hasEnvFile
    ? {
        target: envs.VITE_RECETTE,
        changeOrigin: envs.VITE_RECETTE?.includes("localhost") ? false : true,
        headers: {
          cookie: `oneSessionId=${envs.VITE_ONE_SESSION_ID};authenticated=true; XSRF-TOKEN=${envs.VITE_XSRF_TOKEN}`,
        },
        configure: (proxy) => {
          proxy.on("proxyReq", (proxyReq) => {
            proxyReq.setHeader("X-XSRF-TOKEN", envs.VITE_XSRF_TOKEN || "");
          });
        },
      }
    : {
        target: "http://localhost:8090",
        changeOrigin: false,
      };

  /* Replace "/" the name of your application (e.g : blog | mindmap | collaborativewall) */
  return defineConfig({
    base: mode === "production" ? "/rack" : "",
    root: __dirname,
    cacheDir: "./node_modules/.vite/rack",
    resolve: {
      alias: {
        "@images": resolve(
          __dirname,
          "node_modules/@edifice.io/bootstrap/dist/images",
        ),
      },
    },

    server: {
      fs: {
        /**
         * Allow the server to access the node_modules folder (for the images)
         * This is a solution to allow the server to access the images and fonts of the bootstrap package for 1D theme
         */
        allow: ["../../"],
      },
      proxy: {
        "/applications-list": proxyObj,
        "/conf/public": proxyObj,
        "^/(?=help-1d|help-2d)": proxyObj,
        "^/(?=assets)": proxyObj,
        "^/(?=theme|locale|i18n|skin)": proxyObj,
        "^/(?=auth|appregistry|archive|cas|userbook|directory|communication|conversation|portal|session|timeline|workspace|infra|blog|collaborativewall|mindmap|pad|scrapbook|timelinegenerator|xiti|analyticsConf|explorer|wiki|collaborativeeditor)":
          proxyObj,
        proxyObj,
        "/xiti": proxyObj,
        "/analyticsConf": proxyObj,
        "/wiki": proxyObj,
        "/audience": proxyObj,
        "/rack": proxyObj,
        "/rack/api": proxyObj,
        "/resources-applications": proxyObj,
      },
      port: 4200,
      headers,
      host: "localhost",
      cors: true,
    },

    preview: {
      port: 4300,
      headers,
      host: "localhost",
    },

    plugins: [
      react(),
      tsconfigPaths(),
      hashEdificeBootstrap({
        hash: queryHashVersion,
      }),
    ],

    build: {
      outDir: "dist",
      emptyOutDir: true,
      reportCompressedSize: true,
      commonjsOptions: {
        transformMixedEsModules: true,
      },
      assetsDir: "public",
      chunkSizeWarningLimit: 5000,
      rollupOptions: {
        output: {
          inlineDynamicImports: true,
        },
      },
    },
  });
};
