export enum PermissionMode {
  Plan = 'plan',
  Ask = 'ask',
  AutoEdit = 'auto_edit',
  Auto = 'auto',
}

const READ_ONLY_TOOLS = new Set(['read_file', 'list_dir', 'get_selection'])
const WRITE_TOOLS = new Set(['write_file', 'apply_diff'])
const RUN_TOOLS = new Set(['run_command'])

export type ToolResult = { result: string } | { error: string }

type ToolFn = (params: Record<string, unknown>) => Promise<string>

export type ConfirmFn = (
  toolName: string,
  params: Record<string, unknown>,
) => Promise<boolean>

export class ToolRegistry {
  private tools = new Map<string, ToolFn>()
  private mode: PermissionMode = PermissionMode.Ask
  private confirmFn: ConfirmFn = async () => true

  setPermissionMode(mode: PermissionMode): void {
    this.mode = mode
  }

  getPermissionMode(): PermissionMode {
    return this.mode
  }

  setConfirmFn(fn: ConfirmFn): void {
    this.confirmFn = fn
  }

  register(name: string, fn: ToolFn): void {
    this.tools.set(name, fn)
  }

  async execute(name: string, params: Record<string, unknown>): Promise<ToolResult> {
    const fn = this.tools.get(name)
    if (!fn) return { error: 'unknown_tool' }

    // Plan mode: only read-only tools
    if (this.mode === PermissionMode.Plan && !READ_ONLY_TOOLS.has(name)) {
      return { error: 'plan_mode' }
    }

    // Ask mode: write tools and run tools need confirmation
    if (this.mode === PermissionMode.Ask && (WRITE_TOOLS.has(name) || RUN_TOOLS.has(name))) {
      const allowed = await this.confirmFn(name, params)
      if (!allowed) return { error: 'user_denied' }
    }

    // AutoEdit mode: run tools still need confirmation
    if (this.mode === PermissionMode.AutoEdit && RUN_TOOLS.has(name)) {
      const allowed = await this.confirmFn(name, params)
      if (!allowed) return { error: 'user_denied' }
    }

    try {
      const result = await fn(params)
      return { result }
    } catch (err: unknown) {
      return { error: err instanceof Error ? err.message : String(err) }
    }
  }
}
