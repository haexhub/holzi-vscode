import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as vscode from 'vscode'
import { getSelection, openFile, applyDiff } from '../src/tools/editor'

describe('editor tools', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(vscode.workspace as any).workspaceFolders = [
      { uri: { fsPath: '/workspace', path: '/workspace' } },
    ]
  })

  describe('getSelection', () => {
    it('returns empty string when no editor is open', async () => {
      ;(vscode.window as any).activeTextEditor = undefined
      const result = await getSelection({})
      expect(result).toBe('')
    })

    it('returns empty string when selection is empty', async () => {
      ;(vscode.window as any).activeTextEditor = {
        selection: { isEmpty: true },
        document: {
          getText: vi.fn(),
          fileName: '/workspace/src/main.ts',
        },
      }
      const result = await getSelection({})
      expect(result).toBe('')
    })

    it('returns file name and selected text when selection is non-empty', async () => {
      ;(vscode.window as any).activeTextEditor = {
        selection: { isEmpty: false },
        document: {
          getText: vi.fn().mockReturnValue('selected code'),
          fileName: '/workspace/src/main.ts',
        },
      }
      const result = await getSelection({})
      expect(result).toContain('selected code')
      expect(result).toContain('src/main.ts')
    })
  })

  describe('openFile', () => {
    it('calls showTextDocument with the resolved URI', async () => {
      vi.mocked(vscode.workspace.openTextDocument).mockResolvedValue({ uri: {} } as any)
      vi.mocked(vscode.window.showTextDocument).mockResolvedValue(undefined as any)

      await openFile({ path: 'src/main.ts' })

      expect(vscode.workspace.openTextDocument).toHaveBeenCalledOnce()
      expect(vscode.window.showTextDocument).toHaveBeenCalledOnce()
    })

    it('returns a string containing the path', async () => {
      vi.mocked(vscode.workspace.openTextDocument).mockResolvedValue({ uri: {} } as any)
      vi.mocked(vscode.window.showTextDocument).mockResolvedValue(undefined as any)

      const result = await openFile({ path: 'src/main.ts', line: 10 })
      expect(typeof result).toBe('string')
      expect(result).toContain('src/main.ts')
    })
  })

  describe('applyDiff', () => {
    it('applies a unified patch and calls workspace.applyEdit', async () => {
      const original = 'hello world\n'
      const patch = `--- a/out.txt
+++ b/out.txt
@@ -1,1 +1,1 @@
-hello world
+hello patched
`
      vi.mocked(vscode.workspace.fs.readFile).mockResolvedValue(
        Buffer.from(original) as any,
      )

      await applyDiff({ path: 'out.txt', patch })

      expect(vscode.workspace.applyEdit).toHaveBeenCalledOnce()
    })

    it('throws patch_failed when patch does not apply', async () => {
      vi.mocked(vscode.workspace.fs.readFile).mockResolvedValue(
        Buffer.from('completely different content\n') as any,
      )

      const badPatch = `--- a/x
+++ b/x
@@ -1,1 +1,1 @@
-expected line
+new line
`
      await expect(applyDiff({ path: 'out.txt', patch: badPatch })).rejects.toThrow('patch_failed')
    })
  })
})
