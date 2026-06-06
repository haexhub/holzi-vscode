import { describe, it, expect } from 'vitest'
import * as vscode from 'vscode'

describe('vscode mock', () => {
  it('has workspace.fs.readFile', () => {
    expect(vscode.workspace.fs.readFile).toBeDefined()
  })

  it('WorkspaceEdit is constructable', () => {
    const edit = new vscode.WorkspaceEdit()
    expect(edit).toBeDefined()
  })

  it('Range and Position are constructable', () => {
    const pos = new vscode.Position(0, 0)
    const range = new vscode.Range(pos, pos)
    expect(range.start.line).toBe(0)
  })
})
