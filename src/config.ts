export const SERVER_URL = import.meta.env.VITE_SERVER_URL as string
if (!SERVER_URL) {
// Fail fast to avoid silent misconfig
// eslint-disable-next-line no-console
console.warn('[ENV] VITE_SERVER_URL is not set. Check your .env.local')
}