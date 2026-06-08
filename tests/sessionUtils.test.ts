import { describe, it, expect } from 'vitest'
import { mergeSessions, type SessionMeta } from '../src/sessionUtils'

const s = (id: string, updatedAt: number): SessionMeta =>
  ({ id, title: `Chat ${id}`, lastMessage: 'hello', updatedAt })

describe('mergeSessions', () => {
  it('returns empty array for empty inputs', () => {
    expect(mergeSessions([], [])).toEqual([])
  })

  it('returns local sessions when no remote', () => {
    const local = [s('a', 1), s('b', 2)]
    expect(mergeSessions(local, [])).toHaveLength(2)
  })

  it('remote wins on conflict', () => {
    const local = [s('a', 1)]
    const remote = [{ id: 'a', title: 'Updated', lastMessage: 'new', updatedAt: 2 }]
    const result = mergeSessions(local, remote)
    expect(result[0].title).toBe('Updated')
  })

  it('local-only sessions are preserved', () => {
    const local = [s('local-only', 1)]
    const remote = [s('remote-only', 2)]
    const result = mergeSessions(local, remote)
    expect(result.map(r => r.id)).toContain('local-only')
    expect(result.map(r => r.id)).toContain('remote-only')
  })

  it('sorts by updatedAt descending', () => {
    const local = [s('a', 1), s('b', 3)]
    const remote = [s('c', 2)]
    const result = mergeSessions(local, remote)
    expect(result.map(r => r.id)).toEqual(['b', 'c', 'a'])
  })
})
