import QRCode from "qrcode"
import { clientIp, limitRequest, tooManyRequests } from "@/lib/api-limits"
import { audit } from "@/lib/audit"
import { buildPixPayload } from "@/lib/pix"
import { donationConfig, isDonationConfigured } from "@/lib/pix-config"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const MIN = 1
const MAX = 1000

export async function GET(request: Request) {
  const ipLimit = limitRequest(request, "donation-ip", 60, 60_000)
  if (!ipLimit.allowed) return tooManyRequests(ipLimit)

  const raw = new URL(request.url).searchParams.get("amount") ?? ""
  const amount = Number(raw.replace(",", "."))

  if (!Number.isFinite(amount) || amount < MIN || amount > MAX) {
    return Response.json(
      { error: `Escolha um valor entre R$ ${MIN} e R$ ${MAX}.` },
      { status: 400 },
    )
  }

  const rounded = Math.round(amount * 100) / 100

  if (!isDonationConfigured()) {
    return Response.json({ configured: false })
  }

  try {
    audit({
      event: "donation.qr",
      ip: clientIp(request),
      detail: { amount: rounded },
    })
    const config = donationConfig()
    const code = buildPixPayload({
      key: config.key,
      merchantName: config.name,
      merchantCity: config.city,
      amount: rounded,
    })
    const qr = await QRCode.toDataURL(code, { margin: 1, width: 360 })

    return Response.json(
      { configured: true, code, qr },
      { headers: { "Cache-Control": "no-store" } },
    )
  } catch (error) {
    return Response.json(
      {
        configured: true,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 400 },
    )
  }
}
