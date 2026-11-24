/**
 * Endereço do motor do WhatsApp.
 *
 * Local: vazio, as chamadas vão para o mesmo servidor.
 * Netlify: NEXT_PUBLIC_API_URL aponta para a VPS (ex.: https://api.seudominio.com).
 */
export function apiUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_API_URL?.trim().replace(/\/+$/, "") ?? ""
  if (!base) return path
  return `${base}${path.startsWith("/") ? path : `/${path}`}`
}
