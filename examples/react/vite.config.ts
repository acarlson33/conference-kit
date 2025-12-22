import fs from "fs";
import type { ServerOptions as HttpsServerOptions } from "https";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const useHttps = process.env.VITE_DEV_HTTPS === "true";
const keyPath = process.env.VITE_DEV_SSL_KEY;
const certPath = process.env.VITE_DEV_SSL_CERT;

let httpsConfig: boolean | HttpsServerOptions | undefined;

if (useHttps) {
  if (
    keyPath &&
    certPath &&
    fs.existsSync(keyPath) &&
    fs.existsSync(certPath)
  ) {
    httpsConfig = {
      key: fs.readFileSync(keyPath),
      cert: fs.readFileSync(certPath),
    };
  } else {
    // Fallback: Vite will generate a self-signed cert when https is true.
    httpsConfig = true;
  }
}

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    // Cast to any to satisfy Vite's https option typing across versions.
    https: httpsConfig as any,
  },
});
