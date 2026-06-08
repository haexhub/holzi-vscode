export type SessionMeta = {
  id: string
  title: string
  lastMessage: string
  updatedAt: number
}

export function mergeSessions(local: SessionMeta[], remote: SessionMeta[]): SessionMeta[] {
  const map = new Map<string, SessionMeta>()
  for (const s of local) map.set(s.id, s)
  for (const s of remote) map.set(s.id, s)
  return [...map.values()].sort((a, b) => b.updatedAt - a.updatedAt)
}
