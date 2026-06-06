import * as vscode from 'vscode'

function resolveWorkspacePath(relPath: string): vscode.Uri {
  const folder = vscode.workspace.workspaceFolders?.[0]
  if (!folder) throw new Error('no_workspace')
  return vscode.Uri.joinPath(folder.uri, relPath) as unknown as vscode.Uri
}

export async function readFile(params: Record<string, unknown>): Promise<string> {
  const uri = resolveWorkspacePath(params.path as string)
  const bytes = await vscode.workspace.fs.readFile(uri)
  return Buffer.from(bytes).toString('utf-8')
}

export async function writeFile(params: Record<string, unknown>): Promise<string> {
  const uri = resolveWorkspacePath(params.path as string)
  const content = params.content as string
  const edit = new vscode.WorkspaceEdit()
  edit.createFile(uri as any, { overwrite: true })
  edit.replace(
    uri as any,
    new vscode.Range(new vscode.Position(0, 0), new vscode.Position(99999, 0)),
    content,
  )
  await vscode.workspace.applyEdit(edit)
  return `written ${(uri as any).fsPath}`
}

export async function listDir(params: Record<string, unknown>): Promise<string> {
  const uri = resolveWorkspacePath(params.path as string)
  const entries = await vscode.workspace.fs.readDirectory(uri)
  return entries
    .map(([name, type]: [string, number]) => (type === 2 ? `${name}/` : name))
    .sort()
    .join('\n')
}
