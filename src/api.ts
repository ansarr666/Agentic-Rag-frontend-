type RuntimeConfig = { backendUrl?: string };

export function apiUrl(path: string): string {
  const runtime = (window as Window & { __RAG_CONFIG__?: RuntimeConfig }).__RAG_CONFIG__?.backendUrl?.trim();
  const base = runtime || import.meta.env.VITE_API_BASE_URL?.trim();
  if (!base) throw new Error('Backend URL is not configured. Set VITE_API_BASE_URL or config.js backendUrl.');
  return `${base.replace(/\/$/, '')}${path.startsWith('/') ? path : `/${path}`}`;
}
