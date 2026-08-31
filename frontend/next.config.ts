import type { NextConfig } from "next"

/**
 * The browser only ever talks to ITS OWN origin (:3000).
 * Requests under /health and /api are forwarded server-side to the
 * FastAPI backend -- so nothing in the browser (proxy, VPN, extensions)
 * can interfere with the backend connection.
 *
 * BACKEND_URL is where THIS SERVER (not the browser) finds the backend:
 *   - docker compose: http://backend:8000 (the compose service name)
 *   - local `npm run dev`: falls back to http://localhost:8000
 */
const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8000"

const nextConfig: NextConfig = {
  // Required for the SSE chat stream: Next's gzip compression buffers the
  // proxied response, so token events never flush to the browser.
  compress: false,
  async rewrites() {
    return [
      { source: "/health", destination: `${BACKEND_URL}/health` },
      { source: "/api/:path*", destination: `${BACKEND_URL}/api/:path*` },
    ]
  },
}

export default nextConfig
