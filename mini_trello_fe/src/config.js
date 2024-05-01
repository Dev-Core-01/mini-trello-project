/**
 * Vite inlines VITE_* variables at build time, so the API URL is fixed per
 * build. The fallback matches the backend's default port.
 */
export const GRAPHQL_URL = import.meta.env.VITE_GRAPHQL_URL || "http://localhost:8001/graphql";
