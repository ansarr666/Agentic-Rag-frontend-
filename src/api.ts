type RuntimeConfig = { backendUrl?: string };

export function apiUrl(path: string): string {
  const runtime = (window as Window & { __RAG_CONFIG__?: RuntimeConfig }).__RAG_CONFIG__?.backendUrl?.trim();
  const base = runtime || (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim() || '';
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return base ? `${base.replace(/\/$/, '')}${normalizedPath}` : normalizedPath;
}
