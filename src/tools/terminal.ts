import { exec } from 'child_process'
import * as path from 'path'
import * as vscode from 'vscode'

export function runCommand(params: Record<string, unknown>): Promise<string> {
  const cmd = params.cmd as string
  const relCwd = (params.cwd as string | undefined) ?? '.'
  const folder = vscode.workspace.workspaceFolders?.[0]
  const cwd = folder ? path.join(folder.uri.fsPath, relCwd) : relCwd

  return new Promise((resolve) => {
    exec(cmd, { cwd, timeout: 30000 }, (_err, stdout, stderr) => {
      const out = [stdout, stderr].filter(Boolean).join('\n').trim()
      resolve(out || '(no output)')
    })
  })
}
