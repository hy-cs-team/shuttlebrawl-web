export const SERVER_URL = import.meta.env.VITE_SERVER_URL as string;
if (!SERVER_URL) {
  // Fail fast to avoid silent misconfig
  // eslint-disable-next-line no-console
  console.warn('[ENV] VITE_SERVER_URL is not set. Check your .env.local');
}

// 미니맵 계산을 위한 맵 크기 상수
export const MAP_WIDTH = 3000;
export const MAP_HEIGHT = 3000;
