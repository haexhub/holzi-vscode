import { describe, it, expect, vi } from 'vitest'
import { ToolRegistry, PermissionMode } from '../src/tools/index'

describe('ToolRegistry permission mode', () => {
  it('plan mode blocks write_file', async () => {
    const registry = new ToolRegistry()
    registry.setPermissionMode(PermissionMode.Plan)
    registry.register('write_file', async () => 'written')

    const result = await registry.execute('write_file', { path: 'x', content: 'y' })
    expect(result).toEqual({ error: 'plan_mode' })
  })

  it('plan mode allows read_file', async () => {
    const registry = new ToolRegistry()
    registry.setPermissionMode(PermissionMode.Plan)
    registry.register('read_file', async () => 'file content')

    const result = await registry.execute('read_file', { path: 'x' })
    expect(result).toEqual({ result: 'file content' })
  })

  it('plan mode allows list_dir', async () => {
    const registry = new ToolRegistry()
    registry.setPermissionMode(PermissionMode.Plan)
    registry.register('list_dir', async () => 'file1\nfile2')

    const result = await registry.execute('list_dir', { path: '.' })
    expect(result).toEqual({ result: 'file1\nfile2' })
  })

  it('plan mode blocks run_command', async () => {
    const registry = new ToolRegistry()
    registry.setPermissionMode(PermissionMode.Plan)
    registry.register('run_command', async () => 'output')

    const result = await registry.execute('run_command', { cmd: 'ls' })
    expect(result).toEqual({ error: 'plan_mode' })
  })

  it('auto mode executes write_file without asking', async () => {
    const registry = new ToolRegistry()
    registry.setPermissionMode(PermissionMode.Auto)
    const confirmFn = vi.fn().mockResolvedValue(true)
    registry.setConfirmFn(confirmFn)
    registry.register('write_file', async () => 'written')

    const result = await registry.execute('write_file', { path: 'x', content: 'y' })
    expect(result).toEqual({ result: 'written' })
    expect(confirmFn).not.toHaveBeenCalled()
  })

  it('auto mode executes run_command without asking', async () => {
    const registry = new ToolRegistry()
    registry.setPermissionMode(PermissionMode.Auto)
    const confirmFn = vi.fn().mockResolvedValue(true)
    registry.setConfirmFn(confirmFn)
    registry.register('run_command', async () => 'output')

    const result = await registry.execute('run_command', { cmd: 'ls' })
    expect(result).toEqual({ result: 'output' })
    expect(confirmFn).not.toHaveBeenCalled()
  })

  it('ask mode prompts for write_file and executes on allow', async () => {
    const registry = new ToolRegistry()
    registry.setPermissionMode(PermissionMode.Ask)
    registry.setConfirmFn(async () => true)
    registry.register('write_file', async () => 'written')

    const result = await registry.execute('write_file', { path: 'x', content: 'y' })
    expect(result).toEqual({ result: 'written' })
  })

  it('ask mode returns user_denied when user denies write_file', async () => {
    const registry = new ToolRegistry()
    registry.setPermissionMode(PermissionMode.Ask)
    registry.setConfirmFn(async () => false)
    registry.register('write_file', async () => 'written')

    const result = await registry.execute('write_file', { path: 'x', content: 'y' })
    expect(result).toEqual({ error: 'user_denied' })
  })

  it('ask mode does not prompt for read_file', async () => {
    const registry = new ToolRegistry()
    registry.setPermissionMode(PermissionMode.Ask)
    const confirmFn = vi.fn().mockResolvedValue(false)
    registry.setConfirmFn(confirmFn)
    registry.register('read_file', async () => 'content')

    const result = await registry.execute('read_file', { path: 'x' })
    expect(result).toEqual({ result: 'content' })
    expect(confirmFn).not.toHaveBeenCalled()
  })

  it('auto_edit mode executes write_file without asking', async () => {
    const registry = new ToolRegistry()
    registry.setPermissionMode(PermissionMode.AutoEdit)
    const confirmFn = vi.fn().mockResolvedValue(true)
    registry.setConfirmFn(confirmFn)
    registry.register('write_file', async () => 'written')

    const result = await registry.execute('write_file', { path: 'x', content: 'y' })
    expect(result).toEqual({ result: 'written' })
    expect(confirmFn).not.toHaveBeenCalled()
  })

  it('auto_edit mode prompts for run_command', async () => {
    const registry = new ToolRegistry()
    registry.setPermissionMode(PermissionMode.AutoEdit)
    registry.setConfirmFn(async () => false)
    registry.register('run_command', async () => 'output')

    const result = await registry.execute('run_command', { cmd: 'ls' })
    expect(result).toEqual({ error: 'user_denied' })
  })

  it('unknown tool returns error', async () => {
    const registry = new ToolRegistry()
    const result = await registry.execute('unknown_tool', {})
    expect(result).toEqual({ error: 'unknown_tool' })
  })

  it('tool error is caught and returned as error result', async () => {
    const registry = new ToolRegistry()
    registry.setPermissionMode(PermissionMode.Auto)
    registry.register('bad_tool', async () => { throw new Error('boom') })

    const result = await registry.execute('bad_tool', {})
    expect(result).toEqual({ error: 'boom' })
  })

  it('getPermissionMode returns current mode', () => {
    const registry = new ToolRegistry()
    registry.setPermissionMode(PermissionMode.AutoEdit)
    expect(registry.getPermissionMode()).toBe(PermissionMode.AutoEdit)
  })
})
