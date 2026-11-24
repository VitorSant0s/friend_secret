import { invalidSession, requestSessionId } from "@/lib/api-session"
import { groupDetails } from "@/lib/whatsapp"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const id = requestSessionId(request)
  if (!id) return invalidSession()

  const groupId = new URL(request.url).searchParams.get("groupId")
  if (!groupId) {
    return Response.json({ error: "Informe o grupo." }, { status: 400 })
  }

  try {
    const group = await groupDetails(id, groupId)
    return Response.json({
      subject: group.subject,
      participants: group.participants.map(({ id: participantId, name }) => ({
        id: participantId,
        name,
      })),
    })
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 400 },
    )
  }
}
