type RuntimeConfig = { backendUrl?: string };

export function apiUrl(path: string): string {
  const config = (window as Window & { __RAG_CONFIG__?: RuntimeConfig }).__RAG_CONFIG__;
  return `${config?.backendUrl?.replace(/\/$/, '') ?? ''}${path}`;
}
