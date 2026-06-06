import { describe, it, expect, vi } from 'vitest'
import { runCommand } from '../src/tools/terminal'

vi.mock('child_process', () => ({
  exec: vi.fn((cmd: string, opts: any, cb: any) => {
    if (cmd === 'echo hello') cb(null, 'hello\n', '')
    else if (cmd === 'fail_cmd') cb(new Error('exit 1'), '', 'error output')
    else if (cmd === 'both') cb(new Error('partial'), 'some stdout\n', 'some stderr')
    else cb(null, '', '')
  }),
}))

vi.mock('vscode', () => ({
  workspace: {
    workspaceFolders: [{ uri: { fsPath: '/workspace' } }],
  },
}))

describe('terminal tool (runCommand)', () => {
  it('returns stdout for successful command', async () => {
    const result = await runCommand({ cmd: 'echo hello', cwd: '.' })
    expect(result).toContain('hello')
  })

  it('returns stderr when command fails', async () => {
    const result = await runCommand({ cmd: 'fail_cmd', cwd: '.' })
    expect(result).toContain('error output')
  })

  it('combines stdout and stderr when both present', async () => {
    const result = await runCommand({ cmd: 'both', cwd: '.' })
    expect(result).toContain('some stdout')
    expect(result).toContain('some stderr')
  })

  it('returns "(no output)" for empty output', async () => {
    const result = await runCommand({ cmd: 'silent', cwd: '.' })
    expect(result).toBe('(no output)')
  })

  it('defaults cwd to "." when not provided', async () => {
    // Should not throw when cwd is missing
    const result = await runCommand({ cmd: 'echo hello' })
    expect(typeof result).toBe('string')
  })
})
