export const EXPIRY_NOTICE =
  "A conexão de 15 minutos terminou. Leia o código do WhatsApp de novo para continuar."

/**
 * O aviso de expiração só faz sentido para quem já conectou ou já recebeu o
 * código. Quem nunca chegou a conectar não deve ver nada sobre sessão.
 */
export function expiryNotice(
  status: string | null | undefined,
): string | undefined {
  return status === "connected" || status === "qr" ? EXPIRY_NOTICE : undefined
}
