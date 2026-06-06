import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as vscode from 'vscode'
import { readFile, writeFile, listDir } from '../src/tools/filesystem'

describe('filesystem tools', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(vscode.workspace as any).workspaceFolders = [
      { uri: { fsPath: '/workspace', path: '/workspace' } },
    ]
  })

  describe('readFile', () => {
    it('returns utf-8 content of a file', async () => {
      vi.mocked(vscode.workspace.fs.readFile).mockResolvedValue(
        Buffer.from('hello world') as any,
      )
      const result = await readFile({ path: 'src/main.ts' })
      expect(result).toBe('hello world')
    })

    it('calls readFile with the correct workspace-relative URI', async () => {
      vi.mocked(vscode.workspace.fs.readFile).mockResolvedValue(
        Buffer.from('') as any,
      )
      await readFile({ path: 'src/main.ts' })
      const callArg = vi.mocked(vscode.workspace.fs.readFile).mock.calls[0][0]
      expect(callArg.fsPath).toBe('/workspace/src/main.ts')
    })

    it('throws when no workspace folder is open', async () => {
      ;(vscode.workspace as any).workspaceFolders = undefined
      await expect(readFile({ path: 'x' })).rejects.toThrow('no_workspace')
    })
  })

  describe('writeFile', () => {
    it('calls workspace.applyEdit once', async () => {
      await writeFile({ path: 'out.txt', content: 'new content' })
      expect(vscode.workspace.applyEdit).toHaveBeenCalledOnce()
    })

    it('returns a string containing the file path', async () => {
      const result = await writeFile({ path: 'out.txt', content: 'x' })
      expect(typeof result).toBe('string')
      expect(result).toContain('out.txt')
    })
  })

  describe('listDir', () => {
    it('returns directories with trailing slash and files without', async () => {
      vi.mocked(vscode.workspace.fs.readDirectory).mockResolvedValue([
        ['src', 2],   // FileType.Directory = 2
        ['README.md', 1],  // FileType.File = 1
      ] as any)
      const result = await listDir({ path: '.' })
      expect(result).toContain('src/')
      expect(result).toContain('README.md')
      // directories should NOT appear as plain names
      expect(result).not.toMatch(/^src$/)
    })

    it('returns entries sorted alphabetically', async () => {
      vi.mocked(vscode.workspace.fs.readDirectory).mockResolvedValue([
        ['z.ts', 1],
        ['a.ts', 1],
      ] as any)
      const result = await listDir({ path: '.' })
      const lines = result.split('\n')
      expect(lines[0]).toBe('a.ts')
      expect(lines[1]).toBe('z.ts')
    })
  })
})
