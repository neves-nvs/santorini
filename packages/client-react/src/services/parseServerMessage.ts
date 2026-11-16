import { type GenericWSMessage, type ServerMessage, isServerMessage } from '@santorini/shared'

export function parseServerMessage(raw: string): ServerMessage | null {
  let parsed: Partial<GenericWSMessage> | null
  try {
    parsed = JSON.parse(raw)
  } catch {
    return null
  }

  if (typeof parsed?.type !== 'string') return null
  const message: GenericWSMessage = { type: parsed.type, payload: parsed.payload }
  return isServerMessage(message) ? message : null
}
