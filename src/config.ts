import * as vscode from 'vscode'

export async function getToken(context: vscode.ExtensionContext): Promise<string> {
  return (await context.secrets.get('holzi.token'))
    ?? vscode.workspace.getConfiguration('holzi').get<string>('token')
    ?? ''
}

export function getHost(): string {
  return (vscode.workspace.getConfiguration('holzi').get<string>('host') ?? '').replace(/\/$/, '')
}
