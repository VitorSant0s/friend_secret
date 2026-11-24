import {
  buildDeliveryPlan,
  drawSecretSanta,
  validateSetup,
  type Representatives,
} from "@/lib/draw"
import { invalidSession, requestSessionId } from "@/lib/api-session"
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
}

export async function POST(request: Request) {
  const sessionId = requestSessionId(request)
  if (!sessionId) return invalidSession()

  let body: Body
  try {
    body = (await request.json()) as Body
  } catch {
    return Response.json({ error: "Pedido inválido." }, { status: 400 })
  }

  try {
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
          emit({ type: "done", ...result })
        } catch (error) {
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
