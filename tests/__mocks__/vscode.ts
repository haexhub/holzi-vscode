import { vi } from 'vitest'

export const Uri = {
  file: (path: string) => ({ fsPath: path, scheme: 'file', path }),
  joinPath: (base: any, ...parts: string[]) => ({
    fsPath: [base.fsPath, ...parts].join('/'),
    scheme: 'file',
    path: [base.path, ...parts].join('/'),
  }),
}

export const workspace = {
  workspaceFolders: [{ uri: { fsPath: '/workspace', path: '/workspace' } }],
  fs: {
    readFile: vi.fn(),
    writeFile: vi.fn(),
    readDirectory: vi.fn(),
  },
  applyEdit: vi.fn().mockResolvedValue(true),
  openTextDocument: vi.fn().mockResolvedValue({ getText: () => '' }),
  getConfiguration: vi.fn().mockReturnValue({
    get: vi.fn((key: string, def: any) => def),
  }),
}

export const window = {
  showInformationMessage: vi.fn(),
  showWarningMessage: vi.fn(),
  showErrorMessage: vi.fn(),
  createWebviewPanel: vi.fn(),
  activeTextEditor: undefined as any,
  showTextDocument: vi.fn().mockResolvedValue(undefined),
}

export class WorkspaceEdit {
  private edits: any[] = []
  replace(uri: any, range: any, newText: string) {
    this.edits.push({ uri, range, newText })
  }
  insert(uri: any, position: any, newText: string) {
    this.edits.push({ uri, position, newText })
  }
  createFile(uri: any, opts?: any) {
    this.edits.push({ createFile: uri, opts })
  }
  getEdits() { return this.edits }
}

export class Range {
  constructor(
    public start: Position,
    public end: Position,
  ) {}
}

export class Position {
  constructor(public line: number, public character: number) {}
}

export const ViewColumn = { One: 1, Two: 2, Beside: -2 }
