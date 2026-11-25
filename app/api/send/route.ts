import {
  buildDeliveryPlan,
  drawSecretSanta,
  validateSetup,
  type Representatives,
} from "@/lib/draw"
import { clientIp, limitRequest, tooManyRequests } from "@/lib/api-limits"
import { invalidSession, requestSessionId } from "@/lib/api-session"
import { audit } from "@/lib/audit"
import { LEGAL_VERSION } from "@/lib/legal"
import { formatMessage } from "@/lib/message"
import { buildPeople } from "@/lib/participants"
import { SessionExpiredError } from "@/lib/session"
import {
  TooManySessionsError,
  groupDetails,
  resolveTargets,
  sendMessages,
} from "@/lib/whatsapp"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type Body = {
  groupId?: string
  date?: string
  people?: {
    id?: string
    name?: string
    hasPhone?: boolean
    external?: boolean
  }[]
  representatives?: Record<string, string>
  termsAccepted?: boolean
  termsVersion?: string
}

export async function POST(request: Request) {
  const ipLimit = limitRequest(request, "send-ip", 20, 60_000)
  if (!ipLimit.allowed) return tooManyRequests(ipLimit)

  const sessionId = requestSessionId(request)
  if (!sessionId) return invalidSession()

  const ip = clientIp(request)

  let body: Body
  try {
    body = (await request.json()) as Body
  } catch {
    return Response.json({ error: "Pedido inválido." }, { status: 400 })
  }

  try {
    if (body.termsAccepted !== true) {
      throw new Error(
        "Para enviar, é preciso aceitar os Termos de Uso e a Política de Privacidade.",
      )
    }

    const termsVersion =
      String(body.termsVersion ?? "").slice(0, 20) || LEGAL_VERSION

    const groupId = body.groupId?.trim()
    if (!groupId) throw new Error("Escolha o grupo do sorteio.")
    if (!Array.isArray(body.people) || body.people.length < 4) {
      throw new Error("O sorteio precisa de pelo menos quatro participantes.")
    }

    const details = await groupDetails(sessionId, groupId)
    if (body.people.length > 300) {
      throw new Error("Participantes demais para um sorteio só.")
    }

    const participants = buildPeople(details.participants, body.people)
    const seen = new Set(participants.map((participant) => participant.id))

    const representatives: Representatives = {}
    for (const [representedId, representativeId] of Object.entries(
      body.representatives ?? {},
    )) {
      if (seen.has(representedId) && seen.has(representativeId)) {
        representatives[representedId] = representativeId
      }
    }

    validateSetup(participants, representatives)

    const date = body.date?.trim().slice(0, 60) || undefined
    const assignment = drawSecretSanta(participants)
    const plan = buildDeliveryPlan(participants, representatives, assignment)
    const jids = await resolveTargets(
      sessionId,
      groupId,
      plan.map((delivery) => delivery.person.id),
    )

    const targets = plan.map((delivery) => ({
      jid: jids.get(delivery.person.id)!,
      personName: delivery.person.name,
      text: formatMessage(delivery, { date }),
    }))

    audit({
      event: "send.requested",
      sessionId,
      ip,
      detail: {
        people: participants.length,
        noPhone: participants.filter((person) => !person.hasPhone).length,
        termsVersion,
        withDate: Boolean(date),
      },
    })

    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        const emit = (payload: unknown) => {
          controller.enqueue(encoder.encode(`${JSON.stringify(payload)}\n`))
        }

        emit({ type: "start", total: targets.length })

        try {
          const result = await sendMessages(sessionId, targets, (progress) => {
            emit({ type: "progress", ...progress })
          })
          audit({
            event: "send.completed",
            sessionId,
            detail: {
              sent: result.sent,
              failed: result.failed,
              hidden: result.hidden,
              hideFailed: result.hideFailed,
              self: result.self,
            },
          })
          emit({ type: "done", ...result })
        } catch (error) {
          audit({
            event: "send.failed",
            sessionId,
            detail: {
              reason:
                error instanceof Error
                  ? error.message.slice(0, 160)
                  : "unknown",
            },
          })
          emit({
            type: "error",
            message: error instanceof Error ? error.message : String(error),
          })
        } finally {
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        "Content-Type": "application/x-ndjson; charset=utf-8",
        "Cache-Control": "no-store",
      },
    })
  } catch (error) {
    audit({
      event: "send.rejected",
      sessionId,
      ip,
      detail: {
        reason: error instanceof Error ? error.message.slice(0, 160) : "unknown",
      },
    })
    if (error instanceof TooManySessionsError) {
      return Response.json({ error: error.message }, { status: 429 })
    }
    if (error instanceof SessionExpiredError) {
      return Response.json(
        { error: error.message, expired: true },
        { status: 401 },
      )
    }
    return Response.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 400 },
    )
  }
}
