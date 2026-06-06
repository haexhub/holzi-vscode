import * as vscode from 'vscode'
import { applyPatch } from 'diff'
import * as path from 'path'

function resolveWorkspacePath(relPath: string): any {
  const folder = vscode.workspace.workspaceFolders?.[0]
  if (!folder) throw new Error('no_workspace')
  const resolved = vscode.Uri.joinPath(folder.uri as any, relPath)
  const workspaceFsPath = (folder.uri as any).fsPath as string
  const resolvedFsPath = (resolved as any).fsPath as string
  if (!resolvedFsPath.startsWith(workspaceFsPath + path.sep) && resolvedFsPath !== workspaceFsPath) {
    throw new Error('path_traversal_denied')
  }
  return resolved
}

export async function getSelection(_params: Record<string, unknown>): Promise<string> {
  const editor = vscode.window.activeTextEditor
  if (!editor || editor.selection.isEmpty) return ''
  const text = editor.document.getText(editor.selection as any)
  const folder = vscode.workspace.workspaceFolders?.[0]
  const absPath = editor.document.fileName
  const relPath = folder ? path.relative(folder.uri.fsPath, absPath) : absPath
  return `${relPath}\n${text}`
}

export async function applyDiff(params: Record<string, unknown>): Promise<string> {
  const uri = resolveWorkspacePath(params.path as string)
  const patch = params.patch as string

  const bytes = await vscode.workspace.fs.readFile(uri)
  const original = Buffer.from(bytes).toString('utf-8')
  const patched = applyPatch(original, patch)

  if (patched === false) throw new Error('patch_failed')

  const edit = new vscode.WorkspaceEdit()
  edit.createFile(uri, { overwrite: true, contents: Buffer.from(patched, 'utf-8') })
  await vscode.workspace.applyEdit(edit)
  return `patched ${uri.fsPath}`
}

export async function openFile(params: Record<string, unknown>): Promise<string> {
  const uri = resolveWorkspacePath(params.path as string)
  const line = (params.line as number | undefined) ?? 0
  const doc = await vscode.workspace.openTextDocument(uri)
  await vscode.window.showTextDocument(doc, {
    viewColumn: vscode.ViewColumn.One,
    selection: new vscode.Range(
      new vscode.Position(line, 0),
      new vscode.Position(line, 0),
    ),
  } as any)
  return `opened ${params.path as string}:${line}`
}
