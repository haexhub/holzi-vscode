import * as vscode from 'vscode'

function resolveWorkspacePath(relPath: string): any {
  const folder = vscode.workspace.workspaceFolders?.[0]
  if (!folder) throw new Error('no_workspace')
  return vscode.Uri.joinPath(folder.uri as any, relPath)
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
  // createFile with contents writes atomically; overwrite:true handles existing files
  edit.createFile(uri, { overwrite: true, contents: Buffer.from(content, 'utf-8') })
  await vscode.workspace.applyEdit(edit)
  return `written ${uri.fsPath}`
}

export async function listDir(params: Record<string, unknown>): Promise<string> {
  const uri = resolveWorkspacePath(params.path as string)
  const entries = await vscode.workspace.fs.readDirectory(uri)
  return entries
    .map(([name, type]: [string, number]) => (type === 2 ? `${name}/` : name))
    .sort()
    .join('\n')
}
